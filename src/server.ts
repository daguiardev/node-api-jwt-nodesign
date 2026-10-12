
// Importa a aplicação Express configurada em app.ts.
import app from "./app";

// Define a porta na qual o servidor receberá requisições.
const PORT: number = 3000;

/*
 * Inicia o servidor HTTP.
 *
 * O método listen faz a aplicação aguardar
 * requisições na porta especificada.
 */
app.listen(PORT, () => {

  // Exibe uma mensagem quando o servidor iniciar.
  console.log(`Servidor executando em http://localhost:${PORT}`);

});
