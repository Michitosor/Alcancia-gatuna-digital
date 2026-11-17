// ============================================================
//  Alcancía Gatuna Digital 🐱🪙
//  La clave publishable es pública por diseño: la seguridad
//  real la dan las políticas RLS del Paso 3.
// ============================================================
const URL_SUPABASE = "https://ebukjoowtcrmidnsapoz.supabase.co";
const CLAVE_PUBLICA = "sb_publishable_Ps9SOhN4uVbxIwXP0paWuw_1OxgeNn8";
const cliente = supabase.createClient(URL_SUPABASE, CLAVE_PUBLICA);

// ---------- Estado ----------
let usuarioActual = null;
let entradas = [];

// ---------- Referencias al DOM ----------
const vistaLogin = document.getElementById("vista-login");
const vistaApp = document.getElementById("vista-app");
const formularioLogin = document.getElementById("formulario-login");
const formularioEntrada = document.getElementById("formulario-entrada");
const mensajeLogin = document.getElementById("mensaje-login");
const mensajeEntrada = document.getElementById("mensaje-entrada");
const nombreUsuario = document.getElementById("nombre-usuario");
const estadisticas = document.getElementById("estadisticas");
const filtroTipo = document.getElementById("filtro-tipo");
const listaEntradas = document.getElementById("lista-entradas");
const botonEntrar = document.getElementById("boton-entrar");
const botonDepositar = document.getElementById("boton-depositar");
const botonSalir = document.getElementById("boton-salir");

// ---------- Utilidades ----------
// Evita que alguien inyecte HTML/JS en los textos (seguridad XSS)
function escaparHTML(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nombreMichi(correo) {
  return (correo || "michi").split("@")[0];
}

function mostrarMensaje(elemento, texto, esError = false) {
  elemento.textContent = texto;
  elemento.classList.remove("hidden", "text-red-600", "text-green-700");
  elemento.classList.add(esError ? "text-red-600" : "text-green-700");
  clearTimeout(elemento._temporizador);
  elemento._temporizador = setTimeout(() => elemento.classList.add("hidden"), 4500);
}

// ---------- Sesión ----------
async function iniciar() {
  const { data } = await cliente.auth.getSession();
  if (data.session) {
    await entrar(data.session.user);
  } else {
    mostrarLogin();
  }
}

function mostrarLogin() {
  vistaApp.classList.add("hidden");
  vistaLogin.classList.remove("hidden");
}

async function entrar(usuario) {
  usuarioActual = usuario;
  nombreUsuario.textContent = "🐱 " + nombreMichi(usuario.email);
  vistaLogin.classList.add("hidden");
  vistaApp.classList.remove("hidden");
  await cargarAlcancia();
}

formularioLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const correo = document.getElementById("correo").value.trim();
  const contrasena = document.getElementById("contrasena").value;

  botonEntrar.disabled = true;
  botonEntrar.textContent = "Entrando… 🐾";

  const { data, error } = await cliente.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  botonEntrar.disabled = false;
  botonEntrar.textContent = "Entrar a la alcancía 🐾";

  if (error) {
    const texto = error.message === "Invalid login credentials"
      ? "Correo o contraseña incorrectos. 🙀"
      : "No se pudo entrar: " + error.message;
    mostrarMensaje(mensajeLogin, texto, true);
    return;
  }
  formularioLogin.reset();
  await entrar(data.user);
});

botonSalir.addEventListener("click", async () => {
  await cliente.auth.signOut();
  usuarioActual = null;
  entradas = [];
  mostrarLogin();
});

// ---------- La alcancía ----------
async function cargarAlcancia() {
  const { data, error } = await cliente
    .from("entradas")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    mostrarMensaje(mensajeEntrada, "No se pudo cargar la alcancía: " + error.message, true);
    return;
  }
  entradas = data ?? [];
  pintarEstadisticas();
  pintarEntradas();
}

function pintarEstadisticas() {
  const contar = (tipo) => entradas.filter((e) => e.tipo === tipo).length;
  estadisticas.innerHTML =
    `<span>🪙 ${entradas.length} monedas</span>` +
    `<span>💡 ${contar("idea")} ideas</span>` +
    `<span>📘 ${contar("concepto")} conceptos</span>` +
    `<span>🗺️ ${contar("esquema")} esquemas</span>`;
}

const INSIGNIAS = {
  idea:     { emoji: "💡", clases: "bg-yellow-100 text-yellow-800" },
  concepto: { emoji: "📘", clases: "bg-blue-100 text-blue-800" },
  esquema:  { emoji: "🗺️", clases: "bg-green-100 text-green-800" },
};

function pintarEntradas() {
  const tipoFiltro = filtroTipo.value;
  const visibles = entradas.filter((e) => tipoFiltro === "todos" || e.tipo === tipoFiltro);

  if (visibles.length === 0) {
    listaEntradas.innerHTML =
      `<p class="text-center text-stone-400 py-10">La alcancía está vacía… ¡deposita la primera moneda! 🐾</p>`;
    return;
  }

  listaEntradas.innerHTML = visibles.map((e) => {
    const insignia = INSIGNIAS[e.tipo] ?? INSIGNIAS.idea;
    const fecha = new Date(e.creado_en).toLocaleString("es", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const esMia = usuarioActual && e.usuario_id === usuarioActual.id;

    const imagen = e.imagen_url
      ? `<img src="${escaparHTML(e.imagen_url)}" alt="Esquema: ${escaparHTML(e.titulo)}"
             class="mt-3 rounded-xl max-h-64 w-auto border border-amber-100" loading="lazy" />`
      : "";

    const botonBorrar = esMia
      ? `<button data-borrar="${e.id}"
                class="shrink-0 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2.5 py-1.5 rounded-lg">
           🗑️ Borrar
         </button>`
      : "";

    return `
      <article class="bg-white rounded-2xl shadow p-5 border border-amber-100">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="text-xs font-semibold px-2 py-1 rounded-full ${insignia.clases}">
              ${insignia.emoji} ${escaparHTML(e.tipo)}
            </span>
            <h3 class="mt-2 text-lg font-bold text-stone-800">${escaparHTML(e.titulo)}</h3>
            <p class="text-sm text-amber-700 font-medium">Tema: ${escaparHTML(e.tema)}</p>
          </div>
          ${botonBorrar}
        </div>
        <p class="mt-3 text-stone-700 whitespace-pre-wrap">${escaparHTML(e.contenido)}</p>
        ${imagen}
        <p class="mt-4 text-xs text-stone-500">🐱 ${escaparHTML(e.autor)} · ${fecha}</p>
      </article>`;
  }).join("");
}

// Borrar (solo aparece en tus propias monedas; RLS lo respalda)
listaEntradas.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("[data-borrar]");
  if (!boton) return;
  if (!confirm("¿Sacar esta moneda de la alcancía? 🗑️")) return;

  const { error } = await cliente.from("entradas").delete().eq("id", boton.dataset.borrar);
  if (error) {
    mostrarMensaje(mensajeEntrada, "No se pudo borrar: " + error.message, true);
  }
  await cargarAlcancia();
});

filtroTipo.addEventListener("change", pintarEntradas);

// ---------- Depositar ----------
formularioEntrada.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const titulo = document.getElementById("titulo").value.trim();
  const tipo = document.getElementById("tipo").value;
  const tema = document.getElementById("tema").value.trim();
  const contenido = document.getElementById("contenido").value.trim();
  const archivo = document.getElementById("imagen").files[0];

  if (!titulo || !tema || !contenido) {
    mostrarMensaje(mensajeEntrada, "Completa título, tema y contenido.", true);
    return;
  }

  botonDepositar.disabled = true;
  botonDepositar.textContent = "Depositando… 🐾";

  try {
    let imagen_url = null;

    // 1) Si hay foto, primero la subimos al bucket 'esquemas'
    if (archivo) {
      if (!archivo.type.startsWith("image/")) {
        throw new Error("El archivo debe ser una imagen.");
      }
      if (archivo.size > 5 * 1024 * 1024) {
        throw new Error("La imagen pesa más de 5 MB. Usa una más liviana.");
      }
      const extension = (archivo.name.split(".").pop() || "").toLowerCase();
      if (!["png", "jpg", "jpeg", "gif", "webp"].includes(extension)) {
        throw new Error("Formato no permitido. Usa PNG, JPG, GIF o WEBP.");
      }

      const ruta = `${usuarioActual.id}/${Date.now()}.${extension}`;
      const { error: errorSubida } = await cliente.storage.from("esquemas").upload(ruta, archivo);
      if (errorSubida) throw new Error("No se pudo subir la imagen: " + errorSubida.message);

      const { data } = cliente.storage.from("esquemas").getPublicUrl(ruta);
      imagen_url = data.publicUrl;
    }

    // 2) Guardamos la moneda en la tabla 'entradas'
    const { error } = await cliente.from("entradas").insert({
      usuario_id: usuarioActual.id,
      autor: nombreMichi(usuarioActual.email),
      titulo,
      tipo,
      tema,
      contenido,
      imagen_url,
    });
    if (error) throw new Error("No se pudo depositar: " + error.message);

    formularioEntrada.reset();
    mostrarMensaje(mensajeEntrada, "¡Moneda depositada! 🪙🐱");
    await cargarAlcancia();
  } catch (err) {
    mostrarMensaje(mensajeEntrada, err.message, true);
  } finally {
    botonDepositar.disabled = false;
    botonDepositar.textContent = "Depositar moneda 🪙";
  }
});

// ---------- Arranque ----------
iniciar();