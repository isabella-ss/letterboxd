CREATE DATABASE IF NOT EXISTS letterbox
  
USE letterbox;

-- Tabela simples do enunciado: chave (id) + descricao (nome) --> simples
CREATE TABLE IF NOT EXISTS generos (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL UNIQUE
);

-- Tabela ampliada: filmes ligados a um genero (relacionamento 1:N)
CREATE TABLE IF NOT EXISTS filmes (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  titulo    VARCHAR(150) NOT NULL,
  ano       SMALLINT NULL,
  genero_id INT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_filmes_ano
    CHECK (ano IS NULL OR ano BETWEEN 1888 AND 2100),
  CONSTRAINT uq_filmes_titulo_ano UNIQUE (titulo, ano),
  CONSTRAINT fk_filmes_genero FOREIGN KEY (genero_id)
    REFERENCES generos (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_filmes_genero (genero_id)
);

INSERT IGNORE INTO generos (nome) VALUES
  ('Ação'), ('Comédia'), ('Drama'),
  ('Ficção científica'), ('Terror'), ('Animação');

INSERT IGNORE INTO filmes (titulo, ano, genero_id) VALUES
  ('Interestelar',        2014, (SELECT id FROM generos WHERE nome = 'Ficção científica')),
  ('Cidade de Deus',      2002, (SELECT id FROM generos WHERE nome = 'Drama')),
  ('Mad Max: Estrada da Fúria', 2015, (SELECT id FROM generos WHERE nome = 'Ação')),
  ('Divertida Mente',     2015, (SELECT id FROM generos WHERE nome = 'Animação')),
  ('Filme sem classificação', NULL, NULL);



-- 4. CRUD DA TABELA generos  (tabela simples: chave + descricao)


-- INCLUSAO
INSERT INTO generos (nome) VALUES ('Romance');

-- CONSULTA: todos
SELECT id, nome FROM generos ORDER BY nome;

-- CONSULTA: por chave
SELECT id, nome FROM generos WHERE id = 1;

-- CONSULTA: por parte da descricao
SELECT id, nome FROM generos WHERE nome LIKE '%ção%' ORDER BY nome;

-- ALTERACAO
UPDATE generos SET nome = 'Romance e Drama romântico' WHERE nome = 'Romance';

-- EXCLUSAO (filmes ligados ficam com genero_id NULL, por ON DELETE SET NULL)
DELETE FROM generos WHERE nome = 'Romance e Drama romântico';



-- 5. CRUD DA TABELA filmes
-- INCLUSAO (com genero, ano opcional e genero opcional)
INSERT INTO filmes (titulo, ano, genero_id)
VALUES ('Parasita', 2019, (SELECT id FROM generos WHERE nome = 'Drama'));

INSERT INTO filmes (titulo, ano, genero_id)
VALUES ('Título sem ano e sem gênero', NULL, NULL);

-- CONSULTA: lista completa com o nome do genero (LEFT JOIN mantem filmes sem genero)
SELECT f.id, f.titulo, f.ano, f.genero_id, g.nome AS genero, f.criado_em
FROM filmes f
LEFT JOIN generos g ON g.id = f.genero_id
ORDER BY f.id DESC;

-- CONSULTA: busca por titulo (mesma logica da API: LIKE)
SELECT f.id, f.titulo, f.ano, g.nome AS genero
FROM filmes f
LEFT JOIN generos g ON g.id = f.genero_id
WHERE f.titulo LIKE '%inter%'
ORDER BY f.id DESC;

-- CONSULTA: por chave
SELECT f.id, f.titulo, f.ano, f.genero_id, g.nome AS genero, f.criado_em
FROM filmes f
LEFT JOIN generos g ON g.id = f.genero_id
WHERE f.id = 1;

-- ALTERACAO
UPDATE filmes
SET titulo = 'Parasita (Gisaengchung)', ano = 2019,
    genero_id = (SELECT id FROM generos WHERE nome = 'Drama')
WHERE titulo = 'Parasita' AND ano = 2019;

-- EXCLUSAO
DELETE FROM filmes WHERE titulo = 'Parasita (Gisaengchung)' AND ano = 2019;
DELETE FROM filmes WHERE titulo = 'Título sem ano e sem gênero';



-- 6. CONSULTAS EXTRAS (para mostrar o relacionamento 1:N)
-- Quantidade de filmes por genero (inclui generos sem filmes)
SELECT g.id, g.nome, COUNT(f.id) AS total_filmes
FROM generos g
LEFT JOIN filmes f ON f.genero_id = g.id
GROUP BY g.id, g.nome
ORDER BY total_filmes DESC, g.nome;

-- Filmes sem genero
SELECT id, titulo, ano FROM filmes WHERE genero_id IS NULL;

-- Generos que ainda nao possuem filmes
SELECT g.id, g.nome
FROM generos g
LEFT JOIN filmes f ON f.genero_id = g.id
WHERE f.id IS NULL;



-- 7. TESTES DAS REGRAS DE INTEGRIDADE

-- a) Filme repetido (mesmo titulo e ano) -> erro 1062 (UNIQUE)
-- INSERT INTO filmes (titulo, ano, genero_id) VALUES ('Interestelar', 2014, NULL);

-- b) Ano fora do intervalo -> erro 3819 (CHECK)
-- INSERT INTO filmes (titulo, ano, genero_id) VALUES ('Filme antigo demais', 1500, NULL);

-- c) Genero inexistente -> erro 1452 (FOREIGN KEY)
-- INSERT INTO filmes (titulo, ano, genero_id) VALUES ('Filme com genero falso', 2020, 9999);

-- d) Genero repetido -> erro 1062 (UNIQUE)
-- INSERT INTO generos (nome) VALUES ('Drama');

-- e) Titulo nulo -> erro 1048 (NOT NULL)
-- INSERT INTO filmes (titulo, ano, genero_id) VALUES (NULL, 2020, NULL);



-- 8. DEMONSTRACAO DE ON DELETE SET NULL (com ROLLBACK, nao altera os dados)

START TRANSACTION;

  -- antes: filmes de Drama
  SELECT f.titulo, f.genero_id FROM filmes f
  WHERE f.genero_id = (SELECT id FROM generos WHERE nome = 'Drama');

  DELETE FROM generos WHERE nome = 'Drama';

  -- depois: os filmes continuam existindo, com genero_id NULL
  SELECT f.titulo, f.genero_id FROM filmes f WHERE f.titulo = 'Cidade de Deus';

ROLLBACK;  -- desfaz: o genero Drama volta ao normal
