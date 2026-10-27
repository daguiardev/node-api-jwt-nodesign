import { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../database/database";

// Custo utilizado pelo bcrypt para gerar o hash.
const SALT_ROUNDS = 10;

/**
 * Realiza o cadastro público de um usuário.
 *
 * Recebe nome, e-mail e senha.
 * Valida os dados e salva o usuário no SQLite.
 */
export async function register(
  req: Request,
  res: Response
): Promise<void> {

  // 1. Obtém os dados enviados no corpo da requisição.
  const { name, email, password } = req.body ?? {};

  // 2. Verifica se os dados obrigatórios são válidos.
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({
      message: "Nome, e-mail e senha são obrigatórios."
    });
    return;
  }

  // 3. Remove espaços desnecessários.
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // 4. Valida o formato básico do e-mail.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    res.status(400).json({
      message: "Formato de e-mail inválido."
    });
    return;
  }

  // 5. Verifica o tamanho mínimo da senha.
  if (password.length < 8) {
    res.status(400).json({
      message: "A senha deve ter pelo menos 8 caracteres."
    });
    return;
  }

  try {

    // 6. Consulta se o e-mail já existe no banco.
    // O parâmetro ? evita concatenar dados diretamente no SQL.
    const existingUser = db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(normalizedEmail);

    if (existingUser) {
      res.status(409).json({
        message: "E-mail já cadastrado."
      });
      return;
    }

    // 7. Transforma a senha em um hash usando bcrypt.
    const passwordHash = await bcrypt.hash(
      password,
      SALT_ROUNDS
    );

    // 8. Insere o usuário no banco de dados.
    // O papel é definido pelo backend, nunca pelo cliente.
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(
      normalizedName,
      normalizedEmail,
      passwordHash,
      "user"
    );

    // 9. Retorna os dados públicos do usuário criado.
    // A senha e o hash não são incluídos na resposta.
    res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user: {
        id: Number(result.lastInsertRowid),
        name: normalizedName,
        email: normalizedEmail,
        role: "user"
      }
    });

  } catch (error) {

    // 10. Trata a possibilidade de um cadastro concorrente
    // ter utilizado o mesmo e-mail.
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      res.status(409).json({
        message: "E-mail já cadastrado."
      });
      return;
    }

    // Não enviamos detalhes internos do erro ao cliente.
    res.status(500).json({
      message: "Erro interno ao cadastrar usuário."
    });
  }
}