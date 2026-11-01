# Letterbox — Projeto completo

Projeto pequeno com frontend HTML/CSS/JavaScript, backend Node.js/Express e banco MySQL.

## Requisitos

- Node.js instalado
- MySQL instalado e iniciado (XAMPP, WAMP ou MySQL Server)

## Instalação

1. Extraia o ZIP e abra a pasta `letterbox-completo` no VS Code.
2. Inicie o MySQL no XAMPP/WAMP ou no serviço do seu computador.
3. Abra o phpMyAdmin em `http://localhost/phpmyadmin`.
4. Vá à aba SQL e execute todo o conteúdo de `database/letterbox.sql`.
   Isso cria o banco `letterbox` e as tabelas `generos` e `filmes`.

   > **Atenção:** se você já tinha criado a tabela `filmes` da versão anterior (sem a coluna `genero_id`), execute `DROP TABLE filmes;` no banco `letterbox` antes de rodar o script. Isso apaga os filmes de teste cadastrados.
5. Na raiz do projeto, crie um arquivo chamado `.env`, copiando o conteúdo de `.env.example`.
6. Ajuste `DB_USER` e `DB_PASSWORD` conforme o seu MySQL. No XAMPP padrão, normalmente é `root` e senha vazia.
7. Abra o terminal na raiz do projeto e execute:

   ```bash
   npm install
   npm run dev
   ```

8. Acesse `http://localhost:3000`.

## Testes

- Aplicação: http://localhost:3000
- Teste da API e do MySQL: http://localhost:3000/api/health
- Listar filmes: http://localhost:3000/filmes
- Buscar por título: http://localhost:3000/filmes?busca=matrix
- Listar gêneros: http://localhost:3000/generos

A rota `/filmes` deve retornar `[]` quando a tabela estiver vazia.

## Funcionalidades

- Visual responsivo para desktop e celular.
- CRUD completo de filmes: cadastrar, listar, editar e remover.
- Filmes ligados a gêneros por chave estrangeira (listagem com `LEFT JOIN`).
- Busca por título feita no MySQL (`LIKE`).
- Regras de integridade no próprio banco: `CHECK` no ano (1888 a 2100), `UNIQUE` em título + ano e `FOREIGN KEY` com `ON DELETE SET NULL`.

## Rotas da API

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/filmes?busca=` | Lista filmes (filtro opcional por título) |
| GET | `/filmes/:id` | Busca um filme |
| POST | `/filmes` | Cadastra um filme |
| PUT | `/filmes/:id` | Atualiza um filme |
| DELETE | `/filmes/:id` | Remove um filme |
| GET | `/generos` | Lista os gêneros |

## Importante

- Abra o site por `http://localhost:3000` (não abra o HTML diretamente e não use Live Server neste pacote integrado).
- O frontend chama a API na mesma origem; não precisa configurar CORS.
- Não compartilhe nem envie seu `.env` para o GitHub.
- Este é um projeto inicial para uso local. Antes de publicar, adicione autenticação, HTTPS, validação e restrições de acesso adequadas.
