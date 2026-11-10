# Etapa 5 — Implementação do Login com bcrypt e JWT

Nesta etapa, implementaremos o **login de usuários** na API REST desenvolvida com Node.js, TypeScript, Express e SQLite, seguindo as orientações do `AGENTS.md`.

O objetivo é permitir que um usuário previamente cadastrado informe seu e-mail e senha, tenha suas credenciais verificadas e, caso estejam corretas, receba um **JWT (JSON Web Token)**.

Seguiremos uma abordagem incremental, com explicações didáticas, comentários no código e identificação explícita dos arquivos que deverão ser criados ou modificados.

## 1. Objetivos da etapa

Ao concluir esta etapa, a aplicação deverá ser capaz de:

1. Receber e-mail e senha por meio de uma requisição HTTP.
2. Consultar o usuário no banco SQLite.
3. Comparar a senha informada com o hash armazenado utilizando bcrypt.
4. Retornar uma mensagem de erro quando as credenciais forem inválidas.
5. Gerar um JWT quando as credenciais forem válidas.
6. Definir um prazo de expiração para o token.
7. Retornar o token ao cliente em formato JSON.

**Importante:** nesta etapa, implementaremos apenas a geração do JWT. A validação do token para acessar rotas protegidas será realizada na **Etapa 6 — Rotas protegidas**, conforme o planejamento do projeto.

## 2. Compreendendo o funcionamento do login

O fluxo de autenticação pode ser resumido da seguinte forma:

```text
1. Cliente envia e-mail e senha
           |
           v
   POST /api/auth/login
           |
           v
2. API consulta o SQLite
   Busca usuário pelo e-mail
           |
           v
3. bcrypt compara as senhas
   Senha informada x hash armazenado
           |
           v
4. API gera o JWT
   Assinatura + prazo de expiração
           |
           v
5. Cliente recebe o token
   Resposta HTTP 200 + JSON
```

O bcrypt não recupera a senha original. Ele verifica se a senha recebida corresponde ao hash armazenado. Quando essa verificação é bem-sucedida, o JWT é gerado e devolvido ao cliente.

## 3. Arquivos envolvidos

Considerando a estrutura definida no `AGENTS.md`, utilizaremos os seguintes arquivos:

| Arquivo | Ação |
|---|---|
| `package.json` | Verificar dependências |
| `.env` | Adicionar configurações do JWT |
| `.env.example` | Documentar configurações |
| `src/controllers/authController.ts` | Adicionar a função de login |
| `src/routes/authRoutes.ts` | Adicionar a rota de login |
| `src/app.ts` | Conferir o registro das rotas |

Não será necessário criar novos diretórios ou alterar a estrutura do banco de dados.

Como os arquivos atuais da implementação das Etapas 1 a 4 não foram fornecidos, os exemplos abaixo indicam os trechos a acrescentar, preservando o cadastro e as demais funcionalidades existentes.

---

## Passo 1 — Instalar a biblioteca JWT

**Arquivo a verificar:** `package.json`

O Node.js não disponibiliza nativamente as funções de geração de JWT que utilizaremos. Para isso, instalaremos a biblioteca `jsonwebtoken`.

Abra o terminal na raiz do projeto e execute:

```bash
npm list jsonwebtoken
```

Se a biblioteca ainda não estiver instalada, execute:

```bash
npm install jsonwebtoken
```

Como estamos utilizando TypeScript, também precisamos das definições de tipos:

```bash
npm install -D @types/jsonwebtoken
```

As dependências serão adicionadas automaticamente ao `package.json`. Não é necessário editar esse arquivo manualmente.

A biblioteca `jsonwebtoken` disponibiliza a função `jwt.sign()`, responsável pela criação de tokens assinados.

## Passo 2 — Configurar as variáveis de ambiente

**Arquivo a modificar:** `.env`

Abra o arquivo `.env` localizado na raiz do projeto.

Mantenha as variáveis existentes e adicione, caso ainda não estejam presentes:

```env
# Segredo utilizado para assinar os tokens JWT.
# Substitua por um valor longo, aleatório e exclusivo.
JWT_SECRET=substitua-por-um-segredo-aleatorio-seguro

# Tempo de validade dos tokens gerados.
JWT_EXPIRES_IN=1h
```

O `JWT_SECRET` é uma chave secreta utilizada na assinatura digital do token. Não deve ser compartilhada nem enviada para o Git.

Para gerar um segredo aleatório, execute no terminal:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e utilize-o como valor de `JWT_SECRET` no `.env`.

A variável `JWT_EXPIRES_IN` determina por quanto tempo o token será válido. Nesse exemplo, `1h` significa uma hora.

**Arquivo a modificar:** `.env.example`

Adicione as mesmas variáveis, mas utilizando valores ilustrativos:

```env
# Exemplo de configuração do JWT.
JWT_SECRET=configure-um-segredo-seguro-aqui
JWT_EXPIRES_IN=1h
```

Não remova as demais configurações existentes nesse arquivo.

## Passo 3 — Implementar a função de login

**Arquivo a modificar:** `src/controllers/authController.ts`

Esse arquivo já deverá conter a função responsável pelo cadastro de usuários, implementada na Etapa 4.

**O que fazer:** mantenha a função de cadastro e seus imports. Acrescente os imports necessários e, ao final do arquivo, adicione a função `login`.

### 3.1. Adicionar os imports

Verifique os imports existentes e acrescente apenas os que ainda não estiverem presentes:

```ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";

// Importa a conexão com o banco de dados.
// Ajuste o nome do import conforme a exportação existente
// no arquivo src/database/database.ts.
import db from "../database/database";
```

Se a Etapa 4 já utiliza `Request`, `Response`, `bcrypt` ou `db`, reutilize os imports existentes para evitar duplicações.

O exemplo a seguir considera que `db` é uma conexão do pacote `sqlite3` com métodos de callback, como `db.get()`. Caso o projeto utilize outra biblioteca SQLite, somente o trecho de consulta precisará ser adaptado.

### 3.2. Adicionar a função login

Ao final do arquivo `src/controllers/authController.ts`, **adicione o código abaixo, sem remover a função de cadastro existente**.

```ts
/**
 * Representa os dados necessários para realizar o login.
 *
 * Não precisamos carregar todos os campos da tabela users.
 */
type LoginUser = {
  id: number;
  password_hash: string;
};

/**
 * Realiza a autenticação de um usuário.
 *
 * Recebe e-mail e senha, verifica as credenciais
 * e gera um token JWT quando elas são válidas.
 */
export async function login(
  req: Request,
  res: Response
): Promise<void> {
  // 1. Recebe os dados enviados pelo cliente.
  const { email, password } = req.body ?? {};

  // 2. Verifica se os dados obrigatórios foram enviados.
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    res.status(400).json({
      message: "E-mail e senha são obrigatórios"
    });
    return;
  }

  // 3. Obtém o segredo e o prazo de validade do JWT.
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN;

  // Sem o segredo, não é seguro gerar um token.
  if (!jwtSecret || !jwtExpiresIn) {
    res.status(500).json({
      message: "Erro de configuração do servidor"
    });
    return;
  }

  // 4. Consulta o banco de dados pelo e-mail informado.
  // O símbolo ? indica um parâmetro SQL.
  // Isso evita concatenar dados do usuário na consulta.
  const sql = `
    SELECT id, password_hash
    FROM users
    WHERE email = ?
  `;

  db.get(
    sql,
    [email.trim()],
    async (error: Error | null, user: LoginUser | undefined) => {
      // 5. Verifica se houve erro na consulta.
      if (error) {
        res.status(500).json({
          message: "Erro interno do servidor"
        });
        return;
      }

      // 6. Verifica se o usuário foi encontrado.
      // A mesma mensagem será usada para senha incorreta.
      if (!user) {
        res.status(401).json({
          message: "E-mail ou senha inválidos"
        });
        return;
      }

      try {
        // 7. Compara a senha recebida com o hash armazenado.
        const validPassword = await bcrypt.compare(
          password,
          user.password_hash
        );

        // 8. Rejeita a tentativa se a senha estiver incorreta.
        if (!validPassword) {
          res.status(401).json({
            message: "E-mail ou senha inválidos"
          });
          return;
        }

        // 9. Define o conteúdo do token.
        // Incluímos somente o identificador do usuário.
        const payload = {
          id: user.id
        };

        // 10. Configura o prazo de expiração.
        const options: SignOptions = {
          expiresIn: jwtExpiresIn as SignOptions["expiresIn"],
          algorithm: "HS256"
        };

        // 11. Gera o JWT assinado com o segredo do servidor.
        const token = jwt.sign(
          payload,
          jwtSecret,
          options
        );

        // 12. Retorna o token ao cliente.
        // Não enviamos a senha nem o hash.
        res.status(200).json({
          message: "Login realizado com sucesso",
          token
        });
      } catch {
        // Evita expor detalhes técnicos ao cliente.
        res.status(500).json({
          message: "Erro interno do servidor"
        });
      }
    }
  );
}
```

### 3.3. Entendendo os principais trechos

**Consulta SQL parametrizada**

```ts
const sql = `
  SELECT id, password_hash
  FROM users
  WHERE email = ?
`;
```

A consulta procura o usuário pelo e-mail. O caractere `?` representa um parâmetro cujo valor será fornecido separadamente. Isso ajuda a prevenir SQL Injection.

**Comparação da senha**

```ts
const validPassword = await bcrypt.compare(
  password,
  user.password_hash
);
```

O bcrypt compara a senha recebida com o hash armazenado e retorna um booleano: `true` quando a senha corresponde ao hash e `false` caso contrário.

**Geração do JWT**

```ts
const token = jwt.sign(
  { id: user.id },
  jwtSecret,
  options
);
```

A função `jwt.sign()` recebe três argumentos: os dados que serão incluídos no token (*payload*), o segredo utilizado para assiná-lo e as opções de configuração.

O token contém o identificador do usuário, mas não contém a senha, o hash nem dados sensíveis.

## Passo 4 — Criar a rota de login

**Arquivo a modificar:** `src/routes/authRoutes.ts`

Esse arquivo já deverá conter a rota responsável pelo cadastro de usuários.

**O que fazer:** manter a rota `/register` e adicionar a rota `/login`.

Se a função `login` ainda não estiver importada, inclua-a no import do controller. Por exemplo:

```ts
import { register, login } from "../controllers/authController";
```

Em seguida, acrescente a rota:

```ts
/**
 * POST /api/auth/login
 *
 * Recebe e-mail e senha e executa
 * a função login do authController.
 *
 * Esta é uma rota pública.
 */
router.post("/login", login);
```

O trecho relevante do arquivo ficará semelhante a:

```ts
import { Router } from "express";
import { register, login } from "../controllers/authController";

const router = Router();

// Rota pública para criação de uma conta.
router.post("/register", register);

// Rota pública para autenticação de usuários.
router.post("/login", login);

export default router;
```

Esse exemplo pressupõe que a função de cadastro se chama `register` e que o arquivo exporta o router como padrão. Preserve os nomes e a organização já utilizados no projeto, se forem diferentes.

## Passo 5 — Verificar a configuração do Express

**Arquivo a verificar:** `src/app.ts`

Nesta etapa, provavelmente não será necessário modificar esse arquivo.

Verifique se o Express está configurado para receber JSON e se as rotas de autenticação estão registradas.

O arquivo deverá conter configurações equivalentes a estas:

```ts
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";

const app = express();

// Permite que a API receba dados no formato JSON.
app.use(express.json());

// Configura o CORS conforme a origem permitida no projeto.
// Preserve a configuração já existente.
app.use(cors({
  origin: process.env.CORS_ORIGIN
}));

// Registra as rotas de autenticação.
// O prefixo será acrescentado às rotas de authRoutes.ts.
app.use("/api/auth", authRoutes);

export default app;
```

Não substitua todo o conteúdo de `app.ts` por esse exemplo. Apenas confirme que as configurações necessárias existem e mantenha as demais rotas e middlewares implementados anteriormente.

## Passo 6 — Executar a aplicação

Antes de executar, verifique se:

- O banco SQLite foi inicializado.
- A tabela `users` existe.
- Há pelo menos um usuário cadastrado na Etapa 4.
- O arquivo `.env` contém um `JWT_SECRET` seguro.
- O servidor carrega as variáveis de ambiente antes de atender às requisições.

No terminal, execute o script de desenvolvimento configurado no `package.json`. Por exemplo:

```bash
npm run dev
```

Caso o script esteja configurado para iniciar o servidor na porta 3000, o endpoint estará disponível em:

```http
POST http://localhost:3000/api/auth/login
```

---

## Passo 7 — Testar o login

Utilizaremos Postman, Insomnia ou Thunder Client para testar o endpoint.

### Teste 1 — Login com credenciais válidas

Configure a requisição:

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

**Body — JSON:**

```json
{
  "email": "maria@email.com",
  "password": "12345678"
}
```

O usuário deve ter sido cadastrado previamente com essas credenciais.

**Resultado esperado: HTTP 200 — OK**

```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

O valor apresentado acima é apenas ilustrativo. A aplicação deverá gerar um token real.

### Teste 2 — Senha incorreta

Envie:

```json
{
  "email": "maria@email.com",
  "password": "senhaErrada"
}
```

**Resultado esperado: HTTP 401 — Unauthorized**

```json
{
  "message": "E-mail ou senha inválidos"
}
```

### Teste 3 — E-mail não cadastrado

Envie:

```json
{
  "email": "naoexiste@email.com",
  "password": "12345678"
}
```

**Resultado esperado: HTTP 401 — Unauthorized**

```json
{
  "message": "E-mail ou senha inválidos"
}
```

Observe que a resposta é a mesma utilizada para senha incorreta. Isso evita revelar se determinado e-mail possui uma conta cadastrada.

### Teste 4 — Campos obrigatórios ausentes

Envie:

```json
{
  "email": "maria@email.com"
}
```

**Resultado esperado: HTTP 400 — Bad Request**

```json
{
  "message": "E-mail e senha são obrigatórios"
}
```

### Teste 5 — Verificar o conteúdo do JWT

Após realizar um login válido, copie o token retornado.

Um JWT possui três partes separadas por pontos:

```text
HEADER.PAYLOAD.SIGNATURE
```

- **Header:** algoritmo e tipo do token.
- **Payload:** dados e expiração.
- **Signature:** assinatura.

Você pode decodificar localmente o payload para observar os campos. Um exemplo seria:

```json
{
  "id": 1,
  "iat": 1793100000,
  "exp": 1793103600
}
```

Os campos significam:

- `id`: identificador do usuário autenticado.
- `iat`: momento em que o token foi emitido.
- `exp`: momento em que o token expirará.

Os valores `iat` e `exp` são representados como timestamps Unix, em segundos. Nesse exemplo, a diferença é de 3.600 segundos, equivalente a uma hora.

**Atenção:** o payload de um JWT assinado não é criptografado. Ele pode ser lido por qualquer pessoa que possua o token. Por isso, não devemos incluir senhas ou dados sensíveis. Decodificar o token também não significa validar sua assinatura — essa validação será feita na próxima etapa.

## Passo 8 — Conferir os resultados

### Checklist da Etapa 5

- [ ] A biblioteca `jsonwebtoken` está instalada.
- [ ] As variáveis `JWT_SECRET` e `JWT_EXPIRES_IN` estão configuradas.
- [ ] A função `login` foi adicionada ao `authController.ts`.
- [ ] A rota `POST /api/auth/login` foi adicionada ao `authRoutes.ts`.
- [ ] O login válido retorna HTTP 200 e um JWT.
- [ ] Credenciais incorretas retornam HTTP 401.
- [ ] Campos ausentes retornam HTTP 400.
- [ ] Nenhuma senha ou hash é retornado ao cliente.

## 9. Resultado da Etapa 5

Ao concluir a implementação, a API terá dois endpoints públicos de autenticação:

| Método | Endpoint | Finalidade |
|---|---|---|
| POST | `/api/auth/register` | Cadastrar usuários (Etapa 4) |
| POST | `/api/auth/login` | Autenticar usuários (Etapa 5) |

O sistema já conseguirá verificar as credenciais e gerar tokens JWT assinados com prazo de expiração.

A próxima etapa será a **Etapa 6 — Rotas protegidas**, na qual implementaremos o `authMiddleware.ts` para validar o token recebido no cabeçalho `Authorization: Bearer TOKEN`, identificar o usuário no banco de dados e permitir que ele consulte, atualize ou exclua sua própria conta.

Dessa forma, manteremos a evolução incremental prevista no `AGENTS.md`, sem introduzir antecipadamente funcionalidades administrativas ou complexidade arquitetural desnecessária.
