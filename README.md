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

A API utiliza JWT.

Após realizar login, o cliente deverá enviar o token nas requisições protegidas:

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
| POST | /api/auth/register | Público | Cadastrar usuário |
| POST | /api/auth/login | Público | Realizar login |
| GET | /api/users/me | Autenticado | Consultar própria conta |
| PUT | /api/users/me | Autenticado | Atualizar própria conta |
| DELETE | /api/users/me | Autenticado | Excluir própria conta |
| GET | /api/users | Admin | Listar usuários |
| GET | /api/users/:id | Admin | Consultar usuário |
| PUT | /api/users/:id | Admin | Atualizar usuário |
| DELETE | /api/users/:id | Admin | Excluir usuário |

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

Os endpoints podem ser testados manualmente utilizando Postman, Insomnia ou Thunder Client.

Os testes devem contemplar cadastro, login, autenticação, autorização, operações CRUD e tratamento de erros.

## Observações

Este é um projeto didático. A arquitetura foi mantida simples para facilitar a compreensão dos conceitos fundamentais de desenvolvimento backend.