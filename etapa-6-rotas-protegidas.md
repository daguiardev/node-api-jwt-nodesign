# Etapa 6 — Rotas protegidas com JWT

**Projeto:** API REST com Node.js, TypeScript, Express, SQLite e JWT  
**Disciplina:** Programação para Internet  
**Público-alvo:** Estudantes iniciantes em desenvolvimento back-end

Este tutorial segue o `AGENTS.md`: código simples, funções, comentários didáticos, consultas parametrizadas e implementação incremental. A Etapa 6 contempla autenticação de requisições e operações sobre a própria conta. As funcionalidades administrativas ficam para a Etapa 7.

> **Antes de começar:** o `AGENTS.md` descreve a arquitetura pretendida, mas não contém o código efetivo das Etapas 1 a 5. Os exemplos abaixo pressupõem que `src/database/database.ts` exporta uma conexão `db` da biblioteca `sqlite`, com `db.get()` e `db.run()` assíncronos; que o login gera um JWT HS256 com `{ id: user.id }`; e que a tabela `users` tem os campos previstos no `AGENTS.md`. Se o repositório utiliza outra API SQLite ou outro nome para o identificador no token, adapte apenas esses pontos, preservando o que já funciona.

## 1. Objetivos da etapa

Ao final, o estudante deverá conseguir:

1. Criar um middleware para verificar o JWT e identificar o usuário no SQLite.
2. Implementar `GET /api/users/me` para consultar a própria conta.
3. Implementar `PUT /api/users/me` para atualizar a própria conta.
4. Implementar `DELETE /api/users/me` para excluir a própria conta.
5. Testar acessos permitidos e negados.

### 1.1. O que é uma rota protegida?

É um endpoint acessível somente a clientes autenticados. Após o login, o cliente recebe um JWT e o envia no cabeçalho HTTP:

```http
Authorization: Bearer SEU_TOKEN_JWT
```

O fluxo será:

```text
Cliente
  │ envia requisição + JWT
  ▼
authMiddleware
  │ verifica assinatura e expiração
  │ consulta usuário no SQLite
  ├── token ausente/inválido ou conta excluída → 401
  ▼
userController
  │ usa o ID autenticado (não um ID enviado pelo cliente)
  ▼
Resposta HTTP (JSON ou 204 sem corpo)
```

### 1.2. Endpoints desta etapa

| Método | Endpoint | Acesso | Operação |
|---|---|---|---|
| GET | `/api/users/me` | Autenticado | Consultar própria conta |
| PUT | `/api/users/me` | Autenticado | Atualizar própria conta |
| DELETE | `/api/users/me` | Autenticado | Excluir própria conta |

`me` representa o usuário identificado pelo JWT. O cliente não escolhe o ID de outra pessoa para essas operações.

## 2. Preparar e verificar o projeto

### 2.1. Estrutura dos arquivos

```text
projeto/
├── src/
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── userController.ts        ← criar ou modificar
│   ├── database/
│   │   ├── database.ts
│   │   └── init.ts
│   ├── middlewares/
│   │   └── authMiddleware.ts       ← criar
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   └── userRoutes.ts           ← criar ou modificar
│   ├── app.ts                      ← verificar/modificar
│   └── server.ts
├── data/
│   └── database.sqlite
├── .env                            ← verificar
├── package.json                    ← verificar
└── tsconfig.json
```

Não criar `adminMiddleware.ts` nesta etapa: sua implementação pertence à Etapa 7.

### 2.2. Verificar as dependências

**Arquivo: `package.json` — verificar, sem substituir o conteúdo.**

No terminal, na raiz do projeto:

```bash
npm list express jsonwebtoken bcrypt
npm list @types/express @types/jsonwebtoken
```

Instale apenas o que estiver faltando. Por exemplo:

```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

### 2.3. Conferir o segredo JWT

**Arquivo: `.env` — verificar, sem substituir o conteúdo.**

```dotenv
JWT_SECRET=seu-segredo-longo-e-aleatorio
JWT_EXPIRES_IN=1h
```

O `JWT_SECRET` precisa ser o mesmo usado no login. Nunca envie `.env` ao Git e não coloque o segredo diretamente no código.

### 2.4. Conferir a Etapa 5

**Arquivo: `src/controllers/authController.ts` — somente verificar.**

O exemplo desta etapa espera um token com o campo `id` numérico e algoritmo HS256, semelhante a:

```typescript
// Exemplo ilustrativo da geração do JWT na Etapa 5.
const token = jwt.sign(
  { id: user.id },
  process.env.JWT_SECRET!,
  { expiresIn: "1h", algorithm: "HS256" }
);
```

Se o login utiliza `userId` ou `sub`, adapte a leitura no middleware ao formato já existente, em vez de modificar o login apenas para renomear o campo.

## 3. Passo 1 — Criar o middleware de autenticação

**Arquivo: `src/middlewares/authMiddleware.ts`**  
**Ação:** criar e adicionar todo o código a seguir. Se o arquivo já existir, comparar e incorporar apenas as partes necessárias.

Um *middleware* é uma função executada antes do controller. Ele verifica o token, consulta o usuário e, se tudo estiver correto, chama `next()`.

```typescript
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { db } from "../database/database";

// Dados necessários para identificar o usuário autenticado.
export type AuthenticatedUser = {
  id: number;
  role: "user" | "admin";
};

// Acrescenta à requisição uma propriedade opcional para o usuário.
export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

/**
 * Verifica o JWT e identifica o usuário no banco.
 * Somente chama next() quando a autenticação é bem-sucedida.
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // O token deve ser enviado no cabeçalho Authorization.
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Token de autenticação não informado",
    });
    return;
  }

  // Remove o prefixo "Bearer " e os espaços excedentes.
  const token = authorization.substring(7).trim();

  if (!token) {
    res.status(401).json({
      message: "Token de autenticação não informado",
    });
    return;
  }

  // O mesmo segredo é utilizado para assinar e validar o JWT.
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: "Erro interno do servidor" });
    return;
  }

  let userId: number;

  try {
    // Confere a assinatura, a expiração e o algoritmo do JWT.
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as JwtPayload | string;

    // Este projeto espera um campo id numérico no token.
    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "number" ||
      !Number.isSafeInteger(decoded.id) ||
      decoded.id <= 0
    ) {
      res.status(401).json({ message: "Token inválido" });
      return;
    }

    userId = decoded.id;
  } catch {
    // Um JWT expirado, alterado ou malformado é rejeitado.
    res.status(401).json({ message: "Token inválido ou expirado" });
    return;
  }

  try {
    // Consulta o usuário em cada requisição protegida.
    // Uma conta excluída não pode continuar usando seu token.
    const user = await db.get<AuthenticatedUser>(
      "SELECT id, role FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      res.status(401).json({
        message: "Usuário não encontrado ou sessão inválida",
      });
      return;
    }

    // O papel vem do banco de dados, nunca do corpo da requisição.
    req.user = { id: user.id, role: user.role };

    // Libera o processamento da rota.
    next();
  } catch {
    // Não expor detalhes internos nem imprimir tokens nos logs.
    console.error("Erro ao consultar usuário autenticado");
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}
```

### 3.1. Explicação do código

- `req.headers.authorization`: recupera o cabeçalho HTTP que contém o token.
- `jwt.verify()`: verifica assinatura, expiração e algoritmo; lança erro quando a validação falha.
- `db.get()`: consulta um único registro no SQLite, com parâmetro `?` para evitar SQL Injection.
- `req.user`: guarda os dados confiáveis para os controllers.
- `next()`: permite que o Express continue para a próxima função.

> **Atenção:** se a biblioteca SQLite ou a estrutura do JWT do projeto forem diferentes, adapte a consulta e a leitura do ID. Não instale uma nova biblioteca de banco de dados apenas para copiar o exemplo.

## 4. Passo 2 — Consultar a própria conta

**Arquivo: `src/controllers/userController.ts`**  
**Ação:** criar se não existir; caso exista, preservar o conteúdo e adicionar a função `getMe`.

### 4.1. Adicionar imports

No início do arquivo, inclua os imports necessários (sem duplicar os existentes):

```typescript
import { Response } from "express";
import { db } from "../database/database";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
```

### 4.2. Adicionar a função `getMe`

```typescript
/**
 * GET /api/users/me
 * Retorna apenas os dados da conta autenticada.
 */
export async function getMe(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // O ID é preenchido pelo middleware, não pelo cliente.
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Usuário não autenticado" });
    return;
  }

  try {
    // Seleciona somente campos públicos: nunca retornar password_hash.
    const user = await db.get(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado" });
      return;
    }

    res.status(200).json(user);
  } catch {
    console.error("Erro ao consultar a própria conta");
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}
```

O ponto principal é `req.user?.id`: não utilizar `req.body.id` ou `req.params.id` para escolher a conta a ser consultada.

### 4.3. Resultado esperado

```http
GET http://localhost:3000/api/users/me
Authorization: Bearer SEU_TOKEN
```

Resposta ilustrativa (`200 OK`):

```json
{
  "id": 1,
  "name": "Maria Silva",
  "email": "maria@email.com",
  "role": "user",
  "created_at": "2026-11-09 10:00:00",
  "updated_at": "2026-11-09 10:00:00"
}
```

O hash da senha não deve aparecer.

## 5. Passo 3 — Atualizar a própria conta

**Arquivo: `src/controllers/userController.ts`**  
**Ação:** manter `getMe` e adicionar `updateMe` ao final do arquivo.

O usuário poderá alterar nome, e-mail e, opcionalmente, senha. Não poderá alterar `role`. Neste exemplo, `PUT` exige `name` e `email`; `password` é opcional.

### 5.1. Adicionar o import do bcrypt

No início do mesmo arquivo, sem duplicar imports:

```typescript
import bcrypt from "bcrypt";
```

### 5.2. Adicionar a função `updateMe`

```typescript
/**
 * PUT /api/users/me
 * Atualiza a própria conta sem permitir mudança de papel.
 */
export async function updateMe(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Identifica o usuário a partir do JWT validado.
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Usuário não autenticado" });
    return;
  }

  // Garante que o corpo da requisição seja um objeto JSON.
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ message: "Corpo da requisição inválido" });
    return;
  }

  const { name, email, password } = req.body;

  // Nome e e-mail são obrigatórios nesta operação PUT.
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    res.status(400).json({ message: "Nome e e-mail são obrigatórios" });
    return;
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // Verificação simples de formato de e-mail.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    res.status(400).json({ message: "E-mail inválido" });
    return;
  }

  // Impede alterações de role, id e outros campos protegidos.
  const allowedFields = ["name", "email", "password"];
  const hasInvalidFields = Object.keys(req.body).some(
    (field) => !allowedFields.includes(field)
  );

  if (hasInvalidFields) {
    res.status(400).json({
      message: "A requisição contém campos não permitidos",
    });
    return;
  }

  // Se uma nova senha foi enviada, exige pelo menos 8 caracteres.
  if (
    password !== undefined &&
    (typeof password !== "string" || password.length < 8)
  ) {
    res.status(400).json({
      message: "A senha deve possuir pelo menos 8 caracteres",
    });
    return;
  }

  try {
    // Confirma que a conta ainda existe.
    const existingUser = await db.get(
      "SELECT id FROM users WHERE id = ?",
      [userId]
    );

    if (!existingUser) {
      res.status(404).json({ message: "Usuário não encontrado" });
      return;
    }

    // Impede usar um e-mail que pertence a outra conta.
    const emailOwner = await db.get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [normalizedEmail, userId]
    );

    if (emailOwner) {
      res.status(409).json({ message: "E-mail já cadastrado" });
      return;
    }

    if (password !== undefined) {
      // Nunca armazenar a nova senha em texto puro.
      const passwordHash = await bcrypt.hash(password, 10);

      await db.run(
        `UPDATE users
         SET name = ?, email = ?, password_hash = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [normalizedName, normalizedEmail, passwordHash, userId]
      );
    } else {
      // Sem nova senha: atualizar apenas nome e e-mail.
      await db.run(
        `UPDATE users
         SET name = ?, email = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [normalizedName, normalizedEmail, userId]
      );
    }

    // Retorna os dados atualizados sem o hash da senha.
    const updatedUser = await db.get(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    // A restrição UNIQUE do SQLite também protege o e-mail.
    if (
      error instanceof Error &&
      (error.message.includes("SQLITE_CONSTRAINT_UNIQUE") ||
        error.message.includes("UNIQUE constraint failed"))
    ) {
      res.status(409).json({ message: "E-mail já cadastrado" });
      return;
    }

    console.error("Erro ao atualizar a própria conta");
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}
```

### 5.3. Por que essas verificações são importantes?

- `role` não pode ser modificado pelo usuário: ninguém pode se tornar administrador enviando `"role": "admin"`.
- `bcrypt.hash()` gera o hash de uma nova senha, em vez de armazená-la em texto puro.
- `WHERE id = ?` restringe a atualização à conta identificada pelo token.
- Os parâmetros SQL (`?`) impedem que valores recebidos sejam interpretados como instruções SQL.
- A regra de normalização do e-mail deve ser a mesma usada no cadastro da Etapa 4.

### 5.4. Exemplo de requisição

```http
PUT http://localhost:3000/api/users/me
Authorization: Bearer SEU_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Maria Oliveira",
  "email": "maria.oliveira@email.com",
  "password": "novaSenha123"
}
```

Resposta ilustrativa (`200 OK`):

```json
{
  "id": 1,
  "name": "Maria Oliveira",
  "email": "maria.oliveira@email.com",
  "role": "user",
  "created_at": "2026-11-09 10:00:00",
  "updated_at": "2026-11-09 11:00:00"
}
```

Os horários são apenas exemplos.

## 6. Passo 4 — Excluir a própria conta

**Arquivo: `src/controllers/userController.ts`**  
**Ação:** adicionar `deleteMe` ao final do arquivo, mantendo `getMe` e `updateMe`.

```typescript
/**
 * DELETE /api/users/me
 * Exclui apenas a conta do usuário autenticado.
 */
export async function deleteMe(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // ID fornecido pelo middleware após a validação do JWT.
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Usuário não autenticado" });
    return;
  }

  try {
    // Remove somente o registro correspondente ao usuário atual.
    const result = await db.run(
      "DELETE FROM users WHERE id = ?",
      [userId]
    );

    // changes indica quantos registros foram afetados.
    if (result.changes === 0) {
      res.status(404).json({ message: "Usuário não encontrado" });
      return;
    }

    // 204 significa sucesso, mas sem corpo na resposta.
    res.status(204).send();
  } catch {
    console.error("Erro ao excluir a própria conta");
    res.status(500).json({ message: "Erro interno do servidor" });
  }
}
```

A instrução `DELETE FROM users WHERE id = ?` utiliza o ID autenticado, não um identificador escolhido pelo cliente. Após a exclusão, o token antigo pode continuar criptograficamente válido até expirar, mas o middleware rejeitará novas requisições porque a conta não existe mais.

## 7. Passo 5 — Configurar as rotas protegidas

**Arquivo: `src/routes/userRoutes.ts`**  
**Ação:** criar o arquivo, se não existir. Caso exista, acrescentar as três rotas, preservando as demais funcionalidades já implementadas.

Para um arquivo novo, utilize:

```typescript
import { Router } from "express";

// Middleware que verifica o JWT antes do controller.
import { authMiddleware } from "../middlewares/authMiddleware";

// Controllers das operações sobre a própria conta.
import {
  getMe,
  updateMe,
  deleteMe,
} from "../controllers/userController";

const router = Router();

// Consulta a conta autenticada.
router.get("/me", authMiddleware, getMe);

// Atualiza a conta autenticada.
router.put("/me", authMiddleware, updateMe);

// Exclui a conta autenticada.
router.delete("/me", authMiddleware, deleteMe);

export default router;
```

O Express executa as funções na ordem declarada:

```text
GET /me → authMiddleware → getMe → resposta JSON
                 │
                 └── se não autenticado: 401 e interrupção
```

`next()` permite continuar; caso o middleware responda com `401`, o controller não será executado. Não é necessário repetir `jwt.verify()` em cada controller.

## 8. Passo 6 — Registrar as rotas no Express

**Arquivo: `src/app.ts`**  
**Ação:** verificar o conteúdo atual. Adicionar apenas o import e o registro das rotas, se ainda não existirem.

### 8.1. Adicionar o import

```typescript
// Importa as rotas de gerenciamento de usuários.
import userRoutes from "./routes/userRoutes";
```

### 8.2. Registrar o prefixo

Depois de `app.use(express.json())` e da configuração dos middlewares gerais:

```typescript
// Todas as rotas de userRoutes terão o prefixo /api/users.
app.use("/api/users", userRoutes);
```

### 8.3. Exemplo de organização de `app.ts`

> Este exemplo é apenas uma referência. **Não substitua o arquivo inteiro** se ele já possui configurações funcionando. Preserve o CORS, as rotas existentes e as demais opções da Etapa 2.

```typescript
import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();

// Permite receber corpos JSON.
app.use(express.json());

// Preserve a configuração de origem definida na Etapa 2.
app.use(cors({
  origin: process.env.CORS_ORIGIN,
}));

// Rotas públicas de cadastro e login.
app.use("/api/auth", authRoutes);

// Rotas de usuários; a autenticação é aplicada em cada rota.
app.use("/api/users", userRoutes);

export default app;
```

Assim, `router.get("/me", ...)` passa a responder em `GET /api/users/me`.

## 9. Passo 7 — Executar o projeto

**Arquivo: `tsconfig.json` — apenas verificar se já está configurado.**  
**Arquivo: `package.json` — utilizar o script existente; não criar outro sem necessidade.**

### 9.1. Verificar erros de TypeScript

```bash
npx tsc --noEmit
```

Esse comando verifica os tipos sem gerar arquivos JavaScript. Se aparecerem erros, confira:

- Imports e exports dos arquivos.
- Compatibilidade da conexão com `db.get()` e `db.run()`.
- Formato do campo `id` no JWT.
- Tipos do Express e do jsonwebtoken.
- Configuração TypeScript que já funciona nas etapas anteriores.

### 9.2. Iniciar o servidor

Se o script de desenvolvimento configurado no `package.json` se chama `dev`:

```bash
npm run dev
```

Não é necessário modificar `src/server.ts` nesta etapa.

## 10. Passo 8 — Testar as rotas protegidas

Use Postman, Insomnia ou Thunder Client. Os exemplos abaixo pressupõem a porta `3000`; ajuste se a aplicação utiliza outra.

### 10.1. Obter o JWT

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

```json
{
  "email": "maria@email.com",
  "password": "12345678"
}
```

Copie o token retornado pelo login. Nas próximas requisições, informe-o no cabeçalho `Authorization`, com o esquema `Bearer`.

### 10.2. Consultar a própria conta

```http
GET http://localhost:3000/api/users/me
Authorization: Bearer SEU_TOKEN
```

**Esperado:** `200 OK`, com os dados da própria conta, sem senha ou hash.

### 10.3. Atualizar a própria conta

```http
PUT http://localhost:3000/api/users/me
Authorization: Bearer SEU_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Maria Oliveira",
  "email": "maria.oliveira@email.com"
}
```

**Esperado:** `200 OK`, com os dados atualizados.

### 10.4. Excluir a própria conta

```http
DELETE http://localhost:3000/api/users/me
Authorization: Bearer SEU_TOKEN
```

**Esperado:** `204 No Content`, sem JSON na resposta. Depois, tente novamente `GET /api/users/me` com o mesmo token: o resultado esperado é `401 Unauthorized`.

### 10.5. Checklist de testes

- [ ] `GET /me` com JWT válido → `200` e dados da própria conta.
- [ ] `GET /me` sem token → `401`.
- [ ] `GET /me` com token adulterado → `401`.
- [ ] `GET /me` com token expirado → `401`.
- [ ] `PUT /me` com dados válidos → `200`.
- [ ] `PUT /me` com e-mail já utilizado por outra conta → `409`.
- [ ] `PUT /me` com `"role": "admin"` → `400`.
- [ ] `PUT /me` com nova senha → `200`; senha armazenada como hash.
- [ ] `DELETE /me` com JWT válido → `204`.
- [ ] `GET /me` após exclusão → `401`.
- [ ] Nenhuma resposta contém senha em texto puro ou `password_hash`.

> **Ordem recomendada:** execute o teste de exclusão por último, pois ele remove a conta necessária para os demais testes.

## 11. Compatibilidade e cuidados com o código existente

Antes de aplicar os exemplos, confira os seguintes arquivos:

| Arquivo | O que conferir |
|---|---|
| `src/database/database.ts` | Se exporta `db` com `get()` e `run()` assíncronos. |
| `src/controllers/authController.ts` | Se o JWT contém `id` numérico e usa HS256. |
| `src/database/init.ts` | Se a tabela e os campos têm os nomes usados nas consultas. |
| `src/app.ts` | Se `express.json()` e as rotas já estão configurados. |
| `package.json` | Se dependências e script de execução estão disponíveis. |
| `.env` | Se `JWT_SECRET` é o mesmo usado no login. |

**Atenção a três detalhes:**

1. O corpo do `PUT` precisa ser um objeto JSON válido antes de ler seus campos.
2. A atualização deve usar a mesma normalização de e-mail adotada no cadastro da Etapa 4.
3. Se o projeto utiliza `sqlite3` diretamente ou `better-sqlite3`, adapte os métodos de consulta em vez de trocar a biblioteca existente.

Os exemplos de `UPDATE` consideram uma conta ainda existente entre a verificação e a alteração. Em um projeto didático simples, esse fluxo facilita o entendimento; em aplicações concorrentes, verificações adicionais podem ser necessárias. Não anteciparemos essa evolução arquitetural agora.

## 12. Resumo e conclusão

Nesta etapa, implementamos:

- **Autenticação com JWT:** o middleware verifica o token e identifica a conta no banco.
- **Consulta da própria conta:** `GET /api/users/me`.
- **Atualização da própria conta:** `PUT /api/users/me`, sem permitir mudança de papel.
- **Exclusão da própria conta:** `DELETE /api/users/me`.
- **Segurança essencial:** senhas protegidas por bcrypt, consultas parametrizadas, JWT validado e nenhuma exposição do hash da senha.

O aprendizado central é distinguir **autenticação**, realizada pelo middleware, do **processamento da requisição**, realizado pelo controller.

**Próxima etapa:** após executar o checklist e confirmar que a API continua funcionando, avançar para a **Etapa 7 — Administração**: criação do primeiro administrador, middleware de autorização e endpoints administrativos.
