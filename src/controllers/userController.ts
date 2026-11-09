import { Response } from "express";
import  db from "../database/database";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import bcrypt from "bcrypt";


/**
 * GET /api/users/me
 *
 * Retorna os dados da conta do usuário autenticado.
 */
export async function getMe(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // O ID foi obtido do JWT pelo middleware.
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    // Consulta somente os dados que podem ser retornados.
    // O password_hash não é incluído no SELECT.
    const user = db.prepare(
      "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?"
    ).get(userId) as { id: number; name: string; email: string; role: string; created_at: string; updated_at: string } | undefined;

    if (!user) {
      res.status(404).json({
        message: "Usuário não encontrado",
      });
      return;
    }

    // Retorna os dados em JSON.
    res.status(200).json(user);
  } catch (error) {
    console.error("Erro ao consultar a própria conta");

    res.status(500).json({
      message: "Erro interno do servidor",
    });
  }
}


/**
 * PUT /api/users/me
 *
 * Permite atualizar os dados da própria conta.
 * O papel do usuário não pode ser alterado.
 */
export async function updateMe(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Identifica o usuário pelo JWT validado.
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      message: "Usuário não autenticado",
    });
    return;
  }

  // Recebe os dados enviados pelo cliente.
  const { name, email, password } = req.body;

  // Verifica os campos obrigatórios e seus tipos.
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    res.status(400).json({
      message: "Nome e e-mail são obrigatórios",
    });
    return;
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // Validação simples do formato do e-mail.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    res.status(400).json({
      message: "E-mail inválido",
    });
    return;
  }

  // Impede que campos não autorizados sejam atualizados.
  // Não aceitamos role nem outros campos extras.
  const allowedFields = ["name", "email", "password"];

  const hasInvalidFields = Object.keys(req.body).some(
    (field) => !allowedFields.includes(field)
  );

  if (hasInvalidFields) {
    res.status(400).json({
      message: "A requisição contém campos não permitidos",
    });
    return;
  }

  // A senha é opcional, mas precisa ser válida se enviada.
  if (
    password !== undefined &&
    (typeof password !== "string" || password.length < 8)
  ) {
    res.status(400).json({
      message: "A senha deve possuir pelo menos 8 caracteres",
    });
    return;
  }

  try {
    // Verifica se a conta ainda existe.
    const existingUser = db.prepare(
      "SELECT id FROM users WHERE id = ?"
    ).get(userId);

    if (!existingUser) {
      res.status(404).json({
        message: "Usuário não encontrado",
      });
      return;
    }

    // Verifica se o e-mail pertence a outra conta.
    const emailOwner = db.prepare(
      "SELECT id FROM users WHERE email = ? AND id != ?"
    ).get(normalizedEmail, userId);

    if (emailOwner) {
      res.status(409).json({
        message: "E-mail já cadastrado",
      });
      return;
    }

    if (password !== undefined) {
      // Gera um novo hash quando a senha é alterada.
      // O custo 10 é adequado como exemplo didático inicial.
      const passwordHash = await bcrypt.hash(password, 10);

      db.prepare(
        `UPDATE users
         SET name = ?, email = ?, password_hash = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(normalizedName, normalizedEmail, passwordHash, userId);
    } else {
      // Atualiza somente nome e e-mail.
      db.prepare(
        `UPDATE users
         SET name = ?, email = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(normalizedName, normalizedEmail, userId);
    }

    // Consulta os dados atualizados, sem o hash da senha.
    const updatedUser = db.prepare(
      `SELECT id, name, email, role, created_at, updated_at
       FROM users
       WHERE id = ?`
    ).get(userId);

    res.status(200).json(updatedUser);
  } catch (error) {
    // O banco também protege a unicidade do e-mail.
    if (
      error instanceof Error &&
      error.message.includes("SQLITE_CONSTRAINT_UNIQUE")
    ) {
      res.status(409).json({
        message: "E-mail já cadastrado",
      });
      return;
    }

    console.error("Erro ao atualizar a própria conta");

    res.status(500).json({
      message: "Erro interno do servidor",
    });
  }
}


/**
 * DELETE /api/users/me
 *
 * Exclui a conta do usuário autenticado.
 */
export async function deleteMe(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  // Obtém o ID disponibilizado pelo middleware.
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      message: "Usuário não autenticado",
    });
    return;
  }

  try {
    // Remove somente a conta do usuário autenticado.
    const result = db.prepare(
      "DELETE FROM users WHERE id = ?"
    ).run(userId);

    // Verifica se algum registro foi realmente excluído.
    if (result.changes === 0) {
      res.status(404).json({
        message: "Usuário não encontrado",
      });
      return;
    }

    // 204 indica sucesso sem corpo na resposta.
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir a própria conta");

    res.status(500).json({
      message: "Erro interno do servidor",
    });
  }
}
