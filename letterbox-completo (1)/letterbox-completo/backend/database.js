const mysql = require("mysql2/promise");
require("dotenv").config();

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || ""
};
const DB_NAME = process.env.DB_NAME || "letterbox";

const db = mysql.createPool({
  ...config,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function existe(sql, params) {
  const [rows] = await db.query(sql, params);
  return rows.length > 0;
}

// Tenta aplicar uma restrição; se falhar (ex.: dados antigos duplicados), só avisa.
async function aplicarRestricao(nome, tipo, alterSql) {
  const jaExiste = await existe(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'filmes'
       AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = ?`,
    [nome, tipo]
  );
  if (jaExiste) return;
  try {
    await db.query(alterSql);
    console.log(`Restrição ${nome} criada.`);
  } catch (error) {
    console.warn(`Aviso: não foi possível criar ${nome}: ${error.message}`);
  }
}

// Cria ou atualiza o banco automaticamente ao iniciar o servidor.
// É seguro rodar várias vezes e preserva os filmes já cadastrados.
db.garantirEstrutura = async function garantirEstrutura() {
  if (!/^\w+$/.test(DB_NAME)) throw new Error("DB_NAME inválido no arquivo .env.");

  const conexao = await mysql.createConnection(config);
  try {
    await conexao.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conexao.end();
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS generos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(50) NOT NULL UNIQUE
    )`);

  await db.query(
    `INSERT IGNORE INTO generos (nome) VALUES
       ('Ação'), ('Comédia'), ('Drama'),
       ('Ficção científica'), ('Terror'), ('Animação')`
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS filmes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(150) NOT NULL,
      ano SMALLINT NULL,
      genero_id INT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

  // Tabela filmes da versão antiga: acrescenta a coluna do gênero.
  const temGenero = await existe(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'filmes' AND COLUMN_NAME = 'genero_id'`
  );
  if (!temGenero) {
    await db.query("ALTER TABLE filmes ADD COLUMN genero_id INT NULL AFTER ano");
    console.log("Tabela filmes atualizada: coluna genero_id adicionada.");
  }

  // A chave estrangeira exige o mecanismo InnoDB.
  const innodb = await existe(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'filmes' AND ENGINE = 'InnoDB'`
  );
  if (!innodb) {
    try { await db.query("ALTER TABLE filmes ENGINE = InnoDB"); }
    catch (error) { console.warn(`Aviso: não foi possível converter para InnoDB: ${error.message}`); }
  }

  await aplicarRestricao("chk_filmes_ano", "CHECK",
    "ALTER TABLE filmes ADD CONSTRAINT chk_filmes_ano CHECK (ano IS NULL OR ano BETWEEN 1888 AND 2100)");
  await aplicarRestricao("uq_filmes_titulo_ano", "UNIQUE",
    "ALTER TABLE filmes ADD CONSTRAINT uq_filmes_titulo_ano UNIQUE (titulo, ano)");
  await aplicarRestricao("fk_filmes_genero", "FOREIGN KEY",
    `ALTER TABLE filmes ADD CONSTRAINT fk_filmes_genero FOREIGN KEY (genero_id)
       REFERENCES generos (id) ON DELETE SET NULL ON UPDATE CASCADE`);

  console.log("Banco de dados pronto.");
};

module.exports = db;
