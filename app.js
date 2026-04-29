// ═══════════════════════════════════════════════════════════
//  GO-BILL · app.js
//  Firebase Auth + lógica de facturación + UI
//  ⚠️  REEMPLAZÁ los valores de firebaseConfig con los tuyos
//      desde console.firebase.google.com → Configuración del proyecto
// ═══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ─── CONFIGURACIÓN FIREBASE ────────────────────────────────
// ⚠️  REEMPLAZÁ ESTOS VALORES con los de tu proyecto Firebase
const firebaseConfig = {
  apiKey:            "AIzaSyAlGmwv0uQku_5hawF3ddM6kF5ehH69WdM",
  authDomain:        "go-bill.firebaseapp.com",
  databaseURL:       "https://go-bill-default-rtdb.firebaseio.com",
  projectId:         "go-bill",
  storageBucket:     "go-bill.firebasestorage.app",
  messagingSenderId: "454607396970",
  appId:             "1:454607396970:web:455eaa47500e8c5b5caa13",
  measurementId:     "G-3M9QMJ3LG5"
};
// ──────────────────────────────────────────────────────────

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════

const ARS = (n) => new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 2
}).format(n || 0);

const fecha = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (type ? " " + type : "");
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => { t.className = "toast hidden"; }, 3000);
}

// ═══════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════

document.getElementById("btn-google-login").addEventListener("click", async () => {
  const errEl = document.getElementById("auth-error");
  errEl.textContent = "";
  try {
    await signInWithRedirect(auth, provider);
  } catch (e) {
    errEl.textContent = "Error al iniciar sesión: " + e.message;
  }
});


// Capturar resultado al volver del redirect de Google
getRedirectResult(auth).catch((e) => {
  if (e) document.getElementById("auth-error").textContent = "Error: " + e.message;
});
document.getElementById("btn-logout").addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("screen-auth").classList.add("hidden");
    document.getElementById("screen-app").classList.remove("hidden");
    const av = document.getElementById("user-avatar");
    if (user.photoURL) { av.src = user.photoURL; av.style.display = "block"; }
    else { av.style.display = "none"; }
  } else {
    document.getElementById("screen-auth").classList.remove("hidden");
    document.getElementById("screen-app").classList.add("hidden");
  }
});

// ═══════════════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════════════

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById("tab-" + tab).classList.remove("hidden");
  });
});

// ═══════════════════════════════════════════════════════════
//  CONCEPTOS DINÁMICOS
// ═══════════════════════════════════════════════════════════

let conceptos = [{ desc: "", monto: "" }];

function renderConceptos() {
  const list = document.getElementById("conceptos-list");
  list.innerHTML = "";
  conceptos.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "concepto-row";
    row.innerHTML = `
      <input type="text" placeholder="Descripción" value="${c.desc}"
        data-i="${i}" data-k="desc" class="desc-input" />
      <input type="number" placeholder="$ 0.00" value="${c.monto}"
        data-i="${i}" data-k="monto" class="monto" />
      <button class="btn-remove-concepto" data-i="${i}" title="Eliminar">✕</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", e => {
      const i = +e.target.dataset.i;
      const k = e.target.dataset.k;
      conceptos[i][k] = e.target.value;
    });
  });
  list.querySelectorAll(".btn-remove-concepto").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = +e.target.dataset.i;
      if (conceptos.length > 1) { conceptos.splice(i, 1); renderConceptos(); }
    });
  });
}

document.getElementById("btn-add-concepto").addEventListener("click", () => {
  conceptos.push({ desc: "", monto: "" });
  renderConceptos();
});

renderConceptos();

// Fecha por defecto hoy
const hoy = new Date().toISOString().split("T")[0];
document.getElementById("f-fecha").value = hoy;

// ═══════════════════════════════════════════════════════════
//  MOTOR DE CÁLCULO (billing pipeline)
// ═══════════════════════════════════════════════════════════

function calcularFactura(data) {
  const subtotal = conceptos.reduce((s, c) => s + (parseFloat(c.monto) || 0), 0);
  const descuento = subtotal * ((parseFloat(data.descuento) || 0) / 100);
  const credito   = parseFloat(data.credito) || 0;
  const mora      = parseFloat(data.mora) || 0;
  const ivaRate   = (parseFloat(data.iva) != null ? parseFloat(data.iva) : 21) / 100;
  const baseIva   = subtotal - descuento;
  const ivaAmt    = baseIva * ivaRate;
  const total     = baseIva + ivaAmt + mora - credito;
  return { subtotal, descuento, credito, mora, ivaAmt, ivaRate, total };
}

// ═══════════════════════════════════════════════════════════
//  GENERAR FACTURA HTML
// ═══════════════════════════════════════════════════════════

document.getElementById("btn-generar").addEventListener("click", () => {
  const g = (id) => document.getElementById(id).value.trim();
  const data = {
    nombre:     g("f-nombre"),
    dni:        g("f-dni"),
    direccion:  g("f-direccion"),
    telefono:   g("f-telefono"),
    email:      g("f-email"),
    cuenta:     g("f-cuenta"),
    fecha:      g("f-fecha"),
    periodo:    g("f-periodo"),
    nrofactura: g("f-nrofactura"),
    vencimiento:g("f-vencimiento"),
    descuento:  g("f-descuento"),
    credito:    g("f-credito"),
    mora:       g("f-mora"),
    iva:        g("f-iva") || "21",
  };

  if (!data.nombre) { showToast("Ingresá el nombre del cliente", "error"); return; }

  const { subtotal, descuento, credito, mora, ivaAmt, ivaRate, total } = calcularFactura(data);

  const filasConceptos = conceptos
    .filter(c => c.desc || c.monto)
    .map(c => `<tr><td>${c.desc || "—"}</td><td>${ARS(parseFloat(c.monto)||0)}</td></tr>`)
    .join("");

  const html = `
    <div class="inv-header">
      <img src="assets/logo-personal.png" alt="Personal" class="inv-logo"
           onerror="this.outerHTML='<span class=inv-logo-placeholder>Personal</span>'" />
      <div class="inv-title">
        <h1>FACTURA</h1>
        <p>${data.nrofactura ? "N° " + data.nrofactura : ""}</p>
        <p>Fecha: ${fecha(data.fecha)}</p>
        ${data.vencimiento ? `<p>Vence: ${fecha(data.vencimiento)}</p>` : ""}
      </div>
    </div>

    <div class="inv-meta">
      <div class="inv-meta-block">
        <h3>Cliente</h3>
        <p><strong>${data.nombre}</strong></p>
        ${data.dni ? `<p>DNI: ${data.dni}</p>` : ""}
        ${data.direccion ? `<p>${data.direccion}</p>` : ""}
        ${data.telefono ? `<p>Tel: ${data.telefono}</p>` : ""}
        ${data.email ? `<p>${data.email}</p>` : ""}
      </div>
      <div class="inv-meta-block">
        <h3>Cuenta</h3>
        ${data.cuenta ? `<p>N° ${data.cuenta}</p>` : ""}
        ${data.periodo ? `<p>Período: ${data.periodo}</p>` : ""}
      </div>
    </div>

    <table class="inv-table">
      <thead>
        <tr><th>Concepto</th><th>Importe</th></tr>
      </thead>
      <tbody>
        ${filasConceptos || "<tr><td colspan='2'>Sin conceptos</td></tr>"}
      </tbody>
    </table>

    <div class="inv-totals">
      <div class="inv-total-row">
        <span>Subtotal</span><span>${ARS(subtotal)}</span>
      </div>
      ${descuento > 0 ? `
      <div class="inv-total-row">
        <span>Descuento (${data.descuento}%)</span><span>−${ARS(descuento)}</span>
      </div>` : ""}
      ${ivaRate > 0 ? `
      <div class="inv-total-row">
        <span>IVA (${data.iva}%)</span><span>${ARS(ivaAmt)}</span>
      </div>` : ""}
      ${mora > 0 ? `
      <div class="inv-total-row">
        <span>Mora / Interés</span><span>${ARS(mora)}</span>
      </div>` : ""}
      ${credito > 0 ? `
      <div class="inv-total-row">
        <span>Crédito a favor</span><span>−${ARS(credito)}</span>
      </div>` : ""}
      <div class="inv-total-row inv-total-final">
        <span>TOTAL A PAGAR</span><span>${ARS(total)}</span>
      </div>
    </div>

    <div class="inv-footer">
      Personal Argentina · Telecomunicaciones · go-bill.vercel.app
    </div>
  `;

  document.getElementById("invoice-render").innerHTML = html;

  // Guardar para mensajes
  window._lastInvoice = { ...data, total, periodo: data.periodo };

  // Ir a tab Factura
  document.querySelector('[data-tab="invoice"]').click();
  showToast("Factura generada", "success");
});

// ═══════════════════════════════════════════════════════════
//  CAPTURA / IMPRIMIR
// ═══════════════════════════════════════════════════════════

document.getElementById("btn-print").addEventListener("click", () => window.print());

document.getElementById("btn-captura").addEventListener("click", async () => {
  const el = document.getElementById("invoice-render");
  if (!el || el.querySelector(".invoice-empty")) {
    showToast("Primero generá una factura", "error"); return;
  }
  try {
    const { default: html2canvas } = await import(
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.min.js"
    );
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `factura-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Imagen descargada", "success");
  } catch (e) {
    // Fallback: imprimir como PDF
    showToast("Usá imprimir → guardar como PDF", "");
    window.print();
  }
});

// ═══════════════════════════════════════════════════════════
//  MENSAJES DE CIERRE (5 variantes)
// ═══════════════════════════════════════════════════════════

const SPEECH_TEMPLATES = {
  formal: (d) =>
    `Estimado/a ${d.nombre || "cliente"}, nos dirigimos a usted para informarle que su factura correspondiente al período ${d.periodo || "el período indicado"} ha sido procesada. El importe total a abonar es de ${ARS(d.total)}. Le solicitamos que realice el pago antes de la fecha de vencimiento indicada en el comprobante. Ante cualquier consulta, no dude en comunicarse con nosotros. Personal Argentina agradece su preferencia.`,

  cordial: (d) =>
    `Hola ${d.nombre ? d.nombre.split(" ")[0] : ""}! Te enviamos tu factura de Personal Argentina correspondiente a ${d.periodo || "este período"}. El total es de ${ARS(d.total)}. Si tenés alguna duda sobre los conceptos facturados, estamos disponibles para ayudarte. ¡Gracias por ser parte de Personal!`,

  urgente: (d) =>
    `⚠️ IMPORTANTE: ${d.nombre || "Cliente"}, su factura de Personal Argentina está próxima a vencer. Importe adeudado: ${ARS(d.total)} — período ${d.periodo || "indicado"}. Para evitar la suspensión del servicio, realice el pago a la brevedad. Podés abonar en cualquier Rapipago, Pago Fácil, cajero automático o desde la app de Personal.`,

  amigable: (d) =>
    `¡Hola ${d.nombre ? d.nombre.split(" ")[0] : ""}! 😊 Te mandamos tu factura de Personal del mes de ${d.periodo || "este mes"}. Son ${ARS(d.total)} en total. Podés pagarlo fácil por la app, en Rapipago o Pago Fácil. ¡Cualquier cosa avisame!`,

  recordatorio: (d) =>
    `Recordatorio de pago — ${d.nombre || "Cliente"}: adjuntamos el resumen de cuenta de Personal Argentina por el período ${d.periodo || "indicado"}. Total: ${ARS(d.total)}. Si ya realizaste el pago, por favor ignorá este mensaje. De lo contrario, te pedimos que lo gestiones a la brevedad. Gracias.`,
};

document.querySelectorAll(".btn-speech").forEach(btn => {
  btn.addEventListener("click", () => {
    const tone  = btn.dataset.tone;
    const inv   = window._lastInvoice || {};
    const texto = SPEECH_TEMPLATES[tone](inv);

    document.querySelectorAll(".btn-speech").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.getElementById("speech-text").textContent = texto;
    document.getElementById("speech-output").classList.remove("hidden");
  });
});

document.getElementById("btn-copy-speech").addEventListener("click", async () => {
  const txt = document.getElementById("speech-text").textContent;
  try {
    await navigator.clipboard.writeText(txt);
    showToast("Mensaje copiado", "success");
  } catch {
    showToast("No se pudo copiar — seleccionalo manualmente", "");
  }
});
