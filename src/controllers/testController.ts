import { Request, Response } from "express";

/**
 * Controller responsável pelo endpoint de teste.
 *
 * Um controller recebe uma requisição HTTP,
 * executa o processamento necessário e
 * devolve uma resposta ao cliente.
 */
export function testController(
  req: Request,
  res: Response
): void {

  // Retorna uma resposta HTTP 200 (OK)
  // contendo um objeto JSON.
  res.status(200).json({
    message: "API funcionando corretamente!"
  });

}