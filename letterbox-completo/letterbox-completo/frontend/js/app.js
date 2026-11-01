// Endereço do backend Node.js. Altere se sua API estiver em outro endereço.
const API_URL = window.location.port === "3000"
  ? "" // Aberto por http://localhost:3000: mesma origem.
  : "http://localhost:3000"; // Live Server ou arquivo aberto direto: aponta para o backend.

const filmGrid = document.getElementById("film-grid");
const filmCount = document.getElementById("film-count");
const statusMessage = document.getElementById("status-message");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const dialog = document.getElementById("film-dialog");
const filmForm = document.getElementById("film-form");
const formError = document.getElementById("form-error");

let filmes = [];
let totalFilmes = 0;
let editingId = null;     // null = cadastro novo; número = editando esse filme
let searchTimer = null;
let loadCounter = 0;      // garante que só a resposta mais recente atualiza a tela
const genreSelect = document.getElementById("genre");

const palettes = [
  { bg: "#d9dfc9", ink: "#294636", accent: "#e58a58" },
  { bg: "#e8d4c1", ink: "#593d32", accent: "#b96e50" },
  { bg: "#c9d8d8", ink: "#24464b", accent: "#e2b95f" },
  { bg: "#d8cce0", ink: "#483b59", accent: "#b87a91" },
  { bg: "#e7dfb9", ink: "#4d4a2e", accent: "#d58c53" },
  { bg: "#cbd5e8", ink: "#34435e", accent: "#d77b65" }
];

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b94d3b" : "";
}

function renderFilms() {
  const term = searchInput.value.trim();
  const filtered = filmes; // o filtro por título já foi feito no MySQL (LIKE)

  filmGrid.innerHTML = "";
  if (!term) totalFilmes = filmes.length;
  filmCount.textContent = totalFilmes;
  emptyState.hidden = filtered.length !== 0;
  if (filtered.length) showStatus("");

  filtered.forEach((film, index) => {
    const palette = palettes[index % palettes.length];
    const card = document.createElement("article");
    card.className = "film-card";

    const art = document.createElement("div");
    art.className = "film-art";
    art.style.setProperty("--card-bg", palette.bg);
    art.style.setProperty("--card-ink", palette.ink);
    art.style.setProperty("--card-accent", palette.accent);

    const number = document.createElement("span");
    number.className = "film-number";
    number.textContent = `FILM NO. ${String(index + 1).padStart(3, "0")}`;

    const titleOnArt = document.createElement("span");
    titleOnArt.className = "film-art-title";
    titleOnArt.textContent = film.titulo;

    art.append(number, titleOnArt);

    const info = document.createElement("div");
    info.className = "film-info";

    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = film.titulo;
    const year = document.createElement("p");
    year.textContent = film.ano || "Ano não informado";
    details.append(title, year);
    if (film.genero) {
      const genre = document.createElement("span");
      genre.className = "film-genre";
      genre.textContent = film.genero;
      details.append(genre);
    }

    const edit = document.createElement("button");
    edit.className = "edit-button";
    edit.type = "button";
    edit.textContent = "✎";
    edit.title = `Editar ${film.titulo}`;
    edit.setAttribute("aria-label", `Editar ${film.titulo}`);
    edit.addEventListener("click", () => openDialog(film));

    const remove = document.createElement("button");
    remove.className = "delete-button";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = `Remover ${film.titulo}`;
    remove.setAttribute("aria-label", `Remover ${film.titulo}`);
    remove.addEventListener("click", () => deleteFilm(film.id));

    const actions = document.createElement("div");
    actions.className = "film-actions";
    actions.append(edit, remove);

    info.append(details, actions);
    card.append(art, info);
    filmGrid.appendChild(card);
  });
}

async function loadGenres() {
  try {
    const response = await fetch(`${API_URL}/generos`);
    if (!response.ok) throw new Error("A API retornou um erro.");
    const generos = await response.json();
    generos.forEach((g) => {
      const option = document.createElement("option");
      option.value = g.id;
      option.textContent = g.nome;
      genreSelect.appendChild(option);
    });
  } catch (error) {
    console.error(error); // o formulário continua funcionando sem gênero
  }
}

async function loadFilms() {
  const myLoad = ++loadCounter;
  const term = searchInput.value.trim();
  showStatus("Carregando sua coleção...");
  try {
    const response = await fetch(`${API_URL}/filmes?busca=${encodeURIComponent(term)}`);
    if (!response.ok) throw new Error("A API retornou um erro.");
    const data = await response.json();
    if (myLoad !== loadCounter) return; // chegou uma busca mais nova; ignora esta
    filmes = data;
    renderFilms();
    if (filmes.length === 0) showStatus("");
  } catch (error) {
    if (myLoad !== loadCounter) return;
    console.error(error);
    showStatus("Não foi possível conectar à API. Confira se o backend está rodando.", true);
    emptyState.hidden = true;
  }
}

async function saveFilm(event) {
  event.preventDefault();
  formError.textContent = "";

  const titulo = document.getElementById("title").value.trim();
  const ano = document.getElementById("year").value;
  const genero_id = genreSelect.value;

  if (!titulo) {
    formError.textContent = "Digite o título do filme.";
    return;
  }

  const editing = editingId !== null;
  const url = editing ? `${API_URL}/filmes/${editingId}` : `${API_URL}/filmes`;

  try {
    const response = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, ano: ano || null, genero_id: genero_id || null })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || "Não foi possível salvar o filme.");

    filmForm.reset();
    dialog.close();
    await loadFilms();
  } catch (error) {
    formError.textContent = error.message;
  }
}

async function deleteFilm(id) {
  if (!confirm("Tem certeza de que deseja remover este filme?")) return;

  try {
    const response = await fetch(`${API_URL}/filmes/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || "Não foi possível remover o filme.");
    await loadFilms();
  } catch (error) {
    showStatus(error.message, true);
  }
}

function openDialog(film = null) {
  // Sem argumento = novo filme; com um filme (objeto com id) = edição.
  const editing = film && typeof film.id === "number";
  editingId = editing ? film.id : null;

  filmForm.reset();
  formError.textContent = "";
  document.getElementById("dialog-eyebrow").textContent = editing ? "EDITAR ENTRADA" : "NOVA ENTRADA";
  document.getElementById("dialog-title").innerHTML = editing
    ? "Editar <em>filme.</em>"
    : "Adicionar <em>filme.</em>";
  document.getElementById("dialog-intro").textContent = editing
    ? "Atualize as informações deste título."
    : "Registre mais uma história na sua estante.";

  if (editing) {
    document.getElementById("title").value = film.titulo;
    document.getElementById("year").value = film.ano ?? "";
    genreSelect.value = film.genero_id ?? "";
  }

  dialog.showModal();
  document.getElementById("title").focus();
}

document.getElementById("open-modal").addEventListener("click", () => openDialog());
document.getElementById("empty-add").addEventListener("click", () => openDialog());
document.getElementById("close-modal").addEventListener("click", () => dialog.close());
filmForm.addEventListener("submit", saveFilm);
// Busca no MySQL com um pequeno atraso para não consultar a cada tecla.
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadFilms, 250);
});

// Fecha o modal ao clicar fora do cartão.
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

loadGenres();
loadFilms();
