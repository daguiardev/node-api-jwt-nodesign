import { Request, Response, NextFunction } from 'express';

/**
 * Verifica se o usuário autenticado possui
 * permissão de administrador.
 *
 * Este middleware deve ser executado depois
 * do authMiddleware.
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {

  // Recupera o usuário identificado pelo authMiddleware.
  const user = req.user;

  // Impede o acesso quando não existe usuário autenticado.
  if (!user) {
    res.status(401).json({
      message: 'Usuário não autenticado'
    });
    return;
  }

  // Verifica se o usuário possui papel administrativo.
  if (user.role !== 'admin') {
    res.status(403).json({
      message: 'Acesso permitido apenas para administradores'
    });
    return;
  }

  // O usuário é administrador.
  // Permite que a requisição continue até o controller.
  next();
}