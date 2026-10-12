// Carrega as variáveis definidas no arquivo .env
// para process.env antes de importar a aplicação.
import "dotenv/config";

// Importa a aplicação Express já configurada.
import app from "./app";

/**
 * Define a porta utilizada pelo servidor.
 *
 * Primeiro tenta utilizar a variável PORT.
 * Se ela não existir, utiliza a porta 3000.
 */
const PORT = Number(process.env.PORT) || 3000;

/**
 * Inicia o servidor HTTP.
 *
 * A função de callback será executada
 * quando o servidor começar a escutar
 * as requisições na porta configurada.
 */
app.listen(PORT, () => {

  console.log(
    `Servidor executando em http://localhost:${PORT}`
  );

});
