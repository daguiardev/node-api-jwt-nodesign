# Etapa 4 — Cadastro de usuários

**Projeto:** API REST com Node.js, TypeScript, Express, SQLite e JWT  
**Objetivo:** implementar o cadastro público de usuários, incluindo validação dos dados recebidos, verificação de e-mail duplicado, proteção da senha com bcrypt e armazenamento no SQLite.

Este tutorial segue as orientações do `AGENTS.md`: simplicidade arquitetural, desenvolvimento incremental, funções e consultas SQL parametrizadas. **Não implementaremos login, JWT ou middlewares de autenticação nesta etapa.**

## 1. O que construiremos

Ao final da Etapa 4, a API receberá:

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "12345678"
}
```

Fluxo do cadastro:

1. Cliente envia `POST /api/auth/register`.
2. `authRoutes.ts` encaminha a requisição ao controller.
3. `authController.ts` valida os dados e verifica o e-mail.
4. O controller gera o hash da senha com bcrypt.
5. O SQLite armazena o usuário com papel `user`.
6. A API retorna `201 Created` com dados públicos, sem senha ou hash.

## 2. Arquivos que utilizaremos

| Arquivo | Operação |
|---|---|
| `package.json` | Verificar dependências |
| `src/database/database.ts` | Conferir a conexão existente |
| `src/database/init.ts` | Conferir a tabela `users` |
| `src/controllers/authController.ts` | Adicionar a função de cadastro |
| `src/routes/authRoutes.ts` | Adicionar a rota POST |
| `src/app.ts` | Registrar as rotas de autenticação |

**Pré-requisito:** as Etapas 1, 2 e 3 devem estar concluídas, com o servidor Express funcionando e o banco SQLite inicializado.

Como os arquivos de implementação das etapas anteriores não foram fornecidos, os exemplos adotam uma convenção simples para a conexão SQLite. Preserve código que já funciona e adapte as chamadas à biblioteca efetivamente utilizada.

## 3. Passo 1 — Instalar o bcrypt

O bcrypt transforma senhas em hashes criptográficos adequados ao armazenamento. Um *hash* é uma representação calculada a partir da senha, que não deve permitir recuperar a senha original de maneira prática.

### 3.1. Verificar as dependências

**Arquivo:** `package.json`  
**Operação:** verificar se as dependências já estão instaladas.

No terminal:

```bash
npm list bcrypt
npm list @types/bcrypt
```

Se não estiverem instaladas:

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

O primeiro comando instala a biblioteca; o segundo instala as definições de tipos para TypeScript. Não é necessário editar manualmente o `package.json`: o npm fará isso.

### 3.2. Entendendo o bcrypt

```ts
import bcrypt from "bcrypt";

// Senha informada pelo usuário.
const password = "12345678";

// Define o custo computacional do algoritmo.
// O valor 10 é adequado para o exercício didático inicial.
const saltRounds = 10;

// Gera um hash seguro para armazenamento.
const passwordHash = await bcrypt.hash(password, saltRounds);
```

O bcrypt utiliza um salt aleatório e um fator de custo. Por isso, duas execuções com a mesma senha normalmente produzem hashes diferentes. Na aplicação, armazenaremos somente `passwordHash`, nunca `password`.

## 4. Passo 2 — Conferir a conexão com o banco de dados

**Arquivo:** `src/database/database.ts`  
**Operação:** verificar o código existente. Não substituir a conexão se ela já funciona.

Precisamos que o controller consiga utilizar a conexão SQLite implementada na Etapa 3. Neste tutorial, adotaremos a seguinte convenção:

```ts
import { db } from "../database/database";
```

Isso pressupõe que `database.ts` exporte uma conexão chamada `db`. Por exemplo, se a Etapa 3 utilizou o pacote `sqlite3` com uma conexão direta, a exportação poderia ser:

```ts
// Disponibiliza a conexão SQLite para outros arquivos.
export const db = database;
```

Esse exemplo é ilustrativo: `database` precisa corresponder à variável de conexão realmente existente.

**Importante:** os exemplos de controller abaixo utilizam a API síncrona de `better-sqlite3`, com os métodos `prepare()`, `get()` e `run()`. Caso a Etapa 3 tenha utilizado `sqlite3` ou outra biblioteca, adapte essas chamadas à API já instalada, sem trocar a biblioteca apenas para implementar o cadastro.

## 5. Passo 3 — Conferir a tabela de usuários

**Arquivo:** `src/database/init.ts`  
**Operação:** verificar a estrutura da tabela `users` criada na Etapa 3.

A tabela precisa contemplar os campos definidos no `AGENTS.md`. Uma definição compatível com SQLite seria:

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- `id`: identificador gerado automaticamente.
- `email`: utiliza `UNIQUE` para impedir duplicidade.
- `password_hash`: armazena o hash da senha.
- `role`: aceita somente `user` ou `admin`.
- `created_at` e `updated_at`: registram datas de criação e atualização.

Se a tabela já possui essa estrutura, **não altere o arquivo**. Se houver diferenças, confira o esquema real antes de modificá-lo. `CREATE TABLE IF NOT EXISTS` não modifica tabelas que já existem.

## 6. Passo 4 — Implementar o controller de cadastro

**Arquivo:** `src/controllers/authController.ts`  
**Operação:** adicionar uma função chamada `register`.

Se o arquivo já existir, preserve seu conteúdo e acrescente a função. Se estiver vazio, utilize o código completo abaixo.

### 6.1. Código

Este exemplo considera que `db` é uma conexão `better-sqlite3`, conforme a convenção explicada no Passo 2.

```ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { db } from "../database/database";

// Custo utilizado pelo bcrypt para gerar o hash.
const SALT_ROUNDS = 10;

/**
 * Realiza o cadastro público de um usuário.
 *
 * Recebe nome, e-mail e senha.
 * Valida os dados e salva o usuário no SQLite.
 */
export async function register(
  req: Request,
  res: Response
): Promise<void> {

  // 1. Obtém os dados enviados no corpo da requisição.
  const { name, email, password } = req.body ?? {};

  // 2. Verifica se os dados obrigatórios são válidos.
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({
      message: "Nome, e-mail e senha são obrigatórios."
    });
    return;
  }

  // 3. Remove espaços desnecessários.
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // 4. Valida o formato básico do e-mail.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    res.status(400).json({
      message: "Formato de e-mail inválido."
    });
    return;
  }

  // 5. Verifica o tamanho mínimo da senha.
  if (password.length < 8) {
    res.status(400).json({
      message: "A senha deve ter pelo menos 8 caracteres."
    });
    return;
  }

  try {

    // 6. Consulta se o e-mail já existe no banco.
    // O parâmetro ? evita concatenar dados diretamente no SQL.
    const existingUser = db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(normalizedEmail);

    if (existingUser) {
      res.status(409).json({
        message: "E-mail já cadastrado."
      });
      return;
    }

    // 7. Transforma a senha em um hash usando bcrypt.
    const passwordHash = await bcrypt.hash(
      password,
      SALT_ROUNDS
    );

    // 8. Insere o usuário no banco de dados.
    // O papel é definido pelo backend, nunca pelo cliente.
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(
      normalizedName,
      normalizedEmail,
      passwordHash,
      "user"
    );

    // 9. Retorna os dados públicos do usuário criado.
    // A senha e o hash não são incluídos na resposta.
    res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user: {
        id: Number(result.lastInsertRowid),
        name: normalizedName,
        email: normalizedEmail,
        role: "user"
      }
    });

  } catch (error) {

    // 10. Trata a possibilidade de um cadastro concorrente
    // ter utilizado o mesmo e-mail.
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      res.status(409).json({
        message: "E-mail já cadastrado."
      });
      return;
    }

    // Não enviamos detalhes internos do erro ao cliente.
    res.status(500).json({
      message: "Erro interno ao cadastrar usuário."
    });
  }
}
```

### 6.2. Explicação das partes principais

**Recebendo dados com `req.body`:**

```ts
const { name, email, password } = req.body ?? {};
```

O Express disponibiliza os dados JSON recebidos por meio de `req.body`, desde que o middleware `express.json()` esteja configurado.

**Validando os dados:** o código verifica se os campos são strings e se possuem conteúdo. Depois, valida um formato básico de e-mail e exige senha com pelo menos oito caracteres. A expressão regular é intencionalmente simples e não garante que o endereço exista.

**Verificando e-mail duplicado:**

```ts
const existingUser = db.prepare(
  "SELECT id FROM users WHERE email = ?"
).get(normalizedEmail);
```

O símbolo `?` representa um parâmetro SQL. O valor do e-mail é enviado separadamente, reduzindo o risco de SQL Injection. A restrição `UNIQUE` da tabela continua sendo a garantia definitiva contra e-mails duplicados, inclusive em cadastros simultâneos.

**Gerando o hash:**

```ts
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
```

O `await` aguarda a operação assíncrona do bcrypt terminar antes de executar o cadastro.

**Definindo o papel do usuário:**

```ts
"user"
```

O papel é atribuído diretamente pelo backend. Mesmo que alguém envie `"role": "admin"` no JSON, esse campo será ignorado.

## 7. Passo 5 — Criar a rota de cadastro

**Arquivo:** `src/routes/authRoutes.ts`  
**Operação:** adicionar a rota `POST /register`.

Se o arquivo estiver vazio, utilize:

```ts
import { Router } from "express";

// Importa a função responsável pelo cadastro.
import { register } from "../controllers/authController";

// Cria um agrupamento de rotas do Express.
const router = Router();

// Associa o método POST à função register.
router.post("/register", register);

// Exporta as rotas para utilização no app.ts.
export default router;
```

Se o arquivo já possui outras rotas, mantenha-as e adicione somente os imports e a chamada `router.post()` necessários. A rota `/register` será combinada com o prefixo `/api/auth` no arquivo `app.ts`.

## 8. Passo 6 — Registrar as rotas no Express

**Arquivo:** `src/app.ts`  
**Operação:** conferir o middleware JSON e adicionar o registro das rotas de autenticação.

O arquivo deverá conter estas instruções, entre as demais configurações existentes:

```ts
import express from "express";
import authRoutes from "./routes/authRoutes";

const app = express();

// Permite que o Express interprete requisições JSON.
app.use(express.json());

// Registra as rotas de autenticação.
// Exemplo: POST /api/auth/register
app.use("/api/auth", authRoutes);

export default app;
```

**Atenção:** esse trecho representa a configuração mínima. Não substitua o arquivo inteiro se ele já contém CORS, outras rotas ou middlewares da Etapa 2. Não registre `express.json()` ou `authRoutes` duas vezes.

## 9. Passo 7 — Executar a aplicação

**Arquivo:** `package.json`  
**Operação:** conferir o script de desenvolvimento já configurado.

Se a Etapa 1 definiu o script `dev`, execute:

```bash
npm run dev
```

A aplicação deverá iniciar utilizando a porta definida no `.env`, por exemplo:

```text
Servidor executando na porta 3000
```

Se ocorrer erro de compilação relacionado à importação do SQLite, confira a exportação existente em `database.ts` e a biblioteca utilizada na Etapa 3.

## 10. Passo 8 — Testar o cadastro

Utilize Postman, Insomnia ou Thunder Client.

### Teste 1 — Cadastro válido

**Método:** `POST`  
**URL:** `http://localhost:3000/api/auth/register`  
**Body:** JSON

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "12345678"
}
```

**Resposta esperada:** `201 Created`

```json
{
  "message": "Usuário cadastrado com sucesso.",
  "user": {
    "id": 1,
    "name": "Maria Silva",
    "email": "maria@email.com",
    "role": "user"
  }
}
```

O identificador retornado dependerá dos registros existentes no banco.

### Teste 2 — E-mail duplicado

Envie novamente o mesmo JSON do teste anterior.

**Resposta esperada:** `409 Conflict`

```json
{
  "message": "E-mail já cadastrado."
}
```

### Teste 3 — E-mail inválido

```json
{
  "name": "Maria Silva",
  "email": "maria-email",
  "password": "12345678"
}
```

**Resposta esperada:** `400 Bad Request`

```json
{
  "message": "Formato de e-mail inválido."
}
```

### Teste 4 — Senha curta

```json
{
  "name": "Maria Silva",
  "email": "outra@email.com",
  "password": "123"
}
```

**Resposta esperada:** `400 Bad Request`

```json
{
  "message": "A senha deve ter pelo menos 8 caracteres."
}
```

### Teste 5 — Tentativa de criar administrador

```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "12345678",
  "role": "admin"
}
```

O cadastro deverá ser realizado com papel `user`, independentemente do valor enviado no campo `role`. Essa verificação impede que um visitante atribua privilégios administrativos à própria conta.

## 11. Passo 9 — Verificar os registros no SQLite

**Arquivo:** `data/database.sqlite`  
**Operação:** consultar os dados cadastrados, sem alterar manualmente o arquivo.

Utilize um cliente SQLite, como o DB Browser for SQLite, e execute:

```sql
-- Consulta os usuários cadastrados.
-- O hash aparece apenas para inspeção local do banco.
SELECT
    id,
    name,
    email,
    password_hash,
    role,
    created_at
FROM users;
```

Confira se a senha foi armazenada como hash bcrypt, geralmente começando com um prefixo como `$2b$`.

Depois, execute:

```sql
-- Consulta somente os dados públicos.
SELECT id, name, email, role
FROM users;
```

A segunda consulta demonstra quais campos podem ser utilizados nas respostas da API. Não utilize a primeira consulta para retornar informações ao cliente.

## 12. Checklist de conclusão da Etapa 4

- [ ] O bcrypt está instalado e funcionando.
- [ ] A conexão SQLite está acessível ao controller.
- [ ] A tabela `users` contém os campos necessários.
- [ ] O endpoint `POST /api/auth/register` responde corretamente.
- [ ] Os campos obrigatórios são validados.
- [ ] O formato básico do e-mail é validado.
- [ ] Senhas com menos de oito caracteres são rejeitadas.
- [ ] E-mails duplicados retornam HTTP 409.
- [ ] A senha é armazenada como hash bcrypt.
- [ ] O papel dos novos usuários é sempre `user`.
- [ ] A resposta HTTP 201 não contém senha nem hash.
- [ ] O projeto continua executando normalmente.

## 13. O que aprendemos nesta etapa

A implementação do cadastro permite trabalhar conceitos importantes de programação backend:

- **HTTP e REST:** criação de recursos com `POST` e retorno de `201 Created`.
- **Express:** recebimento de requisições, utilização de controllers e respostas JSON.
- **TypeScript:** funções assíncronas e tipagem básica de requisições e respostas.
- **SQL:** consultas `SELECT` e `INSERT` com parâmetros.
- **Segurança:** validação de entradas, proteção contra SQL Injection, hash de senhas e controle do papel atribuído no cadastro.

### Próxima etapa

Na **Etapa 5 — Login**, utilizaremos os usuários cadastrados para implementar a autenticação. O bcrypt será utilizado para comparar a senha informada com o hash armazenado, e o JWT permitirá emitir um token para o usuário autenticado.

**Observação de compatibilidade:** para considerar esta implementação concluída no seu repositório, precisamos garantir que o código de acesso ao SQLite corresponde à biblioteca efetivamente configurada na Etapa 3. Todo o restante do fluxo foi estruturado para preservar a arquitetura simples prevista no `AGENTS.md`.
