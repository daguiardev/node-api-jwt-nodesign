# Etapa 3 — Banco de dados com SQLite

## 1. Objetivo da etapa

Nesta etapa, vamos integrar o banco de dados SQLite à nossa API REST desenvolvida com Node.js, TypeScript e Express.

Seguiremos as orientações do `AGENTS.md`, priorizando uma implementação simples, incremental e didática, adequada aos estudantes iniciantes da disciplina de Programação para Internet.

Ao concluir esta etapa, teremos:

1. O SQLite configurado no projeto.
2. Um arquivo responsável pela conexão com o banco de dados.
3. Um script para criar a tabela `users`.
4. Uma tabela com os campos e restrições definidos no `AGENTS.md`.
5. Exemplos de comandos SQL básicos.
6. Exemplos de consultas SQL parametrizadas.
7. Um procedimento para verificar se o banco foi criado corretamente.

**Limite desta etapa:** ainda não implementaremos cadastro de usuários, autenticação, bcrypt, JWT ou endpoints de CRUD. Essas funcionalidades pertencem às próximas etapas.

## 2. Organização dos arquivos

Considerando que as etapas 1 e 2 já foram concluídas, utilizaremos a estrutura prevista no `AGENTS.md`.

```text
projeto/
├── src/
│   ├── controllers/
│   ├── database/
│   │   ├── database.ts       ← Criar
│   │   └── init.ts           ← Criar
│   ├── routes/
│   ├── app.ts
│   └── server.ts
├── data/
│   └── database.sqlite      ← Gerado automaticamente
├── .env                     ← Verificar/editar
├── .env.example             ← Verificar
├── .gitignore               ← Verificar
├── package.json             ← Atualizado pelo npm
└── tsconfig.json
```

| Arquivo | Responsabilidade |
|---|---|
| `src/database/database.ts` | Abrir e disponibilizar a conexão SQLite |
| `src/database/init.ts` | Criar a estrutura inicial do banco |
| `.env` | Definir o caminho do banco |
| `package.json` | Disponibilizar o comando de inicialização |
| `.gitignore` | Impedir o versionamento do banco |

O arquivo `database.sqlite` será gerado automaticamente. Não será necessário criá-lo manualmente.

---

## 3. Passo 1 — Instalar o SQLite

### 3.1. Entendendo o SQLite

O SQLite é um sistema gerenciador de banco de dados relacional que armazena os dados em um arquivo local.

Diferentemente de sistemas como MySQL e PostgreSQL, ele não exige a instalação e configuração de um servidor de banco de dados separado.

Isso o torna interessante para projetos didáticos.

Neste projeto, utilizaremos o módulo nativo `node:sqlite`, disponível em versões recentes do Node.js, evitando a instalação de uma biblioteca adicional. Para esta abordagem, utilizaremos **Node.js 22.13 ou superior**, preferencialmente uma versão LTS atual.

### 3.2. Verificar a versão do Node.js

**Local:** terminal, na raiz do projeto.

Execute:

```bash
node --version
```

Se sua versão for inferior à necessária, atualize o Node.js antes de continuar.

Depois, verifique se o módulo está disponível:

```bash
node -e "const { DatabaseSync } = require('node:sqlite'); console.log('SQLite disponível')"
```

Resultado esperado:

```text
SQLite disponível
```

**Importante:** não precisamos executar `npm install sqlite3` ou `npm install better-sqlite3`, pois utilizaremos a funcionalidade nativa do Node.js.

---

## 4. Passo 2 — Configurar o caminho do banco

### Arquivo: `.env`

**Ação:** editar o arquivo existente.

Localize a configuração `DATABASE_PATH`. Caso ainda não exista, adicione:

```env
# Caminho do arquivo que armazenará os dados da aplicação.
DATABASE_PATH=./data/database.sqlite
```

Não remova as configurações já existentes, como `PORT`, `JWT_SECRET` e `CORS_ORIGIN`.

### Arquivo: `.env.example`

**Ação:** verificar e adicionar a mesma variável, caso esteja ausente.

```env
# Caminho ilustrativo do banco de dados SQLite.
DATABASE_PATH=./data/database.sqlite
```

O `.env.example` serve como modelo de configuração para outros desenvolvedores. Ele pode ser versionado, diferentemente do `.env`.

---

## 5. Passo 3 — Criar a conexão com o banco de dados

### Arquivo: `src/database/database.ts`

**Ação:** criar o arquivo, caso ainda não exista.

Esse arquivo será responsável por abrir o banco de dados SQLite e disponibilizar a conexão para os demais módulos da aplicação.

Antes, crie o diretório `src/database`, caso ele ainda não exista.

**Código completo de `src/database/database.ts`:**

```typescript
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

// Obtém o caminho do banco definido no arquivo .env.
// Caso a variável não exista, utiliza o caminho padrão.
const databasePath: string =
  process.env.DATABASE_PATH || "./data/database.sqlite";

// Converte o caminho relativo em um caminho absoluto.
const absolutePath: string = path.resolve(databasePath);

// Identifica o diretório onde o banco será armazenado.
const databaseDirectory: string = path.dirname(absolutePath);

// Cria o diretório data, caso ainda não exista.
// recursive: true evita erros quando o diretório já existe.
fs.mkdirSync(databaseDirectory, { recursive: true });

// Abre a conexão com o SQLite.
// Se o arquivo não existir, ele será criado automaticamente.
const db = new DatabaseSync(absolutePath);

// Disponibiliza a conexão para outros arquivos do projeto.
export default db;
```

### 5.1. Entendendo o código

**Importação do SQLite**

```typescript
import { DatabaseSync } from "node:sqlite";
```

Importamos a classe `DatabaseSync`, que permite executar operações SQLite diretamente no Node.js.

Utilizaremos sua API síncrona por ser simples para fins didáticos. Em aplicações com alta concorrência, operações síncronas podem bloquear a execução de outras tarefas.

**Leitura das variáveis de ambiente**

```typescript
import "dotenv/config";
```

Essa instrução carrega as variáveis definidas no `.env` para `process.env`.

**Criação do diretório**

```typescript
fs.mkdirSync(databaseDirectory, { recursive: true });
```

Garante que o diretório onde o banco será armazenado exista antes de abrir a conexão.

**Abertura da conexão**

```typescript
const db = new DatabaseSync(absolutePath);
```

Abre o arquivo SQLite. Se ele não existir, será criado.

**Exportação da conexão**

```typescript
export default db;
```

Permite reutilizar a mesma conexão em outros arquivos:

```typescript
import db from "./database";
```

Assim, não precisaremos abrir uma nova conexão toda vez que quisermos executar uma consulta.

---

## 6. Passo 4 — Criar a tabela de usuários

Agora que temos a conexão, precisamos criar a estrutura que armazenará os usuários.

### 6.1. Estrutura da tabela `users`

O `AGENTS.md` estabelece os seguintes campos:

| Campo | Tipo SQLite | Regra |
|---|---|---|
| `id` | INTEGER | Chave primária, gerada automaticamente |
| `name` | TEXT | Obrigatório |
| `email` | TEXT | Obrigatório e único |
| `password_hash` | TEXT | Obrigatório |
| `role` | TEXT | `user` ou `admin` |
| `created_at` | TEXT | Data de criação |
| `updated_at` | TEXT | Data da última atualização |

Observe que não teremos um papel `visitante` armazenado na tabela. No projeto, o visitante representa uma pessoa que ainda não está autenticada.

### Arquivo: `src/database/init.ts`

**Ação:** criar o arquivo.

**Código completo de `src/database/init.ts`:**

```typescript
import db from "./database";

// SQL responsável por criar a tabela de usuários.
// IF NOT EXISTS impede erro caso a tabela já exista.
const createUsersTable: string = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    email TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'user'
      CHECK (role IN ('user', 'admin')),

    created_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL
      DEFAULT CURRENT_TIMESTAMP
  );
`;

// Executa o comando SQL no banco de dados.
db.exec(createUsersTable);

// Informa que a inicialização terminou.
console.log("Banco de dados inicializado com sucesso!");
```

### 6.2. Entendendo as instruções SQL

**CREATE TABLE**

```sql
CREATE TABLE IF NOT EXISTS users
```

Cria a tabela `users`, caso ela ainda não exista. Isso permite executar o script de inicialização várias vezes sem tentar recriar a mesma tabela.

**PRIMARY KEY AUTOINCREMENT**

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
```

Define `id` como identificador único e determina que seu valor será gerado automaticamente.

**NOT NULL**

```sql
name TEXT NOT NULL
```

Determina que o campo não pode receber `NULL`, ou seja, a ausência de valor.

**UNIQUE**

```sql
email TEXT NOT NULL UNIQUE
```

Impede que dois registros tenham exatamente o mesmo valor de e-mail. A normalização dos e-mails será tratada posteriormente no cadastro.

**DEFAULT**

```sql
role TEXT NOT NULL DEFAULT 'user'
```

Estabelece `user` como valor padrão para o campo `role`.

**CHECK**

```sql
CHECK (role IN ('user', 'admin'))
```

Impede que a tabela aceite outros valores no campo `role`.

**CURRENT_TIMESTAMP**

```sql
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
```

Preenche automaticamente a data e a hora de criação do registro, no formato UTC utilizado pelo SQLite.

O campo `updated_at` também recebe a data e a hora iniciais. Nas futuras operações de atualização, será necessário modificar seu valor explicitamente.

---

## 7. Passo 5 — Criar o comando de inicialização

### Arquivo: `package.json`

**Ação:** editar apenas a seção `scripts`.

O projeto já deve possuir comandos para executar o servidor, configurados nas etapas anteriores.

Vamos adicionar um novo comando chamado `db:init`.

Se estiver utilizando `tsx`, a seção poderá ficar assim:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "db:init": "tsx src/database/init.ts"
  }
}
```

**Atenção:** esse é um exemplo da seção `scripts`, não um substituto para o arquivo `package.json` inteiro. Preserve os comandos existentes e adicione somente a propriedade `db:init`.

O comando `tsx` precisa estar instalado no projeto. Caso tenha sido utilizado nas etapas anteriores, nenhuma instalação adicional será necessária.

Se ainda não estiver instalado, execute:

```bash
npm install --save-dev tsx
```

### 7.1. Executar a inicialização

No terminal, na raiz do projeto:

```bash
npm run db:init
```

Resultado esperado:

```text
Banco de dados inicializado com sucesso!
```

Após a execução, o arquivo será criado:

```text
data/
└── database.sqlite
```

Esse arquivo contém a estrutura da tabela `users` e armazenará os dados futuramente.

### 7.2. O que acontece se executar novamente?

Execute:

```bash
npm run db:init
```

A mensagem de sucesso deverá aparecer novamente.

A tabela existente será preservada porque utilizamos:

```sql
CREATE TABLE IF NOT EXISTS users
```

Isso significa que o comando não apagará os registros existentes.

Entretanto, ele também não modifica automaticamente a estrutura de uma tabela já criada. Alterações futuras de esquema precisarão ser tratadas separadamente.

---

## 8. Passo 6 — Evitar o versionamento do banco

### Arquivo: `.gitignore`

**Ação:** editar o arquivo existente.

Verifique se ele já contém regras para ignorar o banco de dados e o arquivo `.env`.

Caso não contenha, adicione:

```gitignore
# Dependências instaladas pelo npm
node_modules/

# Arquivos compilados
dist/

# Variáveis de ambiente
.env

# Banco de dados local SQLite
data/*.sqlite

# Arquivos auxiliares do SQLite
data/*.sqlite-journal
data/*.sqlite-wal
data/*.sqlite-shm
```

Não é necessário duplicar regras que já estejam presentes.

### Por que não versionar o banco?

O arquivo `database.sqlite` pode conter informações dos usuários, inclusive hashes de senhas.

Além disso, cada estudante deverá conseguir criar seu próprio banco localmente.

O código responsável pela criação das tabelas será versionado, mas os dados locais não.

---

## 9. Passo 7 — Compreender os comandos SQL básicos

Antes de implementar o cadastro de usuários, precisamos compreender como os dados serão manipulados.

A linguagem SQL (*Structured Query Language*) permite criar, consultar, atualizar e excluir registros em bancos de dados relacionais.

As quatro operações mais comuns são conhecidas como CRUD.

| Operação | SQL | Finalidade |
|---|---|---|
| Create | `INSERT` | Inserir registros |
| Read | `SELECT` | Consultar registros |
| Update | `UPDATE` | Atualizar registros |
| Delete | `DELETE` | Excluir registros |

### 9.1. INSERT — Inserção

Exemplo ilustrativo:

```sql
-- Insere um usuário na tabela.
-- O id e as datas serão gerados automaticamente.
INSERT INTO users (name, email, password_hash, role)
VALUES ('Maria Silva', 'maria@email.com', 'HASH_DA_SENHA', 'user');
```

O valor `HASH_DA_SENHA` é apenas ilustrativo. Na Etapa 4, utilizaremos bcrypt para gerar um hash verdadeiro antes de inserir qualquer usuário.

### 9.2. SELECT — Consulta

```sql
-- Consulta o identificador, nome e e-mail de todos os usuários.
SELECT id, name, email
FROM users;
```

Podemos utilizar `WHERE` para filtrar resultados:

```sql
-- Consulta o usuário cujo identificador é 1.
SELECT id, name, email
FROM users
WHERE id = 1;
```

### 9.3. UPDATE — Atualização

```sql
-- Altera o nome do usuário com identificador 1.
-- Atualiza também a data da última modificação.
UPDATE users
SET name = 'Maria Oliveira',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
```

O `WHERE` é especialmente importante: sem ele, o comando poderia atualizar todos os usuários da tabela.

### 9.4. DELETE — Exclusão

```sql
-- Exclui o usuário cujo identificador é 1.
DELETE FROM users
WHERE id = 1;
```

Novamente, o `WHERE` impede que a operação afete todos os registros.

Esses comandos são apresentados para compreensão. Não precisamos executá-los agora.

---

## 10. Passo 8 — Compreender consultas parametrizadas

O `AGENTS.md` determina que as consultas SQL deverão utilizar parâmetros para evitar SQL Injection.

### 10.1. O problema da concatenação

Considere o exemplo:

```typescript
// NÃO UTILIZAR: exemplo de consulta insegura.
const email: string = "maria@email.com";

const sql: string =
  `SELECT * FROM users WHERE email = '${email}'`;
```

Nesse caso, o valor da variável `email` é inserido diretamente na instrução SQL.

Se esse valor for fornecido por um usuário mal-intencionado, ele poderá modificar o comportamento da consulta.

### 10.2. A solução: consultas parametrizadas

Com SQLite, podemos preparar uma consulta utilizando `prepare()` e fornecer os valores separadamente.

```typescript
// Prepara uma consulta SQL.
// O símbolo ? representa um parâmetro.
const statement = db.prepare(
  "SELECT id, name, email FROM users WHERE email = ?"
);

// Executa a consulta substituindo ? pelo valor informado.
const user = statement.get("maria@email.com");
```

O SQLite trata o valor informado como dado, e não como parte do código SQL.

### 10.3. Principais métodos

| Método | Utilização |
|---|---|
| `db.exec(sql)` | Executar instruções SQL sem parâmetros |
| `db.prepare(sql)` | Preparar uma consulta parametrizada |
| `statement.run(...)` | Executar INSERT, UPDATE ou DELETE |
| `statement.get(...)` | Obter o primeiro registro encontrado |
| `statement.all(...)` | Obter todos os registros encontrados |

Por exemplo, uma inserção parametrizada poderá ser realizada assim:

```typescript
// Prepara o comando para inserir um usuário.
const statement = db.prepare(`
  INSERT INTO users (name, email, password_hash)
  VALUES (?, ?, ?)
`);

// Executa a inserção utilizando valores separados do SQL.
// O terceiro argumento deve ser um hash real gerado pelo bcrypt.
statement.run(
  "Maria Silva",
  "maria@email.com",
  hashGeradoPeloBcrypt
);
```

Esse exemplo pressupõe que `hashGeradoPeloBcrypt` já tenha sido definido. Sua geração será implementada na Etapa 4.

**Regra importante:** sempre que uma consulta receber valores variáveis, especialmente dados provenientes de requisições HTTP, devemos utilizar parâmetros.

---

## 11. Passo 9 — Verificar a criação da tabela

Vamos adicionar uma verificação simples ao script de inicialização.

### Arquivo: `src/database/init.ts`

**Ação:** adicionar o código abaixo ao final do arquivo, após a mensagem de inicialização.

Não remova o código de criação da tabela.

```typescript
// Consulta a estrutura das colunas da tabela users.
// PRAGMA table_info retorna informações como nome e tipo.
const columns = db.prepare("PRAGMA table_info(users)").all();

// Exibe as informações no terminal em formato de tabela.
console.table(columns);
```

### 11.1. Executar a verificação

No terminal:

```bash
npm run db:init
```

O resultado deverá apresentar uma tabela contendo os campos:

```text
id
name
email
password_hash
role
created_at
updated_at
```

O SQLite também apresentará informações sobre o tipo de cada coluna, se aceita `NULL` e se faz parte da chave primária.

### 11.2. Verificar a quantidade de usuários

Ainda no arquivo `src/database/init.ts`, adicione ao final:

```typescript
// Consulta a quantidade de registros da tabela users.
const result = db.prepare(
  "SELECT COUNT(*) AS total FROM users"
).get() as { total: number };

// Exibe a quantidade de usuários cadastrados.
console.log("Total de usuários:", result.total);
```

Execute novamente:

```bash
npm run db:init
```

Como ainda não implementamos o cadastro, o resultado esperado em um banco novo será:

```text
Banco de dados inicializado com sucesso!

Total de usuários: 0
```

Entre essas mensagens também aparecerá a tabela de informações das colunas.

---

## 12. Passo 10 — Verificar o TypeScript

Precisamos garantir que o código esteja compatível com as configurações do projeto.

### Arquivo: `tsconfig.json`

**Ação:** verificar as configurações existentes, sem substituir o arquivo.

Como utilizamos `node:sqlite`, precisamos que o projeto tenha definições de tipos do Node.js compatíveis com esse módulo.

No terminal, execute:

```bash
npm ls @types/node
```

Se a dependência estiver ausente ou for muito antiga, instale uma versão compatível com a versão do Node.js utilizada:

```bash
npm install --save-dev @types/node@22
```

Esse exemplo considera Node.js 22. Para outra versão principal, utilize as definições correspondentes.

Em seguida, execute:

```bash
npx tsc --noEmit
```

Esse comando verifica os tipos TypeScript sem gerar arquivos JavaScript.

Se não forem apresentados erros, a verificação foi concluída com sucesso.

Caso apareçam erros de importação ou de configuração de módulos, será necessário examinar o `tsconfig.json` existente antes de alterá-lo, preservando as decisões tomadas nas etapas anteriores.

---

## 13. Checklist de conclusão

- [ ] O Node.js possui suporte ao módulo `node:sqlite`.
- [ ] O arquivo `.env` possui `DATABASE_PATH`.
- [ ] O arquivo `src/database/database.ts` foi criado.
- [ ] O arquivo `src/database/init.ts` foi criado.
- [ ] O script `db:init` foi adicionado ao `package.json`.
- [ ] O arquivo `data/database.sqlite` foi gerado.
- [ ] A tabela `users` possui os sete campos definidos.
- [ ] O `.gitignore` impede o versionamento do banco.
- [ ] O comando `npm run db:init` funciona.
- [ ] O comando `npx tsc --noEmit` não apresenta erros.

---

## 14. Resultado esperado

Ao final da Etapa 3, nossa aplicação terá a seguinte organização:

```text
src/
├── controllers/
├── database/
│   ├── database.ts
│   └── init.ts
├── routes/
├── app.ts
└── server.ts

data/
└── database.sqlite
```

O fluxo implementado até agora é:

```text
npm run db:init
       │
       ▼
src/database/init.ts
       │
       │ Define e executa o SQL de criação da tabela
       ▼
src/database/database.ts
       │
       │ Abre a conexão com SQLite
       ▼
data/database.sqlite
       │
       └── Armazena a tabela users
```

A API HTTP desenvolvida nas etapas anteriores deverá continuar funcionando normalmente. O banco já está preparado, mas ainda não está integrado aos endpoints de cadastro e consulta.

---

## 15. Próxima etapa — Cadastro de usuários

Na **Etapa 4 — Cadastro**, utilizaremos a conexão criada nesta etapa para implementar o endpoint `POST /api/auth/register`.

Essa implementação envolverá receber os dados JSON, validar nome, e-mail e senha, verificar e-mails duplicados, gerar o hash com bcrypt e inserir o usuário no SQLite por meio de uma consulta parametrizada.

A partir dessa etapa, os estudantes começarão a observar o funcionamento completo da comunicação entre uma requisição HTTP, um controller e o banco de dados.

**Observação didática:** a opção pelo módulo nativo `node:sqlite` é uma decisão de implementação para simplificar o projeto. O `AGENTS.md` determina o uso de SQLite, mas não exige uma biblioteca específica. Manteremos essa escolha nas próximas etapas, salvo se houver necessidade de alterá-la.
