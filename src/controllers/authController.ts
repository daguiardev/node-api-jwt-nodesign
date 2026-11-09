import { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../database/database";
import jwt, { type SignOptions } from "jsonwebtoken";

// Custo utilizado pelo bcrypt para gerar o hash.
const SALT_ROUNDS = 10;

/**
 * Realiza o cadastro público de um usuário.
 *
 * Recebe nome, e-mail e senha.
 * Valida os dados e salva o usuário no SQLite.
 */
export async function register(
  req: Request,
  res: Response
): Promise<void> {

  // 1. Obtém os dados enviados no corpo da requisição.
  const { name, email, password } = req.body ?? {};

  // 2. Verifica se os dados obrigatórios são válidos.
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({
      message: "Nome, e-mail e senha são obrigatórios."
    });
    return;
  }

  // 3. Remove espaços desnecessários.
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // 4. Valida o formato básico do e-mail.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    res.status(400).json({
      message: "Formato de e-mail inválido."
    });
    return;
  }

  // 5. Verifica o tamanho mínimo da senha.
  if (password.length < 8) {
    res.status(400).json({
      message: "A senha deve ter pelo menos 8 caracteres."
    });
    return;
  }

  try {

    // 6. Consulta se o e-mail já existe no banco.
    // O parâmetro ? evita concatenar dados diretamente no SQL.
    const existingUser = db.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).get(normalizedEmail);

    if (existingUser) {
      res.status(409).json({
        message: "E-mail já cadastrado."
      });
      return;
    }

    // 7. Transforma a senha em um hash usando bcrypt.
    const passwordHash = await bcrypt.hash(
      password,
      SALT_ROUNDS
    );

    // 8. Insere o usuário no banco de dados.
    // O papel é definido pelo backend, nunca pelo cliente.
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(
      normalizedName,
      normalizedEmail,
      passwordHash,
      "user"
    );

    // 9. Retorna os dados públicos do usuário criado.
    // A senha e o hash não são incluídos na resposta.
    res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user: {
        id: Number(result.lastInsertRowid),
        name: normalizedName,
        email: normalizedEmail,
        role: "user"
      }
    });

  } catch (error) {

    // 10. Trata a possibilidade de um cadastro concorrente
    // ter utilizado o mesmo e-mail.
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      res.status(409).json({
        message: "E-mail já cadastrado."
      });
      return;
    }

    // Não enviamos detalhes internos do erro ao cliente.
    res.status(500).json({
      message: "Erro interno ao cadastrar usuário."
    });
  }
}


/**
 * Representa os dados necessários para realizar o login.
 *
 * Não precisamos carregar todos os campos da tabela users.
 */
type LoginUser = {
  id: number;
  password_hash: string;
};

/**
 * Realiza a autenticação de um usuário.
 *
 * Recebe e-mail e senha, verifica as credenciais
 * e gera um token JWT quando elas são válidas.
 */
export async function login(
  req: Request,
  res: Response
): Promise<void> {
  // 1. Recebe os dados enviados pelo cliente.
  const { email, password } = req.body ?? {};

  // 2. Verifica se os dados obrigatórios foram enviados.
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    res.status(400).json({
      message: "E-mail e senha são obrigatórios"
    });
    return;
  }

  // 3. Obtém o segredo e o prazo de validade do JWT.
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN;

  // Sem o segredo, não é seguro gerar um token.
  if (!jwtSecret || !jwtExpiresIn) {
    res.status(500).json({
      message: "Erro de configuração do servidor"
    });
    return;
  }

  // 4. Consulta o banco de dados pelo e-mail informado.
  // O símbolo ? indica um parâmetro SQL.
  // Isso evita concatenar dados do usuário na consulta.
  const sql = `
    SELECT id, password_hash
    FROM users
    WHERE email = ?
  `;

  let user: LoginUser | undefined;

  try {
    user = db.prepare(sql).get(email.trim()) as LoginUser | undefined;
  } catch {
    res.status(500).json({
      message: "Erro interno do servidor"
    });
    return;
  }

  // 5. Verifica se o usuário foi encontrado.
  // A mesma mensagem será usada para senha incorreta.
  if (!user) {
    res.status(401).json({
      message: "E-mail ou senha inválidos"
    });
    return;
  }

  try {
    // 6. Compara a senha recebida com o hash armazenado.
    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    // 7. Rejeita a tentativa se a senha estiver incorreta.
    if (!validPassword) {
      res.status(401).json({
        message: "E-mail ou senha inválidos"
      });
      return;
    }

    // 8. Define o conteúdo do token.
    // Incluímos somente o identificador do usuário.
    const payload = {
      id: user.id
    };

    // 9. Configura o prazo de expiração.
    const options: SignOptions = {
      expiresIn: jwtExpiresIn as SignOptions["expiresIn"],
      algorithm: "HS256"
    };

    // 10. Gera o JWT assinado com o segredo do servidor.
    const token = jwt.sign(
      payload,
      jwtSecret,
      options
    );

    // 11. Retorna o token ao cliente.
    // Não enviamos a senha nem o hash.
    res.status(200).json({
      message: "Login realizado com sucesso",
      token
    });
  } catch {
    // Evita expor detalhes técnicos ao cliente.
    res.status(500).json({
      message: "Erro interno do servidor"
    });
  }
}
