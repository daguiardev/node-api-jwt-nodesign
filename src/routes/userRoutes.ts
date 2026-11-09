
import { Router } from "express";

// Importa o middleware responsável pela autenticação.
import { authMiddleware } from "../middlewares/authMiddleware";

// Middleware de autorização da Etapa 7.
import { adminMiddleware } from '../middlewares/adminMiddleware';

// Importa os controllers das operações da própria conta.
import {
  getMe,
  updateMe,
  deleteMe,
  listUsers,
  getUserById,
  updateUserById,
  deleteUserById
} from "../controllers/userController";

const router = Router();

// GET: consulta os dados do usuário autenticado.
router.get("/me", authMiddleware, getMe);

// PUT: atualiza os dados do usuário autenticado.
router.put("/me", authMiddleware, updateMe);

// DELETE: exclui a conta do usuário autenticado.
router.delete("/me", authMiddleware, deleteMe);

/*
 * ROTAS ADMINISTRATIVAS
 *
 * Primeiro verificamos a autenticação.
 * Depois verificamos o papel administrativo.
 * Por último, executamos o controller.
 */

// Lista todos os usuários.
router.get(
  '/',
  authMiddleware,
  adminMiddleware,
  listUsers
);

// Consulta um usuário pelo ID.
router.get(
  '/:id',
  authMiddleware,
  adminMiddleware,
  getUserById
);

// Atualiza um usuário pelo ID.
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  updateUserById
);

// Exclui um usuário pelo ID.
router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  deleteUserById
);
export default router;
