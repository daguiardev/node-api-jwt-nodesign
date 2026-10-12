import express from "express";
import cors from "cors";

// Importa as rotas de teste.
import testRoutes from "./routes/testRoutes";

// Cria a aplicação Express.
const app = express();

/**
 * Configuração do CORS.
 *
 * A variável CORS_ORIGIN define qual origem
 * poderá acessar a API por meio do navegador.
 */
const corsOrigin =
  process.env.CORS_ORIGIN || "http://localhost:4200";

app.use(cors({
  origin: corsOrigin
}));

/**
 * Middleware para interpretar JSON.
 *
 * Permite que a aplicação receba dados JSON
 * no corpo das requisições HTTP.
 */
app.use(express.json());

/**
 * Registra as rotas de teste.
 *
 * Todas as rotas definidas em testRoutes
 * receberão o prefixo "/api/test".
 */
app.use("/api/test", testRoutes);

// Exporta a aplicação Express.
// O servidor HTTP será iniciado em server.ts.
export default app;