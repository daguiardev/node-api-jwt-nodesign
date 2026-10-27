
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

// Obtém o caminho do banco definido no arquivo .env.
// Caso a variável não exista, utiliza o caminho padrão.
const databasePath: string =
  process.env.DATABASE_PATH || "./data/database.sqlite";

// Converte o caminho relativo em um caminho absoluto.
const absolutePath: string = path.resolve(databasePath);

// Identifica o diretório onde o banco será armazenado.
const databaseDirectory: string = path.dirname(absolutePath);

// Cria o diretório data, caso ainda não exista.
// recursive: true evita erros quando o diretório já existe.
fs.mkdirSync(databaseDirectory, { recursive: true });

// Abre a conexão com o SQLite.
// Se o arquivo não existir, ele será criado automaticamente.
const db = new DatabaseSync(absolutePath);

// Disponibiliza a conexão para outros arquivos do projeto.
export default db;
