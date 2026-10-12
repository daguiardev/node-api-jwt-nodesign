import { Router } from "express";

// Importa a função responsável por processar
// as requisições do endpoint de teste.
import { testController } from "../controllers/testController";

// Cria um objeto Router, utilizado para
// organizar as rotas da aplicação.
const router = Router();

/**
 * Define uma rota HTTP GET.
 *
 * Quando o cliente acessar o caminho "/",
 * a função testController será executada.
 *
 * O prefixo da URL será definido em app.ts.
 */
router.get("/", testController);

// Exporta o conjunto de rotas para ser
// utilizado em outros arquivos.
export default router;