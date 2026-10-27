import { Router } from "express";

// Importa a função responsável pelo cadastro.
import { register } from "../controllers/authController";

// Cria um agrupamento de rotas do Express.
const router = Router();

// Associa o método POST à função register.
router.post("/register", register);

// Exporta as rotas para utilização no app.ts.
export default router;