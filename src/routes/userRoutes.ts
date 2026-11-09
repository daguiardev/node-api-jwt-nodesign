
import { Router } from "express";

// Importa o middleware responsável pela autenticação.
import { authMiddleware } from "../middlewares/authMiddleware";

// Importa os controllers das operações da própria conta.
import {
  getMe,
  updateMe,
  deleteMe,
} from "../controllers/userController";

const router = Router();

// GET: consulta os dados do usuário autenticado.
router.get("/me", authMiddleware, getMe);

// PUT: atualiza os dados do usuário autenticado.
router.put("/me", authMiddleware, updateMe);

// DELETE: exclui a conta do usuário autenticado.
router.delete("/me", authMiddleware, deleteMe);

export default router;
