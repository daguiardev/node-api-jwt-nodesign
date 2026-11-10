# Etapa 2 — Organização inicial do projeto

Nesta etapa, vamos organizar o código desenvolvido na **Etapa 1 — Ambiente e primeiro servidor**, separando as responsabilidades dos arquivos, configurando o CORS e utilizando variáveis de ambiente.

O tutorial segue as orientações do `AGENTS.md`, especialmente a simplicidade arquitetural, o desenvolvimento incremental e a utilização de comentários didáticos.

**Objetivo:** ao final, teremos uma API REST organizada, capaz de receber requisições HTTP e retornar JSON, sem implementar ainda banco de dados, autenticação ou JWT.

## 1. O que vamos implementar

A Etapa 2 contempla quatro atividades:

1. Criar os diretórios necessários à organização inicial.
2. Separar a configuração da aplicação, as rotas e os controllers.
3. Configurar o CORS para permitir requisições de uma aplicação cliente.
4. Configurar variáveis de ambiente com `dotenv`.

### Estrutura esperada ao final

```text
projeto/
├── src/
│   ├── controllers/
│   │   └── testController.ts
│   ├── routes/
│   │   └── testRoutes.ts
│   ├── app.ts
│   └── server.ts
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── AGENTS.md
```

Os arquivos `testController.ts` e `testRoutes.ts` são temporários e didáticos: servem para demonstrar a separação de responsabilidades do endpoint de teste da Etapa 1. Posteriormente, poderão ser substituídos pelos arquivos de autenticação e usuários previstos no `AGENTS.md`.

Ainda não criaremos `database/`, `middlewares/` ou `data/`, porque esses diretórios serão necessários somente nas próximas etapas.

## 2. Criar os diretórios iniciais

Abra o terminal na raiz do projeto, onde está localizado o arquivo `package.json`.

Execute em um terminal compatível com Bash:

```bash
mkdir -p src/controllers src/routes
```

No PowerShell, se preferir:

```powershell
New-Item -ItemType Directory -Force src/controllers, src/routes
```

Se os diretórios já existirem, não será necessário criá-los novamente.

### Por que separar os diretórios?

- `controllers/`: contém funções responsáveis por processar as requisições e construir as respostas.
- `routes/`: define os endpoints HTTP e associa cada endpoint à função responsável por atendê-lo.

Essa organização evita concentrar toda a aplicação em um único arquivo.

## 3. Criar o primeiro controller

**Arquivo:** `src/controllers/testController.ts`  
**Ação:** criar o arquivo e adicionar o código abaixo.

```ts
import { Request, Response } from "express";

/**
 * Controller responsável pelo endpoint de teste.
 *
 * Um controller recebe uma requisição HTTP,
 * executa o processamento necessário e
 * devolve uma resposta ao cliente.
 */
export function testController(
  req: Request,
  res: Response
): void {
  // Retorna uma resposta HTTP 200 (OK)
  // contendo um objeto JSON.
  res.status(200).json({
    message: "API funcionando corretamente!"
  });
}
```

### Entendendo o código

A instrução `import { Request, Response } from "express";` importa os tipos utilizados pelo Express:

- `Request`: representa a requisição enviada pelo cliente.
- `Response`: representa a resposta que o servidor enviará.

A função `testController()` recebe esses dois objetos. O método `res.status(200)` define o código HTTP da resposta, enquanto `res.json()` envia os dados no formato JSON.

O tipo de retorno `void` indica que a função não retorna um valor TypeScript. A resposta HTTP é enviada por meio do objeto `res`.

Observe que o controller **não define a URL do endpoint**. Essa responsabilidade será atribuída ao arquivo de rotas.

## 4. Criar o arquivo de rotas

**Arquivo:** `src/routes/testRoutes.ts`  
**Ação:** criar o arquivo e adicionar:

```ts
import { Router } from "express";

// Importa a função responsável por processar
// as requisições do endpoint de teste.
import { testController } from "../controllers/testController";

// Cria um objeto Router, utilizado para
// organizar as rotas da aplicação.
const router = Router();

/**
 * Define uma rota HTTP GET.
 *
 * Quando o cliente acessar o caminho "/",
 * a função testController será executada.
 *
 * O prefixo da URL será definido em app.ts.
 */
router.get("/", testController);

// Exporta o conjunto de rotas para ser
// utilizado em outros arquivos.
export default router;
```

### Entendendo a separação

| Arquivo | Responsabilidade |
|---|---|
| `testRoutes.ts` | Determinar qual função atende uma URL |
| `testController.ts` | Processar a requisição e enviar a resposta |

Quando o cliente acessar `GET /api/test`, o Express identificará a rota e executará `testController()`.

## 5. Configurar o CORS

CORS (*Cross-Origin Resource Sharing*) é um mecanismo que permite ao servidor informar quais origens podem acessar seus recursos por meio de navegadores.

Por exemplo, futuramente poderemos ter:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:4200`

Como as origens são diferentes, o navegador aplica regras de CORS às requisições feitas pelo frontend.

### 5.1. Instalar a biblioteca

No terminal, execute:

```bash
npm install cors
npm install -D @types/cors
```

A primeira biblioteca implementa o middleware de CORS. A segunda fornece as definições de tipos necessárias ao TypeScript. Se essas dependências já estiverem instaladas, não é necessário instalá-las novamente.

### 5.2. Configurar as variáveis de ambiente

Também utilizaremos `dotenv`, que permite carregar configurações a partir de um arquivo `.env`.

```bash
npm install dotenv
```

### Arquivo `.env.example`

**Ação:** criar o arquivo na raiz do projeto e adicionar:

```dotenv
# Porta utilizada pelo servidor HTTP
PORT=3000

# Origem autorizada para requisições CORS
CORS_ORIGIN=http://localhost:4200

# Configurações reservadas para etapas futuras
JWT_SECRET=altere-este-segredo
JWT_EXPIRES_IN=1h
DATABASE_PATH=./data/database.sqlite
```

Os três últimos valores estão documentados conforme o `AGENTS.md`, mas ainda não serão utilizados. O JWT e o SQLite serão configurados nas etapas correspondentes.

### Arquivo `.env`

**Ação:** criar o arquivo na raiz do projeto e adicionar:

```dotenv
# Configuração local do servidor
PORT=3000

# Origem permitida pelo CORS
CORS_ORIGIN=http://localhost:4200
```

O `.env` contém as configurações locais da aplicação e não deve ser enviado ao Git.

### Arquivo `.gitignore`

**Ação:** manter as entradas existentes e adicionar as seguintes linhas, caso ainda não existam:

```gitignore
# Dependências instaladas pelo npm
node_modules/

# Arquivos compilados do TypeScript
dist/

# Configurações locais e segredos
.env

# Banco de dados SQLite
data/*.sqlite
data/*.sqlite-*
```

Não remova outras configurações que já existam no arquivo.

## 6. Organizar a configuração do Express

**Arquivo:** `src/app.ts`  
**Ação:** criar o arquivo, caso ainda não exista. Se já existir, substituir a configuração anterior do Express pelo código abaixo, preservando configurações adicionais necessárias.

```ts
import express from "express";
import cors from "cors";

// Importa as rotas de teste.
import testRoutes from "./routes/testRoutes";

// Cria a aplicação Express.
const app = express();

/**
 * Configuração do CORS.
 *
 * A variável CORS_ORIGIN define qual origem
 * poderá acessar a API por meio do navegador.
 */
const corsOrigin =
  process.env.CORS_ORIGIN || "http://localhost:4200";

app.use(cors({
  origin: corsOrigin
}));

/**
 * Middleware para interpretar JSON.
 *
 * Permite que a aplicação receba dados JSON
 * no corpo das requisições HTTP.
 */
app.use(express.json());

/**
 * Registra as rotas de teste.
 *
 * Todas as rotas definidas em testRoutes
 * receberão o prefixo "/api/test".
 */
app.use("/api/test", testRoutes);

// Exporta a aplicação Express.
// O servidor HTTP será iniciado em server.ts.
export default app;
```

### Entendendo os middlewares

O método `app.use()` registra funcionalidades que participam do processamento das requisições.

- `app.use(cors(...))` configura as permissões de acesso entre origens diferentes.
- `app.use(express.json())` permite que o Express interprete corpos de requisições no formato JSON.
- `app.use("/api/test", testRoutes)` conecta o conjunto de rotas à aplicação.

A combinação do prefixo `/api/test` com o caminho `/` definido em `testRoutes.ts` produz o endpoint `GET /api/test`.

## 7. Organizar a inicialização do servidor

**Arquivo:** `src/server.ts`  
**Ação:** substituir o conteúdo anterior de inicialização do servidor pelo código abaixo.

Se o arquivo da Etapa 1 contiver a rota de teste, remova essa definição, pois ela agora pertence a `testRoutes.ts` e `testController.ts`.

```ts
// Carrega as variáveis definidas no arquivo .env
// para process.env antes de importar a aplicação.
import "dotenv/config";

// Importa a aplicação Express já configurada.
import app from "./app";

/**
 * Define a porta utilizada pelo servidor.
 *
 * Primeiro tenta utilizar a variável PORT.
 * Se ela não existir, utiliza a porta 3000.
 */
const PORT = Number(process.env.PORT) || 3000;

/**
 * Inicia o servidor HTTP.
 *
 * A função de callback será executada
 * quando o servidor começar a escutar
 * as requisições na porta configurada.
 */
app.listen(PORT, () => {
  console.log(
    `Servidor executando em http://localhost:${PORT}`
  );
});
```

### Por que separar `app.ts` e `server.ts`?

O arquivo `app.ts` **configura a aplicação**: middlewares, rotas e comportamento do Express.

O arquivo `server.ts` **inicia o servidor HTTP** e define a porta em que a aplicação ficará disponível.

Essa divisão permite modificar a configuração da aplicação sem alterar a lógica de inicialização do servidor.

## 8. Conferir as configurações do TypeScript

**Arquivo:** `tsconfig.json`  
**Ação:** verificar as configurações existentes. Não é necessário substituir todo o arquivo se ele já estiver funcionando.

Para os exemplos deste tutorial, as seguintes opções são importantes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

O formato JSON não aceita comentários tradicionais. Por isso, explicamos as opções separadamente.

| Configuração | Finalidade |
|---|---|
| `target` | Define a versão do JavaScript gerado |
| `module` | Define o sistema de módulos |
| `rootDir` | Indica onde está o código TypeScript |
| `outDir` | Indica onde será colocado o JavaScript compilado |
| `strict` | Habilita verificações mais rigorosas de tipos |
| `esModuleInterop` | Facilita a importação de bibliotecas como Express |
| `include` | Indica quais arquivos serão compilados |

Se a Etapa 1 já utiliza outra configuração de módulos e funciona corretamente, preserve-a e adapte os exemplos conforme necessário.

## 9. Conferir o arquivo `package.json`

**Arquivo:** `package.json`  
**Ação:** localizar a propriedade `scripts` e conferir os comandos de execução.

Caso a Etapa 1 utilize `tsx`, uma configuração possível é:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

Adicione ou ajuste apenas as entradas necessárias dentro de `scripts`, sem apagar as demais propriedades do `package.json`.

Caso ainda não tenha instalado `tsx`, execute:

```bash
npm install -D tsx
```

Esse pacote permite executar arquivos TypeScript diretamente durante o desenvolvimento, sem a necessidade de compilá-los manualmente a cada alteração.

## 10. Executar e testar a aplicação

### 10.1. Iniciar o servidor

No terminal, execute:

```bash
npm run dev
```

A saída esperada será semelhante a:

```text
Servidor executando em http://localhost:3000
```

### 10.2. Testar o endpoint

Abra o navegador e acesse:

`http://localhost:3000/api/test`

O resultado esperado é:

```json
{
  "message": "API funcionando corretamente!"
}
```

Esse teste demonstra que o Express conseguiu receber uma requisição HTTP, localizar a rota, executar o controller e retornar JSON.

### 10.3. Testar com Postman ou Thunder Client

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `http://localhost:3000/api/test` |
| Body | Nenhum |
| Status esperado | `200 OK` |

### 10.4. Verificar o CORS

No Postman ou Thunder Client, adicione o cabeçalho:

```http
Origin: http://localhost:4200
```

Na resposta, verifique se aparece:

```http
Access-Control-Allow-Origin: http://localhost:4200
```

Repita o teste com outra origem, por exemplo `http://localhost:5000`. Ela não deverá receber a autorização de origem configurada.

**Importante:** CORS é uma política aplicada pelos navegadores. Ele não substitui autenticação nem impede que clientes como Postman façam requisições diretamente à API.

### 10.5. Testar a compilação

Encerre o servidor de desenvolvimento com `Ctrl + C` e execute:

```bash
npm run build
```

Se não houver erros, execute:

```bash
npm start
```

O servidor deverá iniciar normalmente utilizando o JavaScript compilado.

## 11. Compreendendo o fluxo da requisição

```text
Cliente HTTP
    |
    | GET /api/test
    v
Servidor iniciado por server.ts
    |
    v
app.ts
    | Configura CORS, JSON e rotas
    v
testRoutes.ts
    | Associa GET / à função
    v
testController.ts
    | Retorna HTTP 200 e JSON
    v
Cliente recebe a resposta
```

O servidor é iniciado previamente. Quando uma requisição chega à aplicação, o Express executa os middlewares configurados, identifica a rota correspondente e chama o controller. O controller constrói a resposta JSON enviada ao cliente.

## 12. Checklist de conclusão

- [ ] Os diretórios `controllers` e `routes` foram criados.
- [ ] O controller de teste está separado das rotas.
- [ ] O arquivo `app.ts` configura o Express e os middlewares.
- [ ] O arquivo `server.ts` inicia o servidor HTTP.
- [ ] O CORS está configurado utilizando uma variável de ambiente.
- [ ] O arquivo `.env` está protegido pelo `.gitignore`.
- [ ] O endpoint `GET /api/test` retorna JSON e status 200.
- [ ] A compilação TypeScript funciona sem erros.

## 13. O que não implementaremos agora

Seguindo o desenvolvimento incremental previsto no `AGENTS.md`, esta etapa não incluirá conexão SQLite, criação de tabelas, CRUD de usuários, bcrypt, JWT ou middlewares de autenticação e autorização.

Esses recursos serão introduzidos quando os estudantes já tiverem compreendido a organização da aplicação.

**Resultado esperado:** ao concluir a Etapa 2, teremos um backend Node.js com TypeScript e Express organizado em arquivos de configuração, rotas e controllers, preparado para receber a implementação do SQLite na **Etapa 3 — Banco de dados**.
