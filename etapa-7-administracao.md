# Etapa 7 — Administração: autorização e endpoints administrativos

> **Projeto:** API REST com Node.js, TypeScript, Express, SQLite e JWT.  
> **Público:** estudantes iniciantes de Programação para Internet.  
> **Referência:** `AGENTS.md` do projeto.  
> **Pré-requisito:** Etapas 1 a 6 concluídas, incluindo cadastro, login, JWT e rotas `/me`.

Nesta etapa, implementaremos as funcionalidades administrativas sem introduzir camadas de services, repositories ou padrões avançados. Cada alteração indica o arquivo, o que adicionar e o que preservar. Os exemplos pressupõem uma conexão SQLite assíncrona que oferece `get`, `all`, `run` e `close` (como a biblioteca `sqlite` sobre `sqlite3`). **Se a Etapa 3 utilizou outra API de conexão, adapte apenas as chamadas ao banco, sem reescrever o projeto.**

## 1. Objetivos da etapa

A Etapa 7 prevista no `AGENTS.md` inclui:

1. Criar o primeiro administrador.
2. Criar um middleware de autorização.
3. Implementar os endpoints administrativos.

| Método | Endpoint | Acesso | Finalidade |
|---|---|---|---|
| `GET` | `/api/users` | Admin | Listar usuários |
| `GET` | `/api/users/:id` | Admin | Consultar usuário por ID |
| `PUT` | `/api/users/:id` | Admin | Atualizar usuário |
| `DELETE` | `/api/users/:id` | Admin | Excluir usuário |

As rotas `/api/users/me` da Etapa 6 continuam disponíveis a usuários autenticados.

**Autenticação** verifica quem fez a requisição: o `authMiddleware` valida o JWT, consulta a conta no banco e disponibiliza o usuário. **Autorização** verifica se essa pessoa tem permissão: o novo `adminMiddleware` exige o papel `admin`.

Fluxo de uma requisição administrativa:

```text
Cliente: GET /api/users + Authorization: Bearer TOKEN
                       |
                       v
               authMiddleware
        (JWT válido? conta existente?)
                       |
                       v
               adminMiddleware
                (role = admin?)
                  /          \
                sim          não
                 |            |
                 v            v
             controller     HTTP 403
                 |
                 v
              resposta
```

## 2. Preparação: verificar a estrutura existente

**Ação:** apenas conferir os arquivos; não apagar implementações anteriores.

```text
projeto/
├── src/
│   ├── controllers/
│   │   ├── authController.ts
│   │   └── userController.ts
│   ├── database/
│   │   ├── database.ts
│   │   └── init.ts
│   ├── middlewares/
│   │   └── authMiddleware.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   └── userRoutes.ts
│   ├── app.ts
│   └── server.ts
├── data/
│   └── database.sqlite
├── .env
├── package.json
└── tsconfig.json
```

A Etapa 7 acrescentará `src/database/createAdmin.ts` e `src/middlewares/adminMiddleware.ts`; os demais arquivos serão ajustados somente se necessário. Verifique se `GET`, `PUT` e `DELETE /api/users/me` funcionam antes de prosseguir.

## 3. Passo 1 — Criar o primeiro administrador

O cadastro público (`POST /api/auth/register`) **sempre** cria contas `user`; não deve existir rota pública para cadastrar administradores. A abordagem didática é cadastrar uma conta normalmente e executar um script **local** para promovê-la.

### 3.1. Arquivo: `src/database/createAdmin.ts`

**Ação:** criar o arquivo com o conteúdo abaixo.

```ts
import 'dotenv/config';
import database from './database';

// Recebe o e-mail como argumento do terminal.
// Exemplo: npx tsx src/database/createAdmin.ts admin@email.com
const email = process.argv[2];

async function createAdmin(): Promise<void> {
  // Evita executar a operação sem indicar a conta.
  if (!email) {
    console.error('Informe o e-mail do usuário.');
    process.exitCode = 1;
    return;
  }

  try {
    // Busca uma conta já cadastrada; o ? evita SQL Injection.
    const user = await database.get(
      'SELECT id, email, role FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      console.error('Usuário não encontrado.');
      process.exitCode = 1;
      return;
    }

    // Não é preciso atualizar uma conta que já é admin.
    if (user.role === 'admin') {
      console.log('Este usuário já é administrador.');
      return;
    }

    // Atualiza somente o papel da conta existente.
    await database.run(
      `UPDATE users
       SET role = 'admin', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [user.id]
    );

    console.log('Administrador configurado com sucesso.');
  } catch (error) {
    console.error('Erro ao configurar administrador.');
    process.exitCode = 1;
  }
}

// Fecha a conexão ao concluir a operação local.
createAdmin().finally(async () => {
  await database.close();
});
```

**Adaptação importante:** o exemplo considera que `src/database/database.ts` exporta uma conexão pronta como `default`, com métodos assíncronos `get`, `run` e `close`. Se ele exportar uma função que abre a conexão, obtenha-a antes de fazer consultas. Se a conexão for compartilhada ou não oferecer `close`, ajuste o encerramento de acordo com a implementação existente. Não substitua um módulo de banco que já funciona apenas para copiar este exemplo.

### 3.2. Arquivo: `package.json`

**Ação:** dentro do objeto existente `scripts`, **adicionar somente** a propriedade:

```json
"admin:create": "tsx src/database/createAdmin.ts"
```

Por exemplo, se os scripts atuais forem `dev`, `build` e `start`, o resultado será semelhante a:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "admin:create": "tsx src/database/createAdmin.ts"
  }
}
```

O segundo trecho é **ilustrativo**, não substitui o `package.json` inteiro. Preserve os scripts reais do seu projeto. Se `tsx` ainda não estiver instalado, verifique as dependências existentes antes de adicioná-lo.

### 3.3. Cadastrar e promover uma conta

**Arquivo:** nenhum arquivo de código precisa ser alterado nesta subetapa.

Envie ao endpoint já existente `POST /api/auth/register`:

```json
{
  "name": "Administrador",
  "email": "admin@email.com",
  "password": "SenhaForte123!"
}
```

No terminal, na raiz do projeto:

```bash
npm run admin:create -- admin@email.com
```

Resultado esperado:

```text
Administrador configurado com sucesso.
```

A conta mantém seu ID, e-mail e senha; somente o papel muda. Use esse script exclusivamente em ambiente confiável e somente para uma conta cuja titularidade tenha sido verificada. Não exponha esse procedimento como endpoint HTTP.

## 4. Passo 2 — Criar o middleware de autorização

### 4.1. Arquivo: `src/middlewares/adminMiddleware.ts`

**Ação:** criar o arquivo com o código abaixo.

```ts
import { Request, Response, NextFunction } from 'express';

/**
 * Verifica se o usuário autenticado possui papel admin.
 * Deve ser executado DEPOIS do authMiddleware.
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // O authMiddleware já identificou este usuário no banco.
  const user = req.user;

  // Sem usuário autenticado, não é possível autorizar.
  if (!user) {
    res.status(401).json({
      message: 'Usuário não autenticado'
    });
    return;
  }

  // Somente o papel admin pode continuar.
  if (user.role !== 'admin') {
    res.status(403).json({
      message: 'Acesso permitido apenas para administradores'
    });
    return;
  }

  // Autoriza o processamento da rota.
  next();
}
```

**Como funciona:** `req.user` vem do middleware de autenticação; `401` significa que não há autenticação válida; `403` significa que o usuário está autenticado, mas não possui a permissão exigida. `next()` entrega a requisição ao próximo middleware ou controller.

### 4.2. Arquivo: `src/middlewares/authMiddleware.ts`

**Ação:** verificar e ajustar **somente se necessário**. A Etapa 6 já deve validar a assinatura e a expiração do JWT, localizar a conta no SQLite e associar seus dados à requisição. Garanta que o objeto associado contenha o ID e o papel **obtido do banco**:

```ts
// Trecho ilustrativo dentro do authMiddleware,
// depois de validar o JWT e buscar o usuário no SQLite.
req.user = {
  id: user.id,
  role: user.role
};
```

**Não remova** as verificações de assinatura, expiração ou existência da conta. Não use o `role` fornecido no corpo da requisição para decidir permissões.

### 4.3. Arquivo: `src/middlewares/authMiddleware.ts` — tipagem opcional

**Ação:** se a Etapa 6 ainda não declarou o tipo de `req.user`, adicionar a seguinte declaração **uma única vez** no projeto, fora das funções:

```ts
// Estende o Request do Express com o usuário autenticado.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: 'user' | 'admin';
      };
    }
  }
}
```

O exemplo usa `id` numérico; adapte se o projeto usar outro tipo. Se já houver uma declaração equivalente, **não duplique**.

## 5. Passo 3 — Implementar funções administrativas

**Arquivo:** `src/controllers/userController.ts`.  
**Ação:** preservar todas as funções da Etapa 6 e **adicionar** quatro funções exportadas.

Verifique os imports existentes e inclua apenas os que faltarem:

```ts
import { Request, Response } from 'express';
import database from '../database/database';
```

O `bcrypt` pode já estar importado para as rotas `/me`; mantenha-o se ainda for utilizado. As funções abaixo não alteram senhas. A conexão ilustrada deve ser adaptada ao módulo SQLite efetivamente utilizado na Etapa 3.

### 5.1. Função `listUsers` — listar usuários

**Arquivo:** `src/controllers/userController.ts`.  
**Ação:** adicionar:

```ts
/**
 * Lista todos os usuários.
 * O adminMiddleware verifica a permissão antes desta função.
 */
export async function listUsers(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Seleciona explicitamente os campos públicos.
    // Nunca retorna password_hash.
    const users = await database.all(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       ORDER BY id ASC`
    );

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: 'Erro ao listar usuários'
    });
  }
}
```

`SELECT` consulta os registros e `ORDER BY id ASC` os organiza por ID crescente. Não usamos `SELECT *` porque a tabela contém `password_hash`.

Exemplo de resposta:

```json
[
  {
    "id": 1,
    "name": "Administrador",
    "email": "admin@email.com",
    "role": "admin",
    "created_at": "2026-11-09 10:00:00",
    "updated_at": "2026-11-09 10:00:00"
  },
  {
    "id": 2,
    "name": "Maria Silva",
    "email": "maria@email.com",
    "role": "user",
    "created_at": "2026-11-09 10:30:00",
    "updated_at": "2026-11-09 10:30:00"
  }
]
```

### 5.2. Função `getUserById` — consultar usuário

**Arquivo:** `src/controllers/userController.ts`.  
**Ação:** adicionar:

```ts
/**
 * Consulta um usuário pelo ID recebido na URL.
 * Exemplo: GET /api/users/2
 */
export async function getUserById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Converte o parâmetro de texto em número.
    const id = Number(req.params.id);

    // IDs devem ser inteiros positivos.
    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    // A interrogação recebe o valor separadamente do SQL.
    const user = await database.get(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    );

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao consultar usuário' });
  }
}
```

A consulta usa `WHERE id = ?` com parâmetro, evitando SQL Injection. ID inválido retorna `400`; ID válido mas inexistente retorna `404`.

### 5.3. Função `updateUserById` — atualizar usuário

**Arquivo:** `src/controllers/userController.ts`.  
**Ação:** adicionar:

Para manter o escopo simples, este endpoint permite modificar **apenas nome e e-mail**. Senha e papel não serão modificados aqui; a atribuição inicial de `admin` permanece restrita ao script local.

```ts
/**
 * Atualiza nome e e-mail de um usuário pelo ID.
 * Não permite alterar password_hash nem role.
 */
export async function updateUserById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    // Recebe somente os campos autorizados.
    const { name, email } = req.body ?? {};

    // Valida tipos, nome obrigatório e formato básico de e-mail.
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      name.trim() === '' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      res.status(400).json({ message: 'Nome ou e-mail inválido' });
      return;
    }

    // Rejeita qualquer campo além de name e email.
    // O corpo precisa ser um objeto JSON comum.
    if (
      req.body === null ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body) ||
      Object.keys(req.body).some(
        key => !['name', 'email'].includes(key)
      )
    ) {
      res.status(400).json({
        message: 'Apenas nome e e-mail podem ser alterados'
      });
      return;
    }

    const newName = name.trim();
    const newEmail = email.trim().toLowerCase();

    // Verifica se a conta a atualizar existe.
    const user = await database.get(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    // Impede o uso de e-mail pertencente a outra conta.
    const existingEmail = await database.get(
      'SELECT id FROM users WHERE email = ? AND id <> ?',
      [newEmail, id]
    );

    if (existingEmail) {
      res.status(409).json({ message: 'E-mail já cadastrado' });
      return;
    }

    // Atualiza somente os campos permitidos.
    await database.run(
      `UPDATE users
       SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newName, newEmail, id]
    );

    // Consulta os dados atualizados sem o hash da senha.
    const updatedUser = await database.get(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
}
```

Exemplo:

```http
PUT /api/users/2
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "name": "Maria Oliveira",
  "email": "maria.oliveira@email.com"
}
```

**Por que não atualizar `role`?** O projeto exige que usuários comuns não consigam se tornar administradores por requisições HTTP. Neste exercício, não criamos uma operação HTTP de promoção. A restrição `UNIQUE` do banco deve continuar protegendo e-mails duplicados; o tratamento de uma colisão que ocorra entre a verificação e o `UPDATE` poderá ser refinado na Etapa 8.

### 5.4. Função `deleteUserById` — excluir usuário

**Arquivo:** `src/controllers/userController.ts`.  
**Ação:** adicionar:

```ts
/**
 * Exclui um usuário pelo ID.
 * O acesso é restrito pelo adminMiddleware.
 */
export async function deleteUserById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    // Confirma a existência da conta.
    const user = await database.get(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    // Remove a conta indicada pelo ID.
    await database.run(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    // 204 significa sucesso sem corpo de resposta.
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
}
```

O `AGENTS.md` permite que o administrador exclua sua própria conta. Se houver apenas um administrador, essa operação pode deixar o sistema sem administradores. Nos testes, use contas descartáveis e preserve o script local para preparar uma nova conta administrativa.

## 6. Passo 4 — Configurar as rotas administrativas

### 6.1. Arquivo: `src/routes/userRoutes.ts`

**Ação:** adicionar os imports e as quatro rotas administrativas, **preservando** as rotas `/me` e seus imports da Etapa 6.

```ts
import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';

// Funções administrativas recém-adicionadas.
import {
  listUsers,
  getUserById,
  updateUserById,
  deleteUserById
} from '../controllers/userController';

// Preserve também os imports das funções /me da Etapa 6.
const router = Router();

/*
 * ROTAS DO PRÓPRIO USUÁRIO
 * Mantenha aqui as rotas já existentes:
 * GET /me, PUT /me e DELETE /me.
 * Todas usam authMiddleware e seus controllers da Etapa 6.
 */

/*
 * ROTAS ADMINISTRATIVAS
 * 1. Autentica o usuário.
 * 2. Verifica se ele é admin.
 * 3. Executa o controller.
 */

// Lista todas as contas.
router.get('/', authMiddleware, adminMiddleware, listUsers);

// Consulta uma conta pelo ID.
router.get('/:id', authMiddleware, adminMiddleware, getUserById);

// Atualiza uma conta pelo ID.
router.put('/:id', authMiddleware, adminMiddleware, updateUserById);

// Exclui uma conta pelo ID.
router.delete('/:id', authMiddleware, adminMiddleware, deleteUserById);

export default router;
```

**Importante:** esse trecho é um modelo de organização, **não** uma substituição integral pronta para colar, porque as funções reais da Etapa 6 não foram fornecidas. Mantenha as declarações reais das rotas `/me` no lugar indicado. Não declare `router` ou `export default` duas vezes.

**Por que a ordem importa?** Em `router.get('/', authMiddleware, adminMiddleware, listUsers)`, o Express primeiro verifica o JWT, depois o papel e só então chama o controller. Se algum middleware rejeitar o acesso, o controller não é executado.

**Ordem das URLs:** coloque as rotas `/me` **antes** das rotas `/:id`, para que `me` não seja interpretado como um ID:

```ts
// Exemplo ilustrativo: use o nome real da função da Etapa 6.
router.get('/me', authMiddleware, getMyProfile);
router.get('/:id', authMiddleware, adminMiddleware, getUserById);
```

### 6.2. Arquivo: `src/app.ts`

**Ação:** somente verificar se as rotas já estão registradas com o prefixo correto. Exemplo:

```ts
import userRoutes from './routes/userRoutes';

// Registra os endpoints de usuários sob /api/users.
app.use('/api/users', userRoutes);
```

Não duplique o import nem o `app.use` se já existirem.

## 7. Passo 5 — Executar e verificar a compilação

### 7.1. Arquivo: `package.json`

**Ação:** verificar o script de desenvolvimento já configurado. Se o comando atual for o seguinte, execute-o:

```bash
npm run dev
```

Não é necessário adicionar bibliotecas para criar o middleware administrativo. Caso `tsx` não esteja instalado e seja necessário para o script local, verifique primeiro a configuração de execução TypeScript do projeto.

### 7.2. Verificar o TypeScript

**Arquivo:** nenhum; executar no terminal:

```bash
npx tsc --noEmit
```

Esse comando verifica os tipos sem gerar JavaScript. Se aparecerem erros de import ou de `req.user`, confira os passos 4.2, 4.3 e 5. Remova imports não utilizados apenas quando realmente não forem necessários às funções anteriores.

## 8. Passo 6 — Testar as funcionalidades administrativas

Use Postman, Insomnia ou Thunder Client. Prepare duas contas: uma `admin` e uma `user`. Faça login nas duas e guarde os respectivos JWTs. Nos exemplos, substitua `TOKEN_ADMIN` e `TOKEN_USER` pelos tokens reais, sem registrá-los em logs ou arquivos versionados.

### 8.1. Teste 1 — Listar usuários como administrador

```http
GET /api/users
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK` e uma lista JSON de usuários, sem senhas ou hashes.

### 8.2. Teste 2 — Tentar listar como usuário comum

```http
GET /api/users
Authorization: Bearer TOKEN_USER
```

**Esperado:** `403 Forbidden`:

```json
{
  "message": "Acesso permitido apenas para administradores"
}
```

### 8.3. Teste 3 — Consultar usuário pelo ID

```http
GET /api/users/2
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `200 OK` e os dados do usuário 2, se ele existir; caso contrário, `404 Not Found`.

### 8.4. Teste 4 — Atualizar usuário

```http
PUT /api/users/2
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "name": "Maria Oliveira",
  "email": "maria.oliveira@email.com"
}
```

**Esperado:** `200 OK` e os dados atualizados, sem `password_hash`.

### 8.5. Teste 5 — Tentar alterar papel

```http
PUT /api/users/2
Authorization: Bearer TOKEN_ADMIN
Content-Type: application/json
```

```json
{
  "name": "Maria Oliveira",
  "email": "maria.oliveira@email.com",
  "role": "admin"
}
```

**Esperado:** `400 Bad Request`. O endpoint não permite alterar o papel.

### 8.6. Teste 6 — Excluir usuário

```http
DELETE /api/users/2
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `204 No Content`, sem corpo. Em seguida:

```http
GET /api/users/2
Authorization: Bearer TOKEN_ADMIN
```

**Esperado:** `404 Not Found`, confirmando a exclusão.

### 8.7. Checklist completo de testes

Marque os casos à medida que forem executados:

- [ ] `GET /api/users` com JWT admin → `200`.
- [ ] `GET /api/users` com JWT user → `403`.
- [ ] `GET /api/users` sem JWT → `401`.
- [ ] `GET /api/users` com JWT inválido → `401`.
- [ ] `GET /api/users/2` com ID existente → `200`.
- [ ] `GET /api/users/999999` com ID inexistente → `404`.
- [ ] `GET /api/users/abc` com ID inválido → `400`.
- [ ] `PUT /api/users/2` com dados válidos → `200`.
- [ ] `PUT /api/users/2` com e-mail de outra conta → `409`.
- [ ] `PUT /api/users/2` com campo `role` → `400`.
- [ ] `DELETE /api/users/2` com JWT user → `403`.
- [ ] `DELETE /api/users/2` com JWT admin → `204`.
- [ ] Conferir que nenhum endpoint retorna `password_hash`.
- [ ] Confirmar que as rotas `/me` da Etapa 6 continuam funcionando.

## 9. Passo 7 — Revisar os arquivos modificados

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/database/createAdmin.ts` | Criar | Promover localmente uma conta existente |
| `package.json` | Modificar | Adicionar o script `admin:create` |
| `src/middlewares/adminMiddleware.ts` | Criar | Exigir o papel `admin` |
| `src/middlewares/authMiddleware.ts` | Verificar | Disponibilizar ID e papel da conta autenticada |
| `src/controllers/userController.ts` | Modificar | Adicionar as quatro operações administrativas |
| `src/routes/userRoutes.ts` | Modificar | Registrar as rotas protegidas |
| `src/app.ts` | Verificar | Confirmar o prefixo `/api/users` |

Não é necessário criar classes, services, repositories ou outros diretórios.

## 10. Resultado esperado da Etapa 7

Ao final:

- Visitantes podem se cadastrar e realizar login, mas não acessar rotas administrativas.
- Usuários comuns gerenciam a própria conta por `/me`.
- Administradores podem listar, consultar, atualizar nome/e-mail e excluir outras contas.
- Toda operação administrativa exige JWT válido e papel `admin` confirmado pelo backend.
- O cadastro público continua criando apenas contas `user`.
- As respostas nunca expõem senhas ou hashes.
- As consultas SQL utilizam parâmetros.
- O projeto continua simples, executável e alinhado ao `AGENTS.md`.

**Próxima etapa — Etapa 8: Revisão.** Revisar validações, códigos HTTP, tratamento de colisões de e-mail, testes dos endpoints e documentação da API, sem antecipar complexidade arquitetural.
