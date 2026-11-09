# API REST com Node.js, TypeScript, SQLite e JWT

Projeto didático de desenvolvimento de uma **API REST para gerenciamento de usuários**, utilizando Node.js, TypeScript, Express, SQLite e autenticação com JSON Web Token (JWT).

A aplicação será desenvolvida progressivamente no contexto da disciplina de **Programação para Internet**, com foco na aprendizagem dos fundamentos do desenvolvimento web backend.

## 1. Sobre o projeto

O objetivo deste projeto é implementar uma API REST que permita realizar operações de cadastro, consulta, atualização e exclusão de usuários, além de implementar mecanismos de autenticação e autorização.

A aplicação funcionará exclusivamente como **backend**, disponibilizando endpoints HTTP que poderão ser consumidos por diferentes aplicações clientes.

A comunicação será realizada utilizando o formato **JSON (JavaScript Object Notation)**.

Não será desenvolvida uma interface gráfica nesta etapa.

### Objetivos de aprendizagem

Ao longo do desenvolvimento, os estudantes terão a oportunidade de aprender:

- Os fundamentos do desenvolvimento web backend.
- O funcionamento do Node.js e do framework Express.
- A criação de APIs REST.
- O protocolo HTTP e seus principais métodos.
- O envio e recebimento de dados JSON.
- A utilização de códigos de resposta HTTP.
- A persistência de dados em bancos relacionais.
- A implementação de operações CRUD.
- O armazenamento seguro de senhas.
- Os conceitos de autenticação e autorização.
- A utilização de JWT.
- A criação e utilização de middlewares.
- A organização básica de projetos backend.

O desenvolvimento será realizado de maneira **incremental**, priorizando a compreensão dos conceitos e a simplicidade das implementações.

## 2. Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Node.js | Ambiente de execução JavaScript no servidor |
| TypeScript | Linguagem utilizada no desenvolvimento da aplicação |
| Express | Framework para criação do servidor HTTP e das rotas da API |
| SQLite | Banco de dados relacional |
| bcrypt | Geração e verificação de hashes de senhas |
| JWT | Autenticação por meio de tokens |
| CORS | Configuração de acesso à API por aplicações de outras origens |
| dotenv | Gerenciamento de variáveis de ambiente |

## 3. Funcionalidades

A aplicação implementará um sistema de gerenciamento de usuários com três níveis conceituais de acesso.

### Visitante

Representa uma pessoa que ainda não está autenticada no sistema.

Poderá:

- Criar uma conta.
- Realizar login.

Todo usuário cadastrado publicamente receberá automaticamente o papel `user`.

### Usuário comum (`user`)

Representa um usuário autenticado.

Poderá:

- Consultar seus próprios dados.
- Atualizar sua própria conta.
- Excluir sua própria conta.

Não poderá consultar, modificar ou excluir contas de outros usuários.

### Administrador (`admin`)

Representa um usuário autenticado com permissões administrativas.

Poderá:

- Consultar, atualizar e excluir sua própria conta.
- Listar todos os usuários cadastrados.
- Consultar usuários pelo identificador.
- Atualizar dados de outros usuários.
- Excluir contas de outros usuários.

As operações administrativas serão protegidas por mecanismos de autenticação e autorização.

## 4. Estrutura do projeto

A organização inicial será propositalmente simples, facilitando a compreensão das responsabilidades de cada arquivo.

```text
projeto/
├── src/
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── userController.ts
│   │
│   ├── database/
│   │   ├── database.ts
│   │   └── init.ts
│   │
│   ├── middlewares/
│   │   ├── authMiddleware.ts
│   │   └── adminMiddleware.ts
│   │
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   └── userRoutes.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── data/
│   └── database.sqlite
│
├── .env
├── .env.example
├── .gitignore
├── AGENTS.md
├── package.json
├── tsconfig.json
└── README.md
```

**Responsabilidades dos principais diretórios:**

- `controllers/`: funções responsáveis por processar requisições e retornar respostas HTTP.
- `database/`: configuração da conexão com SQLite e inicialização do banco de dados.
- `middlewares/`: verificações de autenticação e autorização.
- `routes/`: definição dos endpoints da API.
- `app.ts`: configuração da aplicação Express.
- `server.ts`: inicialização do servidor HTTP.
- `data/`: armazenamento do arquivo do banco de dados SQLite.

Os arquivos e diretórios serão criados gradualmente, conforme a evolução das atividades.

## 5. Modelo de dados

Inicialmente, o banco de dados possuirá apenas uma tabela denominada `users`.

| Campo | Descrição |
|---|---|
| `id` | Identificador único do usuário |
| `name` | Nome do usuário |
| `email` | Endereço de e-mail único |
| `password_hash` | Hash da senha |
| `role` | Papel do usuário (`user` ou `admin`) |
| `created_at` | Data de criação do registro |
| `updated_at` | Data da última atualização |

As senhas nunca serão armazenadas em texto puro.

## 6. Endpoints da API

A API disponibilizará os seguintes endpoints:

### Autenticação

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastrar usuário |
| POST | `/api/auth/login` | Autenticar usuário |

### Gerenciamento da própria conta

Estas operações exigem autenticação.

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/users/me` | Consultar própria conta |
| PUT | `/api/users/me` | Atualizar própria conta |
| DELETE | `/api/users/me` | Excluir própria conta |

### Administração

Estas operações exigem autenticação e permissão de administrador.

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/users` | Listar usuários |
| GET | `/api/users/:id` | Consultar usuário pelo ID |
| PUT | `/api/users/:id` | Atualizar usuário |
| DELETE | `/api/users/:id` | Excluir usuário |

## 7. Exemplos de utilização

Os exemplos a seguir ilustram como a API deverá funcionar após a implementação dos respectivos endpoints.

### 7.1. Cadastro de usuário

**Requisição:**

```http
POST /api/auth/register
Content-Type: application/json
```

**Corpo da requisição:**

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "12345678"
}
```

O sistema validará os dados, verificará se o e-mail já está cadastrado e armazenará o hash da senha.

O novo usuário receberá automaticamente o papel `user`.

### 7.2. Login

**Requisição:**

```http
POST /api/auth/login
Content-Type: application/json
```

**Corpo da requisição:**

```json
{
  "email": "maria@email.com",
  "password": "12345678"
}
```

Após validar as credenciais, o servidor retornará um token JWT.

### 7.3. Acesso a uma rota protegida

Para acessar uma rota protegida, o cliente deverá enviar o token JWT no cabeçalho HTTP:

```http
GET /api/users/me
Authorization: Bearer SEU_TOKEN_JWT
```

O servidor verificará a validade do token antes de permitir o acesso.

## 8. Configuração do ambiente

### Pré-requisitos

Para desenvolver e executar a aplicação, será necessário instalar:

- Node.js e npm.
- Git.
- Um editor de código, como Visual Studio Code.
- Uma ferramenta para testar APIs, como Postman, Insomnia ou Thunder Client.

### Clonar o repositório

Após criar ou obter o endereço do repositório no GitHub, execute:

```bash
git clone URL_DO_REPOSITORIO
```

Acesse o diretório:

```bash
cd NOME_DO_REPOSITORIO
```

### Instalar dependências

Quando o arquivo `package.json` estiver configurado, execute:

```bash
npm install
```

Esse comando instalará as dependências declaradas no projeto.

### Configurar variáveis de ambiente

Crie um arquivo `.env` a partir do `.env.example`, utilizando inicialmente as seguintes configurações:

```env
PORT=3000
JWT_SECRET=altere-este-segredo
JWT_EXPIRES_IN=1h
DATABASE_PATH=./data/database.sqlite
CORS_ORIGIN=http://localhost:4200
```

O valor de `JWT_SECRET` deverá ser substituído por um segredo forte.

**Importante:** o arquivo `.env` não deverá ser enviado ao repositório Git.

### Executar a aplicação

Os comandos de inicialização serão documentados após a configuração dos scripts no `package.json`, durante as primeiras etapas de desenvolvimento.

## 9. Segurança

Mesmo sendo um projeto didático, serão adotadas práticas essenciais de segurança:

- Armazenamento de senhas utilizando bcrypt.
- Autenticação por JWT com prazo de expiração.
- Proteção de rotas por middlewares.
- Verificação de permissões no backend.
- Consultas SQL parametrizadas.
- Validação dos dados recebidos.
- Proteção das variáveis de ambiente.
- Restrição de operações administrativas.
- Não exposição de senhas ou hashes nas respostas da API.

O cadastro público não permitirá que um usuário escolha o papel de administrador.

A criação do primeiro administrador será realizada por um procedimento local, sem disponibilizar uma rota pública para essa finalidade.

## 10. Testes da API

Inicialmente, os testes serão realizados manualmente por meio de ferramentas como:

- Postman.
- Insomnia.
- Thunder Client.

Serão verificados cenários como cadastro, login, atualização e exclusão de usuários, além de tentativas de acesso sem autenticação ou sem as permissões necessárias.

Testes automatizados poderão ser introduzidos posteriormente.

## 11. Etapas de desenvolvimento

O projeto será implementado gradualmente, acompanhando a evolução dos conteúdos da disciplina.

| Etapa | Conteúdo |
|---|---|
| 1 | Configuração do ambiente e primeiro servidor HTTP |
| 2 | Organização inicial, rotas, controllers e CORS |
| 3 | Banco de dados SQLite |
| 4 | Cadastro de usuários e bcrypt |
| 5 | Login e geração de JWT |
| 6 | Autenticação e gerenciamento da própria conta |
| 7 | Autorização e operações administrativas |
| 8 | Revisão, testes e documentação |

Cada etapa buscará produzir uma versão funcional da aplicação, sempre que possível.

## 12. Evolução futura

A arquitetura inicial foi planejada para facilitar o aprendizado.

Conforme os estudantes avançarem, o projeto poderá incorporar conceitos e ferramentas como:

- Orientação a objetos.
- Camadas de services e repositories.
- Princípios SOLID.
- Validações mais elaboradas.
- Testes automatizados.
- Documentação OpenAPI/Swagger.
- Tratamento centralizado de erros.

Essas melhorias não fazem parte do escopo inicial e serão consideradas conforme a evolução da disciplina.

## 13. Orientações para desenvolvimento

Este repositório possui um arquivo [AGENTS.md](./AGENTS.md), que estabelece as orientações técnicas e didáticas do projeto.

As implementações devem priorizar:

1. Segurança essencial.
2. Funcionamento correto.
3. Facilidade de compreensão.
4. Simplicidade do código.
5. Organização básica.
6. Facilidade de manutenção.
7. Evolução gradual da arquitetura.

O foco principal é compreender como cada componente de uma aplicação backend funciona e como eles se relacionam.

---

**Projeto desenvolvido para fins educacionais**, como material de apoio ao ensino de Programação para Internet e desenvolvimento web backend.