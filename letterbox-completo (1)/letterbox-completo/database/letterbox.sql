SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS letterbox
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE letterbox;

CREATE TABLE IF NOT EXISTS generos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE
);

INSERT IGNORE INTO generos (nome) VALUES
  ('Ação'), ('Comédia'), ('Drama'),
  ('Ficção científica'), ('Terror'), ('Animação');

CREATE TABLE IF NOT EXISTS filmes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  ano SMALLINT NULL,
  genero_id INT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_filmes_ano
    CHECK (ano IS NULL OR ano BETWEEN 1888 AND 2100),
  CONSTRAINT uq_filmes_titulo_ano UNIQUE (titulo, ano),
  CONSTRAINT fk_filmes_genero FOREIGN KEY (genero_id)
    REFERENCES generos (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_filmes_genero (genero_id)
);
