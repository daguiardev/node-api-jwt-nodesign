
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

// Consulta a estrutura das colunas da tabela users.
// PRAGMA table_info retorna informações como nome e tipo.
const columns = db.prepare("PRAGMA table_info(users)").all();

// Exibe as informações no terminal em formato de tabela.
console.table(columns);

// Consulta a quantidade de registros da tabela users.
const result = db.prepare(
  "SELECT COUNT(*) AS total FROM users"
).get() as { total: number };

// Exibe a quantidade de usuários cadastrados.
console.log("Total de usuários:", result.total);

