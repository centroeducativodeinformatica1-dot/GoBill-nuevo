// ═══════════════════════════════════════════════════════════
//  GO-BILL · app.js
//  Firebase Auth + lógica de facturación + UI
//  ⚠️  REEMPLAZÁ los valores de firebaseConfig con los tuyos
//      desde console.firebase.google.com → Configuración del proyecto
// ═══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged }
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

// ─── LOGIN con email/contraseña ───────────────────────────
document.getElementById("btn-login").addEventListener("click", async () => {
  const email    = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const errEl    = document.getElementById("auth-error");
  errEl.textContent = "";
  if (!email || !password) { errEl.textContent = "Ingresá correo y contraseña."; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    const msgs = {
      "auth/user-not-found":    "No existe una cuenta con ese correo.",
      "auth/wrong-password":    "Contraseña incorrecta.",
      "auth/invalid-email":     "El correo no es válido.",
      "auth/invalid-credential":"Correo o contraseña incorrectos.",
      "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos.",
    };
    errEl.textContent = msgs[e.code] || "Error: " + e.message;
  }
});

// ─── CREAR CUENTA ─────────────────────────────────────────
document.getElementById("btn-register").addEventListener("click", async () => {
  const email    = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const errEl    = document.getElementById("auth-error");
  errEl.textContent = "";
  if (!email || !password) { errEl.textContent = "Ingresá correo y contraseña."; return; }
  if (password.length < 6)  { errEl.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    const msgs = {
      "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
      "auth/invalid-email":        "El correo no es válido.",
      "auth/weak-password":        "Contraseña muy débil (mínimo 6 caracteres).",
    };
    errEl.textContent = msgs[e.code] || "Error: " + e.message;
  }
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

let conceptos = [{ desc: "", lista: "", pct: "" }];

function renderConceptos() {
  const list = document.getElementById("conceptos-list");
  list.innerHTML = "";
  conceptos.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "concepto-row";
    const lista = parseFloat(c.lista) || 0;
    const pct   = parseFloat(c.pct)   || 0;
    const desc  = lista * pct / 100;
    const neto  = lista - desc;
    row.innerHTML = `
      <input type="text"   placeholder="Ej: Internet + Cable" value="${c.desc}"
        data-i="${i}" data-k="desc" />
      <input type="number" placeholder="$ 0" value="${c.lista}"
        data-i="${i}" data-k="lista" class="monto" />
      <input type="number" placeholder="%" value="${c.pct}" min="0" max="100"
        data-i="${i}" data-k="pct" class="monto descuento-col" />
      <span class="concepto-neto">${lista > 0 ? ARS(neto) : "—"}</span>
      <button class="btn-remove-concepto" data-i="${i}" title="Eliminar">✕</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", e => {
      const i = +e.target.dataset.i;
      const k = e.target.dataset.k;
      conceptos[i][k] = e.target.value;
      if (k === "lista" || k === "pct") renderConceptos();
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
  conceptos.push({ desc: "", lista: "", pct: "" });
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
  const precioLista     = conceptos.reduce((s, c) => s + (parseFloat(c.lista) || 0), 0);
  const totalDescuentos = conceptos.reduce((s, c) => { const l = parseFloat(c.lista)||0; const p = parseFloat(c.pct)||0; return s + l*(p/100); }, 0);
  const subtotal        = precioLista - totalDescuentos;
  const credito         = parseFloat(data.credito) || 0;
  const mora            = parseFloat(data.mora)    || 0;
  const ivaRate         = (parseFloat(data.iva) != null ? parseFloat(data.iva) : 21) / 100;
  const ivaAmt          = subtotal * ivaRate;
  const total           = subtotal + ivaAmt + mora - credito;
  return { precioLista, totalDescuentos, subtotal, credito, mora, ivaAmt, ivaRate, total };
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
    credito:    g("f-credito"),
    mora:       g("f-mora"),
    iva:        g("f-iva") || "21",
  };

  if (!data.nombre) { showToast("Ingresá el nombre del cliente", "error"); return; }

  const { precioLista, totalDescuentos, subtotal, credito, mora, ivaAmt, ivaRate, total } = calcularFactura(data);

  const filasConceptos = conceptos
    .filter(c => c.desc || c.lista)
    .map(c => {
      const lista = parseFloat(c.lista) || 0;
      const pctD  = parseFloat(c.pct) || 0;
      const desc  = lista * pctD / 100;
      const neto  = lista - desc;
      return `<tr>
        <td>${c.desc || "—"}</td>
        <td class="lista-col">${ARS(lista)}</td>
        <td class="desc-col">${desc > 0 ? "−"+ARS(desc) : "—"}</td>
        <td>${ARS(neto)}</td>
      </tr>`;
    })
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
        <tr><th>Concepto</th><th>Precio lista</th><th>Descuento</th><th>Subtotal</th></tr>
      </thead>
      <tbody>
        ${filasConceptos || "<tr><td colspan='2'>Sin conceptos</td></tr>"}
      </tbody>
    </table>

    <div class="inv-totals">
      <div class="inv-total-row">
        <span>Precio de lista</span><span>${ARS(precioLista)}</span>
      </div>
      ${totalDescuentos > 0 ? `
      <div class="inv-total-row green">
        <span>Total descuentos</span><span>−${ARS(totalDescuentos)}</span>
      </div>` : ""}
      <div class="inv-total-row">
        <span>Subtotal</span><span>${ARS(subtotal)}</span>
      </div>
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
  window._lastInvoice = { ...data, total, totalDescuentos, precioLista, periodo: data.periodo };

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
//  NIVELES PERSONAL PAY
// ═══════════════════════════════════════════════════════════

const NIVELES = {
  0: null,
  1: {
    nombre:       "Nivel 1",
    consumoClientes: 0,      // solo por usar la app
    reintegroFactura: 10,    // % reintegro pagando factura
    topeReintegro: 750,
    reintegroRecarga: 20,    // % crédito extra recargas
    frecuencia: "Mensual",
    color: "#a7f3d0",
  },
  2: {
    nombre:       "Nivel 2",
    consumoClientes: 75000,
    reintegroFactura: 15,
    topeReintegro: 2000,
    reintegroRecarga: 20,
    frecuencia: "Mensual",
    color: "#00AEEF",
  },
  3: {
    nombre:       "Nivel 3",
    consumoClientes: 200000,
    reintegroFactura: 20,
    topeReintegro: 3500,
    reintegroRecarga: 20,
    frecuencia: "Mensual",
    color: "#5118C5",
  },
  4: {
    nombre:       "Nivel 4",
    consumoClientes: 300000,
    reintegroFactura: 25,
    topeReintegro: 7000,
    reintegroRecarga: 20,
    frecuencia: "Mensual",
    color: "#002B49",
  },
};

function generarSpeech(nivel, inv) {
  const nombre      = inv.nombre ? inv.nombre.split(" ")[0] : "cliente";
  const totalFact   = inv.total || 0;
  const totalDesc   = inv.totalDescuentos || 0;
  const precioLista = inv.precioLista || 0;
  const periodo     = inv.periodo || "este período";

  if (nivel === 0) {
    // Sin nivel — solo habla de la factura y descuentos logrados
    if (totalDesc > 0) {
      return `Hola ${nombre}! Te cuento que pude gestionar un descuento de ${ARS(totalDesc)} en tu factura de Personal del período ${periodo}. Tu precio de lista era ${ARS(precioLista)} y te quedó en ${ARS(totalFact)} — así que ya tenés un ahorro concreto. Cualquier consulta sobre tu servicio, estoy disponible.`;
    } else {
      return `Hola ${nombre}! Te paso el detalle de tu factura de Personal del período ${periodo}. El total es ${ARS(totalFact)}. Si querés revisar algún concepto o tenés una consulta, avisame.`;
    }
  }

  const n = NIVELES[nivel];
  const reintegroEst = Math.min(totalFact * (n.reintegroFactura / 100), n.topeReintegro);
  const ahorroTotal  = totalDesc + reintegroEst;

  let consumoMsg = "";
  if (nivel === 1) {
    consumoMsg = `y lo mejor es que ya estás en ${n.nombre} solo por usar la app de Personal`;
  } else {
    consumoMsg = `para mantenerte en ${n.nombre} necesitás un consumo desde ${ARS(n.consumoClientes)} mensual entre todos tus servicios Personal`;
  }

  let speech = `Hola ${nombre}! Mirá lo que pude hacer por vos. `;

  if (totalDesc > 0) {
    speech += `Primero, te gestioné un descuento de ${ARS(totalDesc)} directo en tu factura — bajaste de ${ARS(precioLista)} a ${ARS(totalFact)} en el período ${periodo}. `;
  } else {
    speech += `Tu factura del período ${periodo} quedó en ${ARS(totalFact)}. `;
  }

  speech += `Además, con tu ${n.nombre} de Personal Pay, pagando esta factura desde la app te entra un reintegro de hasta ${ARS(reintegroEst)} (${n.reintegroFactura}% con tope de ${ARS(n.topeReintegro)} mensual). `;

  if (ahorroTotal > 0) {
    speech += `En total, entre el descuento y el reintegro, tu margen de ahorro es de aproximadamente ${ARS(ahorroTotal)}. `;
  }

  speech += `También tenés un 20% de crédito extra en todas tus recargas Personal Pay (semanal), y hasta 15% de reintegro en Tienda Personal sin tope. `;
  speech += `Y si pagás con Personal Pay en supermercados tenés hasta 20% de ahorro semanal. `;
  speech += `${consumoMsg.charAt(0).toUpperCase() + consumoMsg.slice(1)}. `;

  if (nivel < 4) {
    const sig = NIVELES[nivel + 1];
    speech += `Si subís al ${sig.nombre} (desde ${ARS(sig.consumoClientes)}/mes), tu reintegro en factura sube al ${sig.reintegroFactura}% con tope de ${ARS(sig.topeReintegro)}.`;
  } else {
    speech += `Ya estás en el nivel máximo — aprovechá todos los beneficios.`;
  }

  return speech;
}

// ─── RENDER TARJETA DE BENEFICIOS ─────────────────────────
function renderBenefits(nivel) {
  const el = document.getElementById("speech-benefits");
  if (nivel === 0) { el.innerHTML = ""; return; }
  const n = NIVELES[nivel];
  el.innerHTML = `
    <div class="benefits-card">
      <div class="ben-badge" style="background:${n.color}">${n.nombre}</div>
      <div class="ben-items">
        <div class="ben-item">
          <span class="ben-label">Reintegro factura Personal</span>
          <span class="ben-val">${n.reintegroFactura}% · hasta ${ARS(n.topeReintegro)}/mes</span>
        </div>
        <div class="ben-item">
          <span class="ben-label">Crédito extra recargas</span>
          <span class="ben-val">20% semanal</span>
        </div>
        <div class="ben-item">
          <span class="ben-label">Tienda Personal</span>
          <span class="ben-val">Hasta 15% sin tope/mes</span>
        </div>
        <div class="ben-item">
          <span class="ben-label">Personal Pay supermercados</span>
          <span class="ben-val">Hasta 20% semanal</span>
        </div>
        ${nivel < 4 ? `<div class="ben-upgrade">▲ Próximo nivel: ${NIVELES[nivel+1].nombre} desde ${ARS(NIVELES[nivel+1].consumoClientes)}/mes → ${NIVELES[nivel+1].reintegroFactura}% reintegro</div>` : '<div class="ben-upgrade">⭐ Nivel máximo alcanzado</div>'}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
//  SIMULADOR PERSONAL PAY
// ═══════════════════════════════════════════════════════════

const SIM_NIVELES = [
  { nivel: 1, consumoMin: 0,      pct: 10, tope: 750  },
  { nivel: 2, consumoMin: 75000,  pct: 15, tope: 2000 },
  { nivel: 3, consumoMin: 200000, pct: 20, tope: 3500 },
  { nivel: 4, consumoMin: 300000, pct: 25, tope: 7000 },
];

function getNivelActual(consumo) {
  let actual = SIM_NIVELES[0];
  for (const n of SIM_NIVELES) {
    if (consumo >= n.consumoMin) actual = n;
  }
  return actual;
}

function actualizarSimulador() {
  const consumo  = parseFloat(document.getElementById("sim-consumo").value)  || 0;
  const factura  = parseFloat(document.getElementById("sim-factura").value)   || 0;
  const nivelAct = getNivelActual(consumo);

  // Highlight columna activa y calcular reintegros
  SIM_NIVELES.forEach(n => {
    const col = document.getElementById("nivel-col-" + n.nivel);
    const rei = document.getElementById("rei-" + n.nivel);
    const activo = consumo > 0 && n.nivel <= nivelAct.nivel;
    col.classList.toggle("nivel-activo", activo);
    col.classList.toggle("nivel-siguiente", consumo > 0 && n.nivel === nivelAct.nivel + 1);

    if (factura > 0) {
      const monto = Math.min(factura * (n.pct / 100), n.tope);
      rei.textContent = ARS(monto);
      rei.classList.toggle("rei-activo", activo);
    } else {
      rei.textContent = "—";
      rei.classList.remove("rei-activo");
    }
  });

  // Panel resultado
  const result = document.getElementById("sim-result");
  if (consumo > 0) {
    result.classList.remove("hidden");
    const badge   = document.getElementById("sim-nivel-badge");
    const ahorroEl = document.getElementById("sim-ahorro-total");
    const detalle  = document.getElementById("sim-detalle");

    const reintegroFact = factura > 0
      ? Math.min(factura * (nivelAct.pct / 100), nivelAct.tope) : 0;

    badge.textContent = "Nivel actual: " + nivelAct.nivel;
    badge.className   = "sim-nivel-badge n" + nivelAct.nivel;

    if (factura > 0) {
      ahorroEl.innerHTML = `Reintegro estimado pagando factura con Personal Pay: <strong>${ARS(reintegroFact)}</strong>`;
    } else {
      ahorroEl.innerHTML = `Ingresá el monto de factura para ver el reintegro estimado`;
    }

    // Siguiente nivel
    const sig = SIM_NIVELES.find(n => n.nivel === nivelAct.nivel + 1);
    if (sig) {
      const falta = sig.consumoMin - consumo;
      detalle.textContent = `Para subir al Nivel ${sig.nivel} le faltan ${ARS(falta)}/mes de consumo → reintegro sube a ${sig.pct}% (hasta ${ARS(sig.tope)}/mes)`;
    } else {
      detalle.textContent = "¡Está en el nivel máximo! Aprovechá el 25% de reintegro con tope de $7.000/mes.";
    }
  } else {
    result.classList.add("hidden");
    // reset highlights
    SIM_NIVELES.forEach(n => {
      document.getElementById("nivel-col-" + n.nivel).classList.remove("nivel-activo","nivel-siguiente");
    });
  }
}

document.getElementById("sim-consumo").addEventListener("input", actualizarSimulador);
document.getElementById("sim-factura").addEventListener("input", actualizarSimulador);

// ─── BOTONES DE NIVEL → manejados abajo con soporte de perfiles ─────────────────────────────────────

document.getElementById("btn-copy-speech").addEventListener("click", async () => {
  const txt = document.getElementById("speech-text").textContent;
  try {
    await navigator.clipboard.writeText(txt);
    showToast("Mensaje copiado", "success");
  } catch {
    showToast("No se pudo copiar — seleccionalo manualmente", "");
  }
});


// ═══════════════════════════════════════════════════════════
//  SIMULADOR EN FORMULARIO (form tab)
// ═══════════════════════════════════════════════════════════

function actualizarSimuladorForm() {
  const consumo  = parseFloat(document.getElementById("form-sim-consumo").value) || 0;
  // Use total from last generated invoice if available, otherwise sum conceptos
  const facturaAmt = (() => {
    if (window._lastInvoice && window._lastInvoice.total) return window._lastInvoice.total;
    return conceptos.reduce((s, c) => {
      const l = parseFloat(c.lista) || 0;
      const p = parseFloat(c.pct)   || 0;
      return s + (l - l * p / 100);
    }, 0);
  })();

  const nivelAct = getNivelActual(consumo);

  SIM_NIVELES.forEach(n => {
    const col = document.getElementById("form-nivel-col-" + n.nivel);
    const rei = document.getElementById("form-rei-" + n.nivel);
    if (!col) return;
    const activo    = consumo > 0 && n.nivel <= nivelAct.nivel;
    const siguiente = consumo > 0 && n.nivel === nivelAct.nivel + 1;
    col.classList.toggle("nivel-activo", activo);
    col.classList.toggle("nivel-siguiente", siguiente);

    if (facturaAmt > 0) {
      const monto = Math.min(facturaAmt * (n.pct / 100), n.tope);
      rei.textContent = ARS(monto);
      rei.classList.toggle("rei-activo", activo);
    } else {
      rei.textContent = "—";
      rei.classList.remove("rei-activo");
    }
  });

  const result = document.getElementById("form-sim-result");
  if (consumo > 0) {
    result.classList.remove("hidden");
    const badge   = document.getElementById("form-sim-nivel-badge");
    const ahorroEl = document.getElementById("form-sim-ahorro");
    const detalle  = document.getElementById("form-sim-detalle");
    badge.textContent = "Nivel actual: " + nivelAct.nivel;
    badge.className   = "sim-nivel-badge n" + nivelAct.nivel;
    if (facturaAmt > 0) {
      const rei = Math.min(facturaAmt * (nivelAct.pct / 100), nivelAct.tope);
      ahorroEl.innerHTML = `Reintegro estimado pagando con Personal Pay: <strong>${ARS(rei)}</strong>`;
    } else {
      ahorroEl.innerHTML = "Generá la factura para ver el reintegro estimado";
    }
    const sig = SIM_NIVELES.find(n => n.nivel === nivelAct.nivel + 1);
    if (sig) {
      const falta = sig.consumoMin - consumo;
      detalle.textContent = `Para subir al Nivel ${sig.nivel} le faltan ${ARS(falta)}/mes → reintegro sube a ${sig.pct}% (tope ${ARS(sig.tope)}/mes)`;
    } else {
      detalle.textContent = "¡Nivel máximo! 25% de reintegro con tope de $7.000/mes.";
    }
  } else {
    result.classList.add("hidden");
    SIM_NIVELES.forEach(n => {
      const col = document.getElementById("form-nivel-col-" + n.nivel);
      if (col) col.classList.remove("nivel-activo", "nivel-siguiente");
    });
  }
}

const formSimConsumoEl = document.getElementById("form-sim-consumo");
if (formSimConsumoEl) formSimConsumoEl.addEventListener("input", actualizarSimuladorForm);

// ═══════════════════════════════════════════════════════════
//  PERFILES DE CLIENTE
// ═══════════════════════════════════════════════════════════

let _perfilActivo = "positivo";

document.querySelectorAll(".btn-perfil").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".btn-perfil").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    _perfilActivo = btn.dataset.perfil;
    // Re-render speech if a nivel is already selected
    const nivelBtn = document.querySelector(".btn-speech.active");
    if (nivelBtn) {
      const nivel = +nivelBtn.dataset.nivel;
      const inv   = window._lastInvoice || {};
      document.getElementById("speech-text").textContent = generarSpeechConPerfil(nivel, inv, _perfilActivo);
    }
  });
});

// ─── SPEECH POR PERFIL ────────────────────────────────────

function generarSpeechConPerfil(nivel, inv, perfil) {
  const base = generarSpeechBase(nivel, inv);
  return adaptarSpeechPerfil(base, inv, nivel, perfil);
}

function generarSpeechBase(nivel, inv) {
  const nombre      = inv.nombre ? inv.nombre.split(" ")[0] : "cliente";
  const totalFact   = inv.total || 0;
  const totalDesc   = inv.totalDescuentos || 0;
  const precioLista = inv.precioLista || 0;
  const periodo     = inv.periodo || "este período";

  if (nivel === 0) {
    if (totalDesc > 0) {
      return { nombre, texto: `${nombre}, conseguí un descuento de ${ARS(totalDesc)} en tu factura de Personal — bajaste de ${ARS(precioLista)} a ${ARS(totalFact)} para el período ${periodo}. 💰 Ya tenés un ahorro concreto. Cualquier consulta, estoy.` };
    } else {
      return { nombre, texto: `${nombre}, acá está el detalle de tu factura de Personal del período ${periodo}. Total: ${ARS(totalFact)}. Cualquier consulta, avisame.` };
    }
  }

  const n = NIVELES[nivel];
  const reintegroEst = Math.min(totalFact * (n.reintegroFactura / 100), n.topeReintegro);
  const ahorroTotal  = totalDesc + reintegroEst;

  let texto = `${nombre}, conseguí esto para vos. 🎯 `;
  if (totalDesc > 0) {
    texto += `Bajé tu factura de ${ARS(precioLista)} a ${ARS(totalFact)} — ${ARS(totalDesc)} de ahorro directo. `;
  } else {
    texto += `Tu factura del período ${periodo} quedó en ${ARS(totalFact)}. `;
  }
  texto += `Pagándola con Personal Pay desde la app te entra ${ARS(reintegroEst)} de reintegro (${n.reintegroFactura}%, tope ${ARS(n.topeReintegro)}/mes). `;
  if (ahorroTotal > 0) {
    texto += `💡 En total ahorrás aproximadamente ${ARS(ahorroTotal)}. `;
  }
  texto += `Además: 20% crédito extra en recargas 📱, hasta 20% en supermercados con Personal Pay 🛒 y 15% en Tienda Personal sin tope 🛍️. `;
  if (nivel < 4) {
    const sig = NIVELES[nivel + 1];
    texto += `Si llegás a ${ARS(sig.consumoClientes)}/mes subís al ${sig.nombre} y tu reintegro sube al ${sig.reintegroFactura}% (tope ${ARS(sig.topeReintegro)}).`;
  } else {
    texto += `Estás en el nivel máximo 🏆 — aprovechá todos los beneficios.`;
  }

  return { nombre, texto };
}

function adaptarSpeechPerfil(base, inv, nivel, perfil) {
  const { nombre, texto } = base;

  const adaptaciones = {
    positivo: (t) => t,
    negativo: (t) => {
      return `${nombre}, entiendo que puede haber habido inconvenientes, pero te cuento algo concreto que logré para vos. ✅ ` + t.replace(nombre + ", ", "");
    },
    enfadado: (t) => {
      return `${nombre}, escuchame un segundo — tengo algo puntual que te va a interesar. 🛑 ` + t.replace(nombre + ", ", "") + ` Sé que hay cosas por mejorar y lo estamos trabajando.`;
    },
    confundido: (t) => {
      return `${nombre}, te explico simple y claro. 📋 ` + t.replace(nombre + ", ", "") + ` ¿Querés que repasemos juntos algún punto?`;
    },
    sabelotodo: (t) => {
      return `${nombre}, te paso los números exactos para que los evalúes. 📊 ` + t.replace(nombre + ", ", "") + ` Es información oficial de Personal Pay — cualquier detalle te lo confirmo.`;
    },
    hablador: (t) => {
      // Short and punchy
      const n = NIVELES[nivel];
      const totalFact = inv.total || 0;
      const totalDesc = inv.totalDescuentos || 0;
      if (nivel === 0) {
        return `${nombre}, rápido porque sé que tenés mucho para contar 😄: conseguí ${totalDesc > 0 ? ARS(totalDesc) + " de descuento" : "el detalle de tu factura"} en Personal. ¡Dale, seguimos!`;
      }
      const rei = Math.min(totalFact * (n.reintegroFactura / 100), n.topeReintegro);
      return `${nombre}, en dos palabras 😄: factura ${ARS(totalFact)} + ${ARS(rei)} de reintegro con Personal Pay = ${ARS(totalFact - rei)} real. ¡Conviene! Después me contás todo 😉`;
    },
    "poco-comunicativo": (t) => {
      const n = NIVELES[nivel];
      const totalFact = inv.total || 0;
      const totalDesc = inv.totalDescuentos || 0;
      if (nivel === 0) {
        return `${nombre}: factura ${ARS(totalFact)}${totalDesc > 0 ? ", descuento " + ARS(totalDesc) : ""}. ¿Alguna duda?`;
      }
      const rei = Math.min(totalFact * (n.reintegroFactura / 100), n.topeReintegro);
      return `${nombre}: factura ${ARS(totalFact)}, reintegro Personal Pay ${ARS(rei)}. ¿Pagás desde la app? 👍`;
    },
    relajado: (t) => t + " 😊 Sin apuro, cualquier consulta estoy acá.",
    controlador: (t) => {
      return `${nombre}, te detallo todo paso a paso para que lo revises. 📌 ` + t.replace(nombre + ", ", "") + ` Cualquier punto que quieras verificar, lo chequeamos juntos.`;
    },
  };

  const fn = adaptaciones[perfil] || adaptaciones.positivo;
  return fn(texto);
}

// ─── Override btn-speech listeners to use perfil ──────────
// Remove old listeners by re-querying after DOM is ready
document.querySelectorAll(".btn-speech").forEach(btn => {
  btn.addEventListener("click", () => {
    const nivel = +btn.dataset.nivel;
    const inv   = window._lastInvoice || {};
    const simConsumo  = parseFloat(document.getElementById("sim-consumo").value) || 0;
    const simFactura  = parseFloat(document.getElementById("sim-factura").value) || 0;
    if (simConsumo) inv.simConsumo = simConsumo;
    if (simFactura && !inv.total) inv.total = simFactura;

    document.querySelectorAll(".btn-speech").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    renderBenefits(nivel);
    document.getElementById("speech-text").textContent = generarSpeechConPerfil(nivel, inv, _perfilActivo);
    document.getElementById("speech-output").classList.remove("hidden");
  });
});
