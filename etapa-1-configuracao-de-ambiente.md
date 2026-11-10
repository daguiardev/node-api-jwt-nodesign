# Etapa 1 — Ambiente e primeiro servidor HTTP com Node.js, TypeScript e Express

Este tutorial apresenta a primeira etapa do desenvolvimento da API REST de gerenciamento de usuários, seguindo as orientações do `AGENTS.md`.

O objetivo é construir uma aplicação backend simples, utilizando **Node.js, TypeScript e Express**, capaz de receber uma requisição HTTP e retornar uma resposta JSON. Banco de dados, autenticação, JWT e arquiteturas mais elaboradas serão abordados em etapas posteriores.

## 1. Objetivos de aprendizagem

Ao concluir esta etapa, o estudante deverá ser capaz de:

1. Preparar o ambiente de desenvolvimento com Node.js e npm.
2. Criar e inicializar um projeto Node.js.
3. Compreender a função do arquivo `package.json`.
4. Instalar e configurar TypeScript e Express.
5. Criar um servidor HTTP utilizando Express.
6. Implementar um endpoint com o método GET.
7. Retornar dados no formato JSON.
8. Executar e testar a aplicação.

## 2. Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Node.js | Executar JavaScript no servidor |
| npm | Gerenciar bibliotecas e scripts do projeto |
| TypeScript | Adicionar tipagem estática ao JavaScript |
| Express | Simplificar a criação do servidor HTTP e das rotas |
| Visual Studio Code | Editar os arquivos do projeto |
| Navegador ou Postman | Testar o endpoint HTTP |

## 3. Preparação do ambiente de desenvolvimento

### Passo 1 — Instalar o Node.js

Acesse o site oficial: https://nodejs.org/

Baixe a versão **LTS (Long Term Support)**, recomendada para aplicações que precisam de maior estabilidade.

Durante a instalação no Windows, mantenha as configurações padrão e verifique se o Node.js será adicionado à variável de ambiente `PATH`.

Após instalar, abra um novo terminal (PowerShell, Prompt de Comando ou terminal do VS Code) e execute:

```bash
node --version
```

O comando deverá exibir a versão instalada do Node.js. Em seguida, execute:

```bash
npm --version
```

O npm é instalado juntamente com o Node.js.

**Por que precisamos dos dois?** O Node.js executará nossa aplicação. O npm será utilizado para instalar as bibliotecas necessárias, como o Express e o TypeScript.

### Passo 2 — Instalar o Visual Studio Code

Acesse https://code.visualstudio.com/ e instale o editor.

Abra seu terminal integrado pelo menu **Terminal → New Terminal**. Todos os comandos apresentados neste tutorial poderão ser executados nesse terminal.

## 4. Criar e inicializar o projeto

### Passo 3 — Criar o diretório

Escolha um local no computador onde deseja armazenar o projeto. No terminal, execute:

```bash
mkdir api-usuarios
cd api-usuarios
```

O primeiro comando cria o diretório `api-usuarios`. O segundo acessa esse diretório.

Para abrir o projeto no VS Code, execute:

```bash
code .
```

O ponto (`.`) indica o diretório atual. Caso o comando `code` não esteja disponível, abra o VS Code e selecione **File → Open Folder**, escolhendo o diretório criado.

### Passo 4 — Inicializar o projeto Node.js

No terminal do VS Code, execute:

```bash
npm init -y
```

**Arquivo criado:** `package.json`.

O arquivo armazena informações sobre o projeto, como nome, versão, dependências e comandos de execução.

Um exemplo inicial:

```json
{
  "name": "api-usuarios",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "license": "ISC"
}
```

Não precisamos editar esse arquivo neste momento. Faremos isso depois de instalar as dependências.

## 5. Instalar as dependências

### Passo 5 — Instalar o Express

Execute:

```bash
npm install express
```

O Express é um framework para Node.js que facilita a criação de servidores e APIs HTTP. Ele fornece recursos para definir rotas, processar requisições e enviar respostas.

Após a instalação, observe que:

- O arquivo `package.json` recebe a dependência `express`.
- O arquivo `package-lock.json` é criado ou atualizado.
- O diretório `node_modules` é criado para armazenar as bibliotecas instaladas.

Não precisamos editar manualmente esses arquivos.

### Passo 6 — Instalar o TypeScript

Execute:

```bash
npm install --save-dev typescript @types/node @types/express
```

Estamos instalando três pacotes:

| Pacote | Função |
|---|---|
| `typescript` | Compilar código TypeScript para JavaScript |
| `@types/node` | Fornecer definições de tipos do Node.js |
| `@types/express` | Fornecer definições de tipos do Express |

A opção `--save-dev` indica que esses pacotes são dependências de desenvolvimento.

### Passo 7 — Instalar o tsx

Execute:

```bash
npm install --save-dev tsx
```

O `tsx` permite executar arquivos TypeScript diretamente durante o desenvolvimento, sem precisar compilá-los manualmente a cada alteração.

Utilizaremos também o modo `watch`, que reinicia automaticamente o servidor quando o código for modificado. Isso facilita os exercícios realizados em sala de aula.

## 6. Configurar o TypeScript

### Passo 8 — Criar o arquivo de configuração

Execute:

```bash
npx tsc --init
```

**Arquivo criado:** `tsconfig.json`.

Esse arquivo determina como o compilador TypeScript deverá interpretar e transformar o código.

**O que modificar:**

1. Abra `tsconfig.json`.
2. Remova todo o conteúdo existente.
3. Adicione a configuração abaixo.

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
  "include": ["src/**/*.ts"]
}
```

O formato JSON não permite comentários tradicionais. Por isso, vamos explicar as propriedades separadamente.

| Propriedade | Explicação |
|---|---|
| `target` | Define a versão do JavaScript gerado |
| `module` | Utiliza o sistema de módulos CommonJS |
| `moduleResolution` | Define como os módulos são encontrados |
| `rootDir` | Indica onde ficará nosso código TypeScript |
| `outDir` | Indica onde ficará o JavaScript compilado |
| `strict` | Ativa verificações mais rigorosas de tipos |
| `esModuleInterop` | Facilita a importação de bibliotecas como Express |
| `skipLibCheck` | Evita verificar tipos internos das bibliotecas |
| `include` | Indica quais arquivos TypeScript serão compilados |

**Importante:** o diretório `dist` será criado quando compilarmos a aplicação. Não precisamos criá-lo manualmente.

## 7. Criar a estrutura inicial do projeto

### Passo 9 — Criar o diretório src

Na raiz do projeto, crie um diretório chamado `src`. Podemos utilizar o explorador de arquivos do VS Code ou executar:

```bash
mkdir src
```

Dentro dele, criaremos inicialmente apenas dois arquivos:

- `src/app.ts`: configura a aplicação Express e define nosso endpoint.
- `src/server.ts`: inicia o servidor HTTP.

Essa divisão já está prevista no `AGENTS.md` e será mantida nas próximas etapas.

**Estrutura do projeto até aqui:**

```text
api-usuarios/
├── node_modules/
├── src/
│   ├── app.ts
│   └── server.ts
├── package.json
├── package-lock.json
└── tsconfig.json
```

Não criaremos ainda os diretórios `controllers`, `routes`, `middlewares` e `database`. Eles serão adicionados quando forem necessários.

## 8. Criar a aplicação Express

### Passo 10 — Implementar app.ts

**Arquivo:** `src/app.ts`.

**O que fazer:** crie o arquivo, caso ainda não exista, e adicione o seguinte código:

```typescript
import express, { Request, Response } from "express";

// Cria uma aplicação utilizando o framework Express.
const app = express();

/*
 * Define uma rota HTTP.
 *
 * Método: GET
 * Caminho: /
 *
 * Essa função será executada quando um cliente
 * enviar uma requisição GET para a raiz da API.
 */
app.get("/", (req: Request, res: Response) => {

  // Retorna uma resposta HTTP no formato JSON.
  res.status(200).json({
    message: "Minha primeira API com Node.js e Express!"
  });

});

// Disponibiliza a aplicação para outros arquivos.
export default app;
```

### Entendendo o código

**1. Importação do Express**

```typescript
import express, { Request, Response } from "express";
```

Importamos o framework Express e dois tipos do TypeScript:

- `Request`: representa a requisição enviada pelo cliente.
- `Response`: representa a resposta que o servidor enviará ao cliente.

**2. Criação da aplicação**

```typescript
const app = express();
```

A função `express()` cria nossa aplicação. A variável `app` será utilizada para configurar as rotas e outros recursos do servidor.

**3. Definição da rota**

```typescript
app.get("/", (req: Request, res: Response) => {
```

Esse comando informa ao Express que, quando chegar uma requisição HTTP `GET` para `/`, uma função deverá ser executada.

O primeiro parâmetro, `req`, contém informações da requisição. O segundo, `res`, permite construir e enviar a resposta.

**4. Retorno JSON**

```typescript
res.status(200).json({
  message: "Minha primeira API com Node.js e Express!"
});
```

O método `status(200)` define o código HTTP de sucesso. O método `json()` transforma o objeto JavaScript em uma resposta JSON, incluindo o cabeçalho `Content-Type: application/json`.

**5. Exportação**

```typescript
export default app;
```

Permite utilizar a aplicação Express em outro arquivo, que será responsável por iniciar o servidor.

## 9. Criar o servidor HTTP

### Passo 11 — Implementar server.ts

**Arquivo:** `src/server.ts`.

**O que fazer:** crie o arquivo e adicione:

```typescript
// Importa a aplicação Express configurada em app.ts.
import app from "./app";

// Define a porta na qual o servidor receberá requisições.
const PORT: number = 3000;

/*
 * Inicia o servidor HTTP.
 *
 * O método listen faz a aplicação aguardar
 * requisições na porta especificada.
 */
app.listen(PORT, () => {

  // Exibe uma mensagem quando o servidor iniciar.
  console.log(`Servidor executando em http://localhost:${PORT}`);

});
```

### Entendendo o código

O comando:

```typescript
import app from "./app";
```

Importa a aplicação Express que criamos no arquivo anterior.

A variável:

```typescript
const PORT: number = 3000;
```

Define a porta de comunicação. O tipo `number` indica que a variável deverá armazenar um número.

Por fim:

```typescript
app.listen(PORT, () => {
  console.log(`Servidor executando em http://localhost:${PORT}`);
});
```

Inicia o servidor HTTP e executa uma função quando ele estiver pronto para receber requisições.

### Qual é a diferença entre app.ts e server.ts?

- **`app.ts`** configura a aplicação e define como responder às requisições HTTP.
- **`server.ts`** inicia o servidor e disponibiliza a aplicação em uma porta de comunicação.

Essa separação facilita a compreensão das responsabilidades de cada arquivo, sem introduzir uma arquitetura complexa.

## 10. Configurar os comandos de execução

### Passo 12 — Modificar package.json

**Arquivo:** `package.json`.

Abra o arquivo e localize a propriedade `scripts`. Ela provavelmente estará semelhante a:

```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

**O que modificar:** remova o script `test` gerado automaticamente e substitua a propriedade `scripts` por:

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

**Atenção:** esse trecho deve substituir somente a propriedade `scripts`, mantendo as demais propriedades e dependências existentes no `package.json`.

### O que cada comando faz?

| Comando | Finalidade |
|---|---|
| `npm run dev` | Executa o servidor durante o desenvolvimento |
| `npm run build` | Compila TypeScript para JavaScript |
| `npm start` | Executa o JavaScript compilado |

O comando `dev` utiliza `watch`, reiniciando o servidor sempre que um arquivo TypeScript for salvo.

O comando `build` executa o compilador TypeScript (`tsc`) e gera os arquivos JavaScript no diretório `dist`.

## 11. Configurar o Git

### Passo 13 — Criar .gitignore

**Arquivo:** `.gitignore`.

**O que fazer:** crie o arquivo na raiz do projeto e adicione:

```gitignore
# Dependências instaladas pelo npm.
node_modules/

# Arquivos JavaScript gerados pela compilação.
dist/

# Variáveis de ambiente e informações sensíveis.
.env

# Arquivos temporários de log.
*.log
```

O `.gitignore` informa ao Git quais arquivos e diretórios não deverão ser versionados.

O `node_modules`, por exemplo, não precisa ser enviado ao repositório porque as dependências poderão ser reinstaladas utilizando:

```bash
npm install
```

O arquivo `.env` será utilizado em etapas futuras, mas já podemos impedir seu versionamento.

Caso o projeto tenha sido clonado de um repositório Git existente, preserve as regras anteriores do `.gitignore` e acrescente apenas as que estiverem faltando.

## 12. Executar o servidor

### Passo 14 — Iniciar em modo de desenvolvimento

No terminal, execute:

```bash
npm run dev
```

Se tudo estiver configurado corretamente, o terminal apresentará uma mensagem semelhante a:

```text
Servidor executando em http://localhost:3000
```

Isso significa que o servidor está ativo e aguardando requisições HTTP. Não feche esse terminal enquanto estiver realizando os testes.

### Passo 15 — Testar no navegador

Abra o navegador e acesse http://localhost:3000.

O navegador deverá exibir uma resposta JSON semelhante a:

```json
{
  "message": "Minha primeira API com Node.js e Express!"
}
```

**Método:** `GET`  
**Caminho:** `/`  
**Código HTTP esperado:** `200 OK`.

O navegador funciona como cliente HTTP e envia automaticamente uma requisição `GET` ao endereço informado. O servidor recebe essa requisição, identifica a rota correspondente e envia a resposta JSON.

## 13. Entendendo o fluxo da requisição HTTP

```text
┌───────────────────────────────┐
│ Cliente HTTP                  │
│ Navegador ou Postman          │
└───────────────┬───────────────┘
                │ GET /
                ▼
┌───────────────────────────────┐
│ Servidor HTTP                 │
│ server.ts — porta 3000        │
└───────────────┬───────────────┘
                │ Encaminha requisição
                ▼
┌───────────────────────────────┐
│ Aplicação Express             │
│ app.ts — rota GET /           │
└───────────────┬───────────────┘
                │ Resposta 200 + JSON
                ▼
          Cliente HTTP
```

O fluxo funciona da seguinte maneira:

1. O cliente envia uma requisição HTTP `GET /`.
2. O servidor Node.js, iniciado por `server.ts`, recebe a requisição.
3. O Express identifica a rota `/` configurada em `app.ts`.
4. A função associada à rota é executada.
5. O servidor devolve uma resposta HTTP `200 OK` com dados JSON.

Esse mecanismo será utilizado posteriormente para implementar os endpoints de cadastro, login e gerenciamento de usuários.

## 14. Testar a compilação do TypeScript

### Passo 16 — Compilar o projeto

Com o terminal disponível, execute:

```bash
npm run build
```

O TypeScript verificará o código e, se não houver erros, criará o diretório `dist`.

A estrutura ficará semelhante a:

```text
api-usuarios/
├── dist/
│   ├── app.js
│   └── server.js
├── node_modules/
├── src/
│   ├── app.ts
│   └── server.ts
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```

Observe que temos agora duas versões do código:

- `src/`: contém os arquivos originais TypeScript.
- `dist/`: contém os arquivos JavaScript gerados pelo compilador.

### Passo 17 — Executar o código compilado

Primeiro, interrompa o servidor de desenvolvimento, caso esteja executando, pressionando `Ctrl + C` no terminal correspondente.

Depois, execute:

```bash
npm start
```

A aplicação deverá iniciar novamente na porta `3000`.

Teste o endereço http://localhost:3000 e verifique se a resposta continua funcionando.

Isso demonstra que o TypeScript foi transformado em JavaScript, que poderá ser executado pelo Node.js.

## 15. Exercícios práticos

Para consolidar o conteúdo, proponho três exercícios progressivos.

### Exercício 1 — Personalizar a resposta JSON

**Arquivo:** `src/app.ts`.

Modifique a rota `/` para retornar três informações: nome da API, versão e mensagem de boas-vindas.

Resultado esperado:

```json
{
  "name": "API de Usuários",
  "version": "1.0.0",
  "message": "Bem-vindo à nossa API!"
}
```

### Exercício 2 — Criar um segundo endpoint

**Arquivo:** `src/app.ts`.

Adicione uma rota `GET /sobre` que retorne:

```json
{
  "projeto": "API REST de Usuários",
  "tecnologias": [
    "Node.js",
    "TypeScript",
    "Express"
  ]
}
```

Teste o endereço http://localhost:3000/sobre.

### Exercício 3 — Investigar um endpoint inexistente

Acesse http://localhost:3000/inexistente.

Observe o código HTTP retornado pelo servidor e responda: por que a requisição não foi atendida? Qual é a diferença entre os códigos `200` e `404`?

Os exercícios devem ser realizados sem criar novos diretórios ou instalar bibliotecas adicionais.

## 16. Verificação final da etapa

Utilize a lista abaixo para conferir se o ambiente e o servidor estão funcionando.

- [ ] Node.js e npm instalados.
- [ ] Projeto Node.js inicializado.
- [ ] Express e TypeScript instalados.
- [ ] `tsconfig.json` configurado.
- [ ] `src/app.ts` criado e funcionando.
- [ ] `src/server.ts` criado e funcionando.
- [ ] `package.json` com scripts de execução.
- [ ] Endpoint `GET /` retornando JSON.
- [ ] Compilação com `npm run build` funcionando.
- [ ] Execução com `npm start` funcionando.

## 17. Resultado e próxima etapa

Ao concluir esta etapa, teremos uma aplicação backend funcional, com uma estrutura simples e preparada para evoluir.

**Arquivos criados ou modificados:**

| Arquivo | Responsabilidade |
|---|---|
| `package.json` | Dependências e comandos de execução |
| `package-lock.json` | Registro das versões das dependências |
| `tsconfig.json` | Configuração do TypeScript |
| `src/app.ts` | Configuração do Express e endpoint inicial |
| `src/server.ts` | Inicialização do servidor HTTP |
| `.gitignore` | Exclusão de arquivos do versionamento |

Na **Etapa 2 — Organização inicial**, conforme o `AGENTS.md`, trabalharemos com a separação de rotas e controllers, configuração do CORS e utilização de variáveis de ambiente com `dotenv`.

A partir dessa evolução, nosso primeiro endpoint deixará de estar diretamente no arquivo `app.ts` e passará a integrar uma estrutura de rotas e controllers.

Assim, a aplicação continuará simples, mas os estudantes compreenderão gradualmente por que organizar o código em arquivos com responsabilidades distintas.
