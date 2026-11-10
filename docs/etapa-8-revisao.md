# Etapa 8 — Revisão, testes e documentação da API

Nesta etapa, vamos revisar e consolidar a API REST desenvolvida nas etapas anteriores, verificando se as funcionalidades estão corretas, se as regras de segurança estão sendo respeitadas e se os endpoints estão devidamente documentados.

O roteiro segue o `AGENTS.md`: simplicidade arquitetural, TypeScript, Express, SQLite, bcrypt e JWT, testes manuais e preservação do código já implementado.

> **Importante:** esta etapa não consiste em reescrever o projeto. Identifique problemas, realize correções pontuais, teste os endpoints manualmente e documente seu funcionamento. Os trechos são exemplos de referência, não substituições integrais: adapte nomes de funções, variáveis e métodos de acesso ao banco ao código existente.

## 1. Objetivos da etapa

Ao concluir esta etapa, os alunos deverão ser capazes de:

1. Revisar validações de dados recebidos pela API.
2. Identificar e corrigir respostas HTTP inadequadas.
3. Verificar regras de autenticação e autorização.
4. Testar todos os endpoints utilizando uma ferramenta de requisições HTTP.
5. Identificar possíveis falhas de segurança.
6. Documentar a API no `README.md`.
7. Confirmar que o projeto continua executável.

## 2. Arquivos envolvidos

| Arquivo | Atividade |
|---|---|
| `src/controllers/authController.ts` | Revisar cadastro, login e validações |
| `src/controllers/userController.ts` | Revisar CRUD e respostas HTTP |
| `src/middlewares/authMiddleware.ts` | Revisar autenticação JWT |
| `src/middlewares/adminMiddleware.ts` | Revisar autorização administrativa |
| `src/routes/authRoutes.ts` | Conferir rotas públicas |
| `src/routes/userRoutes.ts` | Conferir rotas protegidas |
| `src/database/database.ts` | Conferir consultas parametrizadas |
| `src/database/init.ts` | Conferir restrições da tabela |
| `src/app.ts` | Conferir middlewares e configuração |
| `.env.example` | Revisar variáveis de ambiente |
| `.gitignore` | Conferir proteção de arquivos sensíveis |
| `README.md` | Documentar a API |

Não será necessário criar novos diretórios ou instalar dependências.

## 3. Passo 1 — Revisar as validações do cadastro

**Arquivo: `src/controllers/authController.ts`**

### 3.1. O que verificar

O endpoint `POST /api/auth/register` deverá:

- Exigir nome, e-mail e senha.
- Verificar se os campos possuem tipos válidos.
- Validar o formato básico do e-mail.
- Rejeitar e-mails duplicados.
- Armazenar somente o hash da senha.
- Atribuir obrigatoriamente o papel `user`.
- Impedir que o cliente escolha seu próprio papel.
- Nunca retornar a senha ou o hash.

### 3.2. O que adicionar ou alterar

**Arquivo: `src/controllers/authController.ts`**

Localize a função de cadastro existente. Antes da consulta ao banco de dados, confira se existe uma validação equivalente à seguinte:

```ts
// Recebe os dados enviados pelo cliente.
const { name, email, password } = req.body;

// Verifica se os campos possuem os tipos esperados.
if (
  typeof name !== "string" ||
  typeof email !== "string" ||
  typeof password !== "string"
) {
  return res.status(400).json({
    message: "Nome, e-mail e senha devem ser textos válidos."
  });
}

// Remove espaços desnecessários do nome e e-mail.
const cleanName = name.trim();
const cleanEmail = email.trim().toLowerCase();

// Verifica se os campos obrigatórios foram preenchidos.
if (!cleanName || !cleanEmail || !password) {
  return res.status(400).json({
    message: "Todos os campos são obrigatórios."
  });
}

// Expressão regular simples para verificar o formato do e-mail.
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(cleanEmail)) {
  return res.status(400).json({
    message: "Formato de e-mail inválido."
  });
}

// Exige uma senha com pelo menos oito caracteres.
if (password.length < 8) {
  return res.status(400).json({
    message: "A senha deve possuir pelo menos 8 caracteres."
  });
}
```

A regra de oito caracteres é uma escolha didática sugerida para esta revisão; não é uma exigência expressa do `AGENTS.md`. Caso já exista uma regra de tamanho definida nas etapas anteriores, preserve-a até decidir padronizá-la.

**O que remover ou corrigir:** remova validações redundantes ou contraditórias, caso existam. Não remova as consultas ao banco de dados nem a geração do hash com bcrypt.

### 3.3. Revisar a atribuição do papel

**Arquivo: `src/controllers/authController.ts`**

O papel deve ser definido pelo servidor, nunca pelo corpo da requisição.

```ts
// O papel é definido diretamente pelo servidor.
// Mesmo que o cliente envie role: "admin",
// a conta será criada como usuário comum.
const role = "user";

const sql = `
  INSERT INTO users (name, email, password_hash, role)
  VALUES (?, ?, ?, ?)
`;

// A execução deve utilizar os parâmetros abaixo,
// adaptados ao método da biblioteca SQLite já utilizada.
const params = [
  cleanName,
  cleanEmail,
  passwordHash,
  role
];
```

Nesse exemplo, `passwordHash` representa o hash já produzido pelo bcrypt. Mantenha a consulta de duplicidade, a execução SQL e o retorno HTTP existentes.

**Resultado esperado:** um visitante não poderá criar uma conta administrativa, mesmo enviando `"role": "admin"` no JSON.

## 4. Passo 2 — Revisar o login e a segurança das senhas

**Arquivo: `src/controllers/authController.ts`**

Localize a função responsável pelo endpoint `POST /api/auth/login`.

### 4.1. Conferir a comparação das senhas

A senha recebida deve ser comparada com o hash armazenado utilizando `bcrypt.compare()`.

```ts
// Compara a senha informada com o hash armazenado.
// A variável user representa o registro encontrado no SQLite.
const validPassword = await bcrypt.compare(
  password,
  user.password_hash
);

// Rejeita a tentativa quando a senha está incorreta.
if (!validPassword) {
  return res.status(401).json({
    message: "E-mail ou senha inválidos."
  });
}
```

Esse trecho pressupõe que a função já verificou se `user` existe e que `password` é uma string.

### 4.2. Conferir a geração do JWT

O token deve conter somente as informações necessárias para identificar o usuário.

```ts
// Gera um token contendo somente o identificador.
// A assinatura e a expiração devem usar a configuração
// segura de JWT já implementada na Etapa 5.
const token = jwt.sign(
  { id: user.id },
  jwtSecret,
  { expiresIn: "1h" }
);
```

`jwtSecret` representa o segredo previamente validado a partir de `process.env.JWT_SECRET`. Não substitua essa validação por um segredo fixo.

**O que remover ou corrigir:** elimine qualquer retorno que inclua `password`, `password_hash` ou o segredo JWT. Também remova eventuais logs que exponham senhas ou tokens.

## 5. Passo 3 — Revisar as respostas HTTP

**Arquivos: `src/controllers/authController.ts` e `src/controllers/userController.ts`**

### 5.1. Conferir os códigos de resposta

| Situação | Código esperado |
|---|---|
| Cadastro realizado | `201 Created` |
| Login realizado | `200 OK` |
| Consulta realizada | `200 OK` |
| Atualização realizada | `200 OK` |
| Exclusão realizada | `204 No Content` |
| Dados inválidos | `400 Bad Request` |
| Token ausente ou inválido | `401 Unauthorized` |
| Usuário sem permissão | `403 Forbidden` |
| Recurso inexistente | `404 Not Found` |
| E-mail duplicado | `409 Conflict` |
| Erro inesperado | `500 Internal Server Error` |

### 5.2. Padronizar respostas JSON

**Arquivo: `src/controllers/authController.ts`**

Para uma tentativa de cadastro com e-mail duplicado:

```ts
// Informa que o e-mail já está cadastrado.
// Não permite criar outro usuário com o mesmo e-mail.
return res.status(409).json({
  message: "E-mail já cadastrado."
});
```

**Arquivo: `src/controllers/userController.ts`**

Para uma consulta de usuário inexistente:

```ts
// Retorna 404 quando o usuário procurado não existe.
return res.status(404).json({
  message: "Usuário não encontrado."
});
```

Para uma exclusão bem-sucedida:

```ts
// HTTP 204 indica sucesso sem conteúdo na resposta.
// Portanto, não devemos enviar um JSON.
return res.status(204).send();
```

**O que remover ou corrigir:** substitua respostas `200` em situações de erro pelos códigos adequados. Remova corpos JSON de respostas `204`.

### 5.3. Revisar erros inesperados

Nos controllers, erros inesperados não devem ser enviados diretamente ao cliente.

```ts
try {
  // Executa a operação já implementada.
} catch (error) {
  // Não expõe detalhes internos do banco de dados.
  return res.status(500).json({
    message: "Erro interno do servidor."
  });
}
```

Esse bloco é ilustrativo: mantenha a operação real dentro do `try`. Erros conhecidos, como e-mail duplicado, devem continuar recebendo seus códigos específicos.

## 6. Passo 4 — Revisar autenticação e autorização

### 6.1. Revisar o middleware de autenticação

**Arquivo: `src/middlewares/authMiddleware.ts`**

Confira se o middleware:

1. Identifica o cabeçalho `Authorization`.
2. Verifica se utiliza o formato `Bearer TOKEN`.
3. Valida a assinatura e a expiração do JWT.
4. Busca o usuário correspondente no SQLite.
5. Disponibiliza o usuário autenticado para o controller.
6. Executa `next()` somente quando todas as verificações são bem-sucedidas.

```ts
// Obtém o cabeçalho Authorization.
const authorization = req.headers.authorization;

// Verifica se o cabeçalho foi enviado corretamente.
if (
  !authorization ||
  !authorization.startsWith("Bearer ")
) {
  return res.status(401).json({
    message: "Token de autenticação não informado."
  });
}

// Extrai o token, removendo o prefixo "Bearer ".
const token = authorization.substring(7);

// Verifica se existe conteúdo após o prefixo.
if (!token.trim()) {
  return res.status(401).json({
    message: "Token inválido."
  });
}

// A validação da assinatura, expiração e consulta
// do usuário deve continuar no código existente.
```

**O que remover ou corrigir:** elimine qualquer lógica que aceite o identificador do usuário enviado diretamente pelo cliente como substituto do JWT.

### 6.2. Revisar o middleware administrativo

**Arquivo: `src/middlewares/adminMiddleware.ts`**

O middleware deverá utilizar o usuário autenticado identificado pelo `authMiddleware`.

```ts
// req.user representa o usuário autenticado,
// disponibilizado pelo authMiddleware.
if (req.user?.role !== "admin") {
  return res.status(403).json({
    message: "Acesso permitido apenas para administradores."
  });
}

// Permite continuar para o controller.
next();
```

O exemplo pressupõe que a tipagem de `req.user` já tenha sido configurada na etapa anterior.

**O que remover ou corrigir:** remova qualquer autorização baseada em `req.body.role`, `req.query.role` ou em um papel informado pelo cliente.

### 6.3. Conferir as rotas protegidas

**Arquivo: `src/routes/userRoutes.ts`**

Verifique se os endpoints utilizam os middlewares adequados:

```ts
// Rotas da própria conta:
// exigem autenticação, mas não exigem papel admin.
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.delete("/me", authMiddleware, deleteMe);

// Rotas administrativas:
// exigem autenticação e autorização administrativa.
router.get("/", authMiddleware, adminMiddleware, listUsers);
router.get("/:id", authMiddleware, adminMiddleware, getUserById);
router.put("/:id", authMiddleware, adminMiddleware, updateUser);
router.delete("/:id", authMiddleware, adminMiddleware, deleteUser);
```

Os nomes dos controllers são ilustrativos: utilize os nomes efetivamente exportados pelo seu projeto.

**Atenção:** as rotas `/me` devem ser declaradas antes de `/:id`, evitando que o Express interprete `me` como um identificador.

**Arquivo: `src/routes/authRoutes.ts`**

Confira se `/register` e `/login` permanecem públicos e se não existe rota pública para criar administradores.

## 7. Passo 5 — Revisar consultas SQL e configuração

### 7.1. Conferir consultas parametrizadas

**Arquivos: `src/controllers/authController.ts` e `src/controllers/userController.ts`**

Exemplo que deve ser evitado:

```ts
// INCORRETO: concatena diretamente um valor recebido.
const sql = `SELECT * FROM users WHERE email = '${email}'`;
```

Exemplo correto:

```ts
// CORRETO: utiliza um parâmetro SQL.
// O valor será passado separadamente para o SQLite.
const sql = "SELECT * FROM users WHERE email = ?";
const params = [email];
```

**O que remover:** substitua consultas que interpolam diretamente valores recebidos do cliente.

**Arquivo: `src/database/database.ts`**

Confira se a conexão SQLite utilizada pelos controllers continua funcionando. Não modifique o arquivo se a conexão já estiver correta.

### 7.2. Conferir as restrições do banco

**Arquivo: `src/database/init.ts`**

Verifique se a criação da tabela `users` contempla:

- `id` gerado automaticamente.
- `email` com restrição `UNIQUE`.
- `password_hash` obrigatório.
- `role` restrito a `user` e `admin`.
- `created_at` e `updated_at`.

Não recrie a tabela nem apague o banco apenas para realizar a revisão. Caso uma restrição esteja ausente, registre a correção necessária e avalie como aplicá-la sem perder dados existentes.

### 7.3. Conferir variáveis de ambiente

**Arquivo: `.env.example`**

```dotenv
# Porta utilizada pelo servidor HTTP.
PORT=3000

# Exemplo ilustrativo. Utilize outro segredo no .env real.
JWT_SECRET=altere-este-segredo

# Prazo de validade do JWT.
JWT_EXPIRES_IN=1h

# Caminho do arquivo SQLite.
DATABASE_PATH=./data/database.sqlite

# Origem permitida pelo CORS.
CORS_ORIGIN=http://localhost:4200
```

**O que adicionar:** somente variáveis ausentes que já sejam utilizadas pela aplicação.

**O que remover:** segredos reais, senhas ou credenciais eventualmente inseridos nesse arquivo.

### 7.4. Conferir o .gitignore

**Arquivo: `.gitignore`**

```gitignore
# Dependências instaladas pelo npm.
node_modules/

# Arquivos compilados do TypeScript.
dist/

# Variáveis de ambiente com informações sensíveis.
.env
.env.*

# Mantém o arquivo de exemplo versionável.
!.env.example

# Arquivos SQLite gerados pela aplicação.
data/*.sqlite
data/*.sqlite-*
```

Adicione somente as regras ausentes e preserve as demais. O `.gitignore` não remove automaticamente arquivos já versionados.

## 8. Passo 6 — Executar os testes manuais

Utilize Postman, Insomnia ou Thunder Client, sem instalar frameworks de testes automatizados.

### 8.1. Iniciar o servidor

**Arquivo: `package.json`**

Confira qual script já foi configurado para iniciar a aplicação. Se existir o script `dev`:

```bash
npm run dev
```

Não altere o `package.json` se o script atual já executa corretamente o projeto.

Em outro terminal, confira a compilação:

```bash
npx tsc --noEmit
```

### 8.2. Preparar usuários de teste

- Visitante, sem token.
- Usuário comum, com token JWT.
- Administrador, com token JWT.

Utilize o procedimento de criação do primeiro administrador implementado na Etapa 7. Não crie uma rota pública para essa finalidade.

### 8.3. Executar a matriz de testes

| Teste | Endpoint | Cenário | Resultado esperado | Concluído |
|---|---|---|---|---|
| T01 | `POST /api/auth/register` | Cadastro válido | 201 | [ ] |
| T02 | `POST /api/auth/register` | E-mail duplicado | 409 | [ ] |
| T03 | `POST /api/auth/register` | Dados obrigatórios ausentes | 400 | [ ] |
| T04 | `POST /api/auth/register` | Tentativa de definir `role: admin` | 201, papel `user` | [ ] |
| T05 | `POST /api/auth/login` | Credenciais corretas | 200 | [ ] |
| T06 | `POST /api/auth/login` | Senha incorreta | 401 | [ ] |
| T07 | `GET /api/users/me` | Token válido | 200 | [ ] |
| T08 | `GET /api/users/me` | Sem token | 401 | [ ] |
| T09 | `GET /api/users/me` | Token inválido ou expirado | 401 | [ ] |
| T10 | `PUT /api/users/me` | Atualização válida | 200 | [ ] |
| T11 | `DELETE /api/users/me` | Exclusão da própria conta | 204 | [ ] |
| T12 | `GET /api/users` | Usuário comum | 403 | [ ] |
| T13 | `GET /api/users` | Administrador | 200 | [ ] |
| T14 | `GET /api/users/:id` | ID inexistente, como admin | 404 | [ ] |
| T15 | `PUT /api/users/:id` | Administrador atualiza usuário | 200 | [ ] |
| T16 | `DELETE /api/users/:id` | Administrador exclui usuário | 204 | [ ] |
| T17 | `PUT /api/users/me` | Tentativa de alterar `role` | Papel inalterado | [ ] |
| T18 | `GET /api/users/me` | Conta excluída, token antigo | 401 | [ ] |
| T19 | `GET /api/users/me` | Verificar dados sensíveis | Sem `password_hash` | [ ] |
| T20 | `GET /api/users` | Administrador com token inválido | 401 | [ ] |

Os testes de exclusão devem ser realizados por último ou com contas descartáveis, para não prejudicar os demais cenários.

### 8.4. Exemplo de requisição de teste

No Postman ou Thunder Client, configure:

**Método:** `POST`  
**URL:** `http://localhost:3000/api/auth/register`  
**Body — JSON:**

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "12345678",
  "role": "admin"
}
```

**Resultado esperado:** HTTP `201`, com o usuário cadastrado como `user`, nunca como `admin`. O corpo exato da resposta dependerá do formato implementado no controller, mas não poderá conter senha ou hash.

## 9. Passo 7 — Documentar a API

**Arquivo: `README.md`**

Documente tecnologias, instalação, variáveis de ambiente, endpoints, autenticação JWT e códigos HTTP.

**O que adicionar:** as seções apresentadas no modelo a seguir, adaptando comandos aos scripts reais do projeto.

**O que remover:** instruções desatualizadas, endpoints inexistentes e exemplos incompatíveis. Preserve informações corretas já presentes.

### 9.1. Modelo de conteúdo para README.md

O conteúdo a seguir pode ser incorporado ao `README.md` do projeto:

---

# API REST — Gerenciamento de Usuários

Projeto didático desenvolvido com Node.js, TypeScript, Express, SQLite, bcrypt e JWT para a disciplina de Programação para Internet.

## Tecnologias utilizadas

- Node.js — ambiente de execução JavaScript.
- TypeScript — linguagem com tipagem estática.
- Express — framework para criação da API.
- SQLite — banco de dados relacional.
- bcrypt — geração e verificação de hashes de senhas.
- JWT — autenticação baseada em tokens.
- CORS — controle de origens permitidas.
- dotenv — carregamento de variáveis de ambiente.

## Instalação e execução

**1. Instalar as dependências:**

```bash
npm install
```

**2. Configurar o ambiente:**

Copiar `.env.example` para `.env` e configurar as variáveis.

**3. Inicializar o banco de dados:**

Executar o procedimento de inicialização definido no projeto.

**4. Iniciar o servidor:**

```bash
npm run dev
```

O comando acima pressupõe que o script `dev` esteja configurado no `package.json`.

## Autenticação

A API utiliza JWT. Após realizar login, o cliente deverá enviar o token nas requisições protegidas:

```http
Authorization: Bearer SEU_TOKEN
```

O token possui prazo de validade. Requisições com token inválido ou expirado serão rejeitadas.

## Perfis de acesso

- **Visitante:** pode criar uma conta e realizar login.
- **User:** pode consultar, atualizar e excluir sua própria conta.
- **Admin:** pode realizar operações administrativas sobre usuários.

O cadastro público sempre cria usuários com papel `user`.

## Endpoints

| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | `/api/auth/register` | Público | Cadastrar usuário |
| POST | `/api/auth/login` | Público | Realizar login |
| GET | `/api/users/me` | Autenticado | Consultar própria conta |
| PUT | `/api/users/me` | Autenticado | Atualizar própria conta |
| DELETE | `/api/users/me` | Autenticado | Excluir própria conta |
| GET | `/api/users` | Admin | Listar usuários |
| GET | `/api/users/:id` | Admin | Consultar usuário |
| PUT | `/api/users/:id` | Admin | Atualizar usuário |
| DELETE | `/api/users/:id` | Admin | Excluir usuário |

## Exemplo de cadastro

**Requisição:**

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "12345678"
}
```

**Resposta esperada:** HTTP `201 Created`, sem senha ou hash.

## Exemplo de login

**Requisição:**

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "maria@email.com",
  "password": "12345678"
}
```

**Resposta ilustrativa:**

```json
{
  "token": "JWT_GERADO_PELO_SERVIDOR"
}
```

## Exemplo de consulta autenticada

```http
GET /api/users/me
Authorization: Bearer SEU_TOKEN
```

**Resposta ilustrativa:**

```json
{
  "id": 1,
  "name": "Maria Silva",
  "email": "maria@email.com",
  "role": "user"
}
```

O formato exato das respostas deve corresponder ao implementado nos controllers.

## Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Operação realizada |
| 201 | Recurso criado |
| 204 | Operação realizada sem corpo |
| 400 | Dados inválidos |
| 401 | Autenticação ausente ou inválida |
| 403 | Acesso proibido |
| 404 | Recurso não encontrado |
| 409 | Conflito de dados |
| 500 | Erro interno |

## Segurança

- Senhas são armazenadas utilizando bcrypt.
- Tokens JWT possuem prazo de validade.
- O segredo JWT é configurado por variável de ambiente.
- As consultas SQL utilizam parâmetros.
- O acesso administrativo é verificado no backend.
- Senhas e hashes não são retornados pela API.

## Testes

Os endpoints podem ser testados manualmente utilizando Postman, Insomnia ou Thunder Client. Os testes devem contemplar cadastro, login, autenticação, autorização, operações CRUD e tratamento de erros.

## Observações

Este é um projeto didático. A arquitetura foi mantida simples para facilitar a compreensão dos conceitos fundamentais de desenvolvimento backend.

---

O modelo acima deve ser adaptado aos scripts, aos formatos de resposta e aos procedimentos de inicialização reais do projeto.

## 10. Passo 8 — Verificação final

### 10.1. Verificar a compilação

```bash
npx tsc --noEmit
```

O comando não deverá apresentar erros de TypeScript.

### 10.2. Verificar alterações no Git

```bash
git status
```

Esse comando identifica arquivos modificados.

```bash
git diff
```

Esse comando apresenta alterações nos arquivos já rastreados pelo Git.

Verifique se:

- Nenhuma funcionalidade existente foi removida indevidamente.
- Nenhuma senha ou token foi adicionado ao código ou à documentação.
- O banco SQLite não será versionado.
- As alterações ficaram restritas aos problemas identificados.

### 10.3. Registrar a conclusão

Após aprovar os testes:

```bash
# Adiciona os arquivos modificados que não estão ignorados.
git add .

# Registra a conclusão da etapa.
git commit -m "Etapa 8: revisao, testes e documentacao da API"
```

Antes de executar `git add .`, confira o `git status` e as regras do `.gitignore`.

## 11. Critérios de conclusão da Etapa 8

- [ ] O cadastro valida corretamente os dados recebidos.
- [ ] O login autentica usuários utilizando bcrypt e JWT.
- [ ] O cadastro público não permite a escolha do papel administrativo.
- [ ] As respostas HTTP utilizam códigos adequados.
- [ ] Os endpoints protegidos exigem autenticação.
- [ ] Os endpoints administrativos exigem papel `admin`.
- [ ] Usuários comuns não conseguem acessar contas de terceiros.
- [ ] As consultas SQL utilizam parâmetros.
- [ ] Nenhuma resposta expõe senhas ou hashes.
- [ ] Todos os cenários de teste foram executados e aprovados.
- [ ] O `README.md` está atualizado.
- [ ] O TypeScript compila sem erros.
- [ ] O projeto continua executável.

## 12. Resultado esperado

Ao final da Etapa 8, teremos uma API REST funcional, revisada, testada manualmente e documentada, mantendo a arquitetura simples definida no `AGENTS.md`.

O projeto terá cumprido seu objetivo didático inicial: demonstrar o funcionamento de uma API com Node.js, TypeScript, Express, SQLite, bcrypt e JWT, incluindo cadastro, login, autenticação, autorização e operações CRUD.

Como atividade complementar, pode-se realizar uma **auditoria cruzada**: cada aluno ou dupla testa a API de outro grupo, executa a matriz de testes e registra eventuais falhas. Isso permite avaliar a implementação, a documentação e a capacidade de compreender uma API desenvolvida por terceiros.
