import 'dotenv/config';
import database from './database';

// Obtém o e-mail informado no terminal.
// Exemplo: npx tsx src/database/createAdmin.ts admin@email.com
const email = process.argv[2];

async function createAdmin() {
  // Impede a execução sem um e-mail.
  if (!email) {
    console.error('Informe o e-mail do usuário.');
    process.exitCode = 1;
    return;
  }

  try {
    // Procura uma conta previamente cadastrada.
    // O parâmetro ? evita SQL Injection.
    const user = database
      .prepare('SELECT id, email, role FROM users WHERE email = ?')
      .get(email) as { id: number; email: string; role: string } | undefined;

    if (!user) {
      console.error('Usuário não encontrado.');
      process.exitCode = 1;
      return;
    }

    // Evita realizar uma atualização desnecessária.
    if (user.role === 'admin') {
      console.log('Este usuário já é administrador.');
      return;
    }

    // Altera somente o papel da conta existente.
    database
      .prepare(
        `UPDATE users
         SET role = 'admin', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(user.id);

    console.log('Administrador configurado com sucesso.');
  } catch (error) {
    // Não exibimos detalhes internos do banco ao usuário da API.
    console.error('Erro ao configurar administrador.');
    process.exitCode = 1;
  }
}

// Executa o script e fecha a conexão ao terminar.
createAdmin().finally(async () => {
  await database.close();
});