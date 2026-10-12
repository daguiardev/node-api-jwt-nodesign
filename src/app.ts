
import express, { Request, Response } from "express";

// Cria uma aplicação utilizando o framework Express.
const app = express();

/*
 * Define uma rota HTTP.
 *
 * Método: GET
 * Caminho: /
 *
 * Essa função será executada quando um cliente
 * enviar uma requisição GET para a raiz da API.
 */
app.get("/", (req: Request, res: Response) => {

  // Retorna uma resposta HTTP no formato JSON.
  res.status(200).json({
    message: "Minha primeira API com Node.js e Express!"
  });

});

// Disponibiliza a aplicação para outros arquivos.
export default app;
