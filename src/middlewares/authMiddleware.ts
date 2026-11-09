
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import db from "../database/database";

// Representa os dados que precisamos do usuário autenticado.
export type AuthenticatedUser = {
  id: number;
  role: "user" | "admin";
};

// Permite que os controllers recebam uma requisição
// contendo os dados do usuário autenticado.
export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

/**
 * Middleware responsável por autenticar requisições.
 *
 * Se o JWT for válido e o usuário existir no banco,
 * a requisição poderá continuar para o controller.
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Obtém o cabeçalho Authorization.
  const authorization = req.headers.authorization;

  // Verifica se o cabeçalho está no formato Bearer TOKEN.
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Token de autenticação não informado",
    });
    return;
  }

  // Extrai o token, removendo o prefixo "Bearer ".
  const token = authorization.substring(7).trim();

  if (!token) {
    res.status(401).json({
      message: "Token de autenticação não informado",
    });
    return;
  }

  // Obtém o segredo utilizado para validar a assinatura.
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      message: "Erro interno do servidor",
    });
    return;
  }

  let userId: number;

  try {
    // Verifica a assinatura e a expiração do JWT.
    // Apenas tokens assinados com HS256 serão aceitos.
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as JwtPayload | string;

    // Confere se o conteúdo do token possui um ID válido.
    // Neste exemplo, o login gera o campo "id".
    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "number" ||
      !Number.isSafeInteger(decoded.id) ||
      decoded.id <= 0
    ) {
      res.status(401).json({
        message: "Token inválido",
      });
      return;
    }

    userId = decoded.id;
  } catch {
    // Inclui tokens adulterados, expirados ou malformados.
    res.status(401).json({
      message: "Token inválido ou expirado",
    });
    return;
  }

  try {
    // Busca o usuário no banco a cada requisição.
    // Assim, contas excluídas não continuam tendo acesso.
    const user = db.prepare(
      "SELECT id, role FROM users WHERE id = ?"
    ).get(userId) as AuthenticatedUser | undefined;

    if (!user) {
      res.status(401).json({
        message: "Usuário não encontrado ou sessão inválida",
      });
      return;
    }

    // Guarda os dados confiáveis na requisição.
    // O papel vem do banco, nunca do corpo da requisição.
    req.user = {
      id: user.id,
      role: user.role,
    };

    // Autoriza a execução da próxima função.
    next();
  } catch (error) {
    console.error("Erro ao consultar usuário autenticado");

    res.status(500).json({
      message: "Erro interno do servidor",
    });
  }
}

// Adiciona ao tipo Request as informações do usuário autenticado.
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
