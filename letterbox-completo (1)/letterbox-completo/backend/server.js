require("dotenv").config();

const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// CORS liberado só para desenvolvimento local (Live Server, file://).
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Serve o frontend e a API pela mesma origem.
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS banco");
    res.json({ status: "ok", banco: rows[0].banco });
  } catch (error) {
    console.error("Falha no teste do MySQL:", error.message);
    res.status(500).json({ erro: "Não foi possível conectar ao MySQL." });
  }
});

const SELECT_FILMES = `
  SELECT f.id, f.titulo, f.ano, f.genero_id, g.nome AS genero, f.criado_em
  FROM filmes f
  LEFT JOIN generos g ON g.id = f.genero_id`;

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Regras de negócio compartilhadas pelo cadastro (POST) e pela edição (PUT).
function validarFilme(body) {
  const { titulo, ano, genero_id } = body || {};

  if (typeof titulo !== "string" || !titulo.trim()) {
    return { erro: "Informe o título do filme." };
  }
  if (titulo.trim().length > 150) {
    return { erro: "O título pode ter no máximo 150 caracteres." };
  }

  const vazio = (v) => v === undefined || v === null || v === "";

  const anoNumerico = vazio(ano) ? null : Number(ano);
  if (anoNumerico !== null &&
      (!Number.isInteger(anoNumerico) || anoNumerico < 1888 || anoNumerico > 2100)) {
    return { erro: "Informe um ano válido entre 1888 e 2100." };
  }

  const generoId = vazio(genero_id) ? null : idValido(genero_id);
  if (!vazio(genero_id) && generoId === null) {
    return { erro: "Gênero inválido." };
  }

  return { titulo: titulo.trim(), ano: anoNumerico, generoId };
}

// Traduz erros de integridade do MySQL em respostas HTTP claras.
function responderErroBanco(res, error, mensagemPadrao) {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ erro: "Este filme já está cadastrado (mesmo título e ano)." });
  }
  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({ erro: "O gênero informado não existe." });
  }
  if (error.code === "ER_CONSTRAINT_FAILED" || error.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
    return res.status(400).json({ erro: "Os dados violam uma regra do banco de dados." });
  }
  console.error(`${mensagemPadrao}:`, error.message);
  return res.status(500).json({ erro: mensagemPadrao });
}

app.get("/generos", async (_req, res) => {
  try {
    const [generos] = await db.query("SELECT id, nome FROM generos ORDER BY nome");
    res.json(generos);
  } catch (error) {
    responderErroBanco(res, error, "Não foi possível buscar os gêneros.");
  }
});

// Lista filmes; ?busca=texto filtra por título direto no banco (LIKE).
app.get("/filmes", async (req, res) => {
  const busca = typeof req.query.busca === "string" ? req.query.busca.trim() : "";
  const padrao = `%${busca.replace(/[\\%_]/g, "\\$&")}%`;

  try {
    const [filmes] = await db.query(
      `${SELECT_FILMES} WHERE f.titulo LIKE ? ORDER BY f.id DESC`,
      [padrao]
    );
    res.json(filmes);
  } catch (error) {
    responderErroBanco(res, error, "Não foi possível buscar os filmes.");
  }
});

app.get("/filmes/:id", async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  try {
    const [rows] = await db.query(`${SELECT_FILMES} WHERE f.id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ erro: "Filme não encontrado." });
    res.json(rows[0]);
  } catch (error) {
    responderErroBanco(res, error, "Não foi possível buscar o filme.");
  }
});

app.post("/filmes", async (req, res) => {
  const dados = validarFilme(req.body);
  if (dados.erro) return res.status(400).json({ erro: dados.erro });

  try {
    const [result] = await db.query(
      "INSERT INTO filmes (titulo, ano, genero_id) VALUES (?, ?, ?)",
      [dados.titulo, dados.ano, dados.generoId]
    );
    res.status(201).json({
      mensagem: "Filme cadastrado com sucesso!",
      id: result.insertId,
      titulo: dados.titulo,
      ano: dados.ano,
      genero_id: dados.generoId
    });
  } catch (error) {
    responderErroBanco(res, error, "Não foi possível cadastrar o filme.");
  }
});

app.put("/filmes/:id", async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const dados = validarFilme(req.body);
  if (dados.erro) return res.status(400).json({ erro: dados.erro });

  try {
    const [result] = await db.query(
      "UPDATE filmes SET titulo = ?, ano = ?, genero_id = ? WHERE id = ?",
      [dados.titulo, dados.ano, dados.generoId, id]
    );
    if (!result.affectedRows) return res.status(404).json({ erro: "Filme não encontrado." });
    res.json({ mensagem: "Filme atualizado com sucesso!", id });
  } catch (error) {
    responderErroBanco(res, error, "Não foi possível atualizar o filme.");
  }
});

app.delete("/filmes/:id", async (req, res) => {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  try {
    const [result] = await db.query("DELETE FROM filmes WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ erro: "Filme não encontrado." });
    res.json({ mensagem: "Filme removido com sucesso." });
  } catch (error) {
    responderErroBanco(res, error, "Não foi possível remover o filme.");
  }
});

async function iniciar() {
  try {
    await db.garantirEstrutura();
  } catch (error) {
    console.error("Não foi possível preparar o banco de dados:", error.message);
    console.error("Confira o MySQL e o arquivo .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD).");
  }

  app.listen(PORT, () => {
    console.log(`Letterbox disponível em http://localhost:${PORT}`);
  });
}

iniciar();
