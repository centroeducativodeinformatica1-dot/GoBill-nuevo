// ═══════════════════════════════════════════════════════════
//  GO-BILL · app.js  v2
// ═══════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════

const ARS = (n) => new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 2
}).format(n || 0);

const fechaStr = (iso) => {
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
//  CICLOS DE FACTURACIÓN
// ═══════════════════════════════════════════════════════════

// Reglas de vencimiento por ciclo (días del mes siguiente o mismo mes)
const CICLOS_CONFIG = {
  7:  { emisionDia: 7,  vencMin: 22, vencMax: 30, mismoMes: true  },
  14: { emisionDia: 14, vencMin: 1,  vencMax: 6,  mismoMes: false },
  21: { emisionDia: 21, vencMin: 5,  vencMax: 14, mismoMes: false },
  28: { emisionDia: 28, vencMin: 12, vencMax: 20, mismoMes: false },
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function aplicarCiclo(ciclo) {
  const cfg  = CICLOS_CONFIG[ciclo];
  const hoy  = new Date();
  const anio = hoy.getFullYear();
  const mes  = hoy.getMonth(); // 0-based

  // Próxima fecha de emisión = próxima ocurrencia del día del ciclo
  let emisionFecha = new Date(anio, mes, cfg.emisionDia);
  if (emisionFecha <= hoy) {
    // Ya pasó este mes, ir al próximo
    emisionFecha = new Date(anio, mes + 1, cfg.emisionDia);
  }

  // Vencimiento: promedio de vencMin y vencMax, en el mes correcto
  const vencDia  = Math.round((cfg.vencMin + cfg.vencMax) / 2);
  const vencMes  = cfg.mismoMes ? emisionFecha.getMonth() : emisionFecha.getMonth() + 1;
  const vencFecha = new Date(emisionFecha.getFullYear(), vencMes, vencDia);

  // Período = mes de emisión
  const periodoStr = MESES[emisionFecha.getMonth()] + " " + emisionFecha.getFullYear();

  const toISO = (d) => d.toISOString().split("T")[0];

  document.getElementById("f-fecha").value      = toISO(emisionFecha);
  document.getElementById("f-vencimiento").value = toISO(vencFecha);
  document.getElementById("f-periodo").value     = periodoStr;

  document.getElementById("ciclo-hint").textContent =
    `Ciclo ${ciclo}: emisión día ${cfg.emisionDia} → vencimiento entre el ${cfg.vencMin} y el ${cfg.vencMax} ${cfg.mismoMes ? "del mismo mes" : "del mes siguiente"}`;

  document.querySelectorAll(".btn-ciclo").forEach(b => b.classList.remove("active"));
  document.querySelector(`.btn-ciclo[data-ciclo="${ciclo}"]`).classList.add("active");
}

document.querySelectorAll(".btn-ciclo").forEach(btn => {
  btn.addEventListener("click", () => aplicarCiclo(+btn.dataset.ciclo));
});

// ═══════════════════════════════════════════════════════════
//  SECCIONES: HOGAR / MÓVIL
// ═══════════════════════════════════════════════════════════

const secciones = {
  hogar: [{ desc: "", lista: "", pct: "" }],
  movil: [{ desc: "", lista: "", pct: "" }],
};

function renderSeccion(sec) {
  const list = document.getElementById("conceptos-" + sec);
  list.innerHTML = "";
  secciones[sec].forEach((c, i) => {
    const row  = document.createElement("div");
    row.className = "concepto-row";
    const lista = parseFloat(c.lista) || 0;
    const pct   = parseFloat(c.pct)   || 0;
    const neto  = lista - lista * pct / 100;
    row.innerHTML =
      `<input type="text" placeholder="Descripción" value="${c.desc}" data-sec="${sec}" data-i="${i}" data-k="desc" />` +
      `<input type="number" placeholder="$ 0" value="${c.lista}" data-sec="${sec}" data-i="${i}" data-k="lista" class="monto" />` +
      `<input type="number" placeholder="%" value="${c.pct}" min="0" max="100" data-sec="${sec}" data-i="${i}" data-k="pct" class="monto" />` +
      `<span class="concepto-neto">${lista > 0 ? ARS(neto) : "—"}</span>` +
      `<button class="btn-remove-concepto" data-sec="${sec}" data-i="${i}" title="Eliminar">✕</button>`;
    list.appendChild(row);
  });

  list.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", e => {
      const s = e.target.dataset.sec;
      const i = +e.target.dataset.i;
      const k = e.target.dataset.k;
      secciones[s][i][k] = e.target.value;
      renderSeccion(s);
    });
  });

  list.querySelectorAll(".btn-remove-concepto").forEach(btn => {
    btn.addEventListener("click", e => {
      const s = e.target.dataset.sec;
      const i = +e.target.dataset.i;
      if (secciones[s].length > 1) { secciones[s].splice(i, 1); renderSeccion(s); }
      else { secciones[s][0] = { desc:"", lista:"", pct:"" }; renderSeccion(s); }
    });
  });
}

document.querySelectorAll(".btn-add[data-seccion]").forEach(btn => {
  btn.addEventListener("click", () => {
    const sec = btn.dataset.seccion;
    secciones[sec].push({ desc: "", lista: "", pct: "" });
    renderSeccion(sec);
  });
});

renderSeccion("hogar");
renderSeccion("movil");

// ═══════════════════════════════════════════════════════════
//  ADICIONALES
// ═══════════════════════════════════════════════════════════

let adicionales = [];

function renderAdicionales() {
  const list = document.getElementById("adicionales-list");
  list.innerHTML = "";
  adicionales.forEach((a, i) => {
    const lista = parseFloat(a.lista) || 0;
    const pct   = parseFloat(a.pct)   || 0;
    const neto  = lista - lista * pct / 100;
    const row   = document.createElement("div");
    row.className = "adicional-row";
    row.innerHTML =
      `<span class="adicional-nombre">` +
        (a.logo ? `<img src="${a.logo}" class="adicional-logo" alt="${a.nombre}" onerror="this.style.display='none'" />` : "") +
        `<input type="text" placeholder="Nombre" value="${a.nombre}" data-i="${i}" data-k="nombre" class="adicional-name-input" />` +
      `</span>` +
      `<input type="number" placeholder="$ lista" value="${a.lista}" data-i="${i}" data-k="lista" class="monto" />` +
      `<input type="number" placeholder="%" value="${a.pct}" min="0" max="100" data-i="${i}" data-k="pct" class="monto" />` +
      `<span class="concepto-neto">${lista > 0 ? ARS(neto) : "—"}</span>` +
      `<button class="btn-remove-concepto" data-i="${i}" title="Eliminar">✕</button>`;
    list.appendChild(row);
  });

  list.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("change", e => {
      const i = +e.target.dataset.i;
      const k = e.target.dataset.k;
      adicionales[i][k] = e.target.value;
      renderAdicionales();
    });
  });

  list.querySelectorAll(".btn-remove-concepto").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = +e.target.dataset.i;
      adicionales.splice(i, 1);
      renderAdicionales();
    });
  });
}

document.querySelectorAll(".btn-preset").forEach(btn => {
  btn.addEventListener("click", () => {
    adicionales.push({ nombre: btn.dataset.nombre, logo: btn.dataset.logo, lista: "", pct: "" });
    renderAdicionales();
  });
});

// ═══════════════════════════════════════════════════════════
//  MOTOR DE CÁLCULO
// ═══════════════════════════════════════════════════════════

function calcularFactura(data) {
  const calcSec = (sec) => secciones[sec].reduce((s, c) => {
    const l = parseFloat(c.lista) || 0;
    const p = parseFloat(c.pct)   || 0;
    return { lista: s.lista + l, desc: s.desc + l * p / 100 };
  }, { lista: 0, desc: 0 });

  const hogar  = calcSec("hogar");
  const movil  = calcSec("movil");

  const adicionalesLista = adicionales.reduce((s, a) => s + (parseFloat(a.lista) || 0), 0);
  const adicionalesDesc  = adicionales.reduce((s, a) => {
    const l = parseFloat(a.lista) || 0;
    const p = parseFloat(a.pct)   || 0;
    return s + l * p / 100;
  }, 0);

  const precioLista      = hogar.lista + movil.lista + adicionalesLista;
  const descuentosPct    = hogar.desc  + movil.desc  + adicionalesDesc;
  const descuentoCT      = parseFloat(data.descuentoCT) || 0;
  const totalDescuentos  = descuentosPct + descuentoCT;

  const subtotal  = precioLista - totalDescuentos;
  const credito   = parseFloat(data.credito) || 0;
  const mora      = parseFloat(data.mora)    || 0;
  const ivaRate   = (parseFloat(data.iva) || 21) / 100;
  const ivaAmt    = subtotal * ivaRate;
  const total     = subtotal + ivaAmt + mora - credito;

  return { precioLista, descuentosPct, descuentoCT, totalDescuentos, subtotal, credito, mora, ivaAmt, ivaRate, total, hogar, movil, adicionalesLista, adicionalesDesc };
}

// ═══════════════════════════════════════════════════════════
//  GENERAR FACTURA HTML
// ═══════════════════════════════════════════════════════════

document.getElementById("btn-generar").addEventListener("click", () => {
  const g = (id) => document.getElementById(id).value.trim();
  const data = {
    nombre:      g("f-nombre"),
    cuenta:      g("f-cuenta"),
    fecha:       g("f-fecha"),
    periodo:     g("f-periodo"),
    nrofactura:  g("f-nrofactura"),
    vencimiento: g("f-vencimiento"),
    credito:     g("f-credito"),
    mora:        g("f-mora"),
    iva:         g("f-iva") || "21",
    descuentoCT: g("f-descuento-ct"),
  };

  if (!data.nombre) { showToast("Ingresá el nombre del cliente", "error"); return; }

  const { precioLista, totalDescuentos, descuentoCT, subtotal, credito, mora, ivaAmt, ivaRate, total, hogar, movil, adicionalesLista, adicionalesDesc } = calcularFactura(data);

  const filasSec = (sec, titulo) => {
    const items = secciones[sec].filter(c => c.desc || c.lista);
    if (!items.length) return "";
    const rows = items.map(c => {
      const l = parseFloat(c.lista) || 0;
      const p = parseFloat(c.pct)   || 0;
      const d = l * p / 100;
      const n = l - d;
      return `<tr>
        <td>${c.desc || "—"}</td>
        <td class="lista-col">${ARS(l)}</td>
        <td class="desc-col">${d > 0 ? "−" + ARS(d) + " (" + p + "%)" : "—"}</td>
        <td>${ARS(n)}</td>
      </tr>`;
    }).join("");
    return `<tr class="sec-header"><td colspan="4">${titulo}</td></tr>${rows}`;
  };

  const filasAdicionales = adicionales.filter(a => a.nombre || a.lista).map(a => {
    const l = parseFloat(a.lista) || 0;
    const p = parseFloat(a.pct)   || 0;
    const d = l * p / 100;
    const n = l - d;
    return `<tr>
      <td>${a.nombre || "Adicional"}</td>
      <td class="lista-col">${ARS(l)}</td>
      <td class="desc-col">${d > 0 ? "−" + ARS(d) + " (" + p + "%)" : "—"}</td>
      <td>${ARS(n)}</td>
    </tr>`;
  }).join("");

  const filasAdicSection = filasAdicionales
    ? `<tr class="sec-header"><td colspan="4">🎬 Adicionales</td></tr>${filasAdicionales}` : "";

  const html = `
    <div class="inv-header">
      <img src="assets/logo-personal.png" alt="Personal" class="inv-logo"
           onerror="this.outerHTML='<span class=inv-logo-placeholder>Personal</span>'" />
      <div class="inv-title">
        <h1>FACTURA</h1>
        <p class="inv-nro">${data.nrofactura || "—"}</p>
      </div>
    </div>

    <div class="inv-meta">
      <div class="inv-meta-col">
        <div class="inv-meta-row"><span>Cliente</span><strong>${data.nombre}</strong></div>
        ${data.cuenta ? `<div class="inv-meta-row"><span>Cuenta</span><strong>${data.cuenta}</strong></div>` : ""}
      </div>
      <div class="inv-meta-col">
        <div class="inv-meta-row"><span>Período</span><strong>${data.periodo || "—"}</strong></div>
        <div class="inv-meta-row"><span>Emisión</span><strong>${fechaStr(data.fecha)}</strong></div>
        <div class="inv-meta-row venc"><span>Vencimiento</span><strong>${fechaStr(data.vencimiento)}</strong></div>
      </div>
    </div>

    <table class="inv-table">
      <thead>
        <tr><th>Concepto</th><th>Precio lista</th><th>Descuento</th><th>Subtotal</th></tr>
      </thead>
      <tbody>
        ${filasSec("hogar", "🏠 Hogar") || ""}
        ${filasSec("movil", "📱 Móvil") || ""}
        ${filasAdicSection}
        ${(!filasSec("hogar","") && !filasSec("movil","") && !filasAdicionales)
          ? "<tr><td colspan='4' style='text-align:center;color:#aaa'>Sin conceptos</td></tr>" : ""}
      </tbody>
    </table>

    <div class="inv-totals">
      <div class="inv-total-row"><span>Precio de lista</span><span>${ARS(precioLista)}</span></div>
      ${totalDescuentos > 0 ? `<div class="inv-total-row green"><span>Total descuentos</span><span>−${ARS(totalDescuentos)}</span></div>` : ""}
      ${descuentoCT > 0 ? `<div class="inv-total-row green desc-ct"><span>↳ Desc. Conexión Total</span><span>−${ARS(descuentoCT)}</span></div>` : ""}
      <div class="inv-total-row"><span>Subtotal</span><span>${ARS(subtotal)}</span></div>
      ${ivaRate > 0 ? `<div class="inv-total-row"><span>IVA (${data.iva}%)</span><span>${ARS(ivaAmt)}</span></div>` : ""}
      ${mora > 0 ? `<div class="inv-total-row"><span>Mora / Interés</span><span>${ARS(mora)}</span></div>` : ""}
      ${credito > 0 ? `<div class="inv-total-row"><span>Crédito a favor</span><span>−${ARS(credito)}</span></div>` : ""}
      <div class="inv-total-row inv-total-final"><span>TOTAL A PAGAR</span><span>${ARS(total)}</span></div>
    </div>

    <div class="inv-footer">Personal Argentina · Telecomunicaciones · go-bill.vercel.app</div>
  `;

  document.getElementById("invoice-render").innerHTML = html;
  window._lastInvoice = { ...data, total, totalDescuentos, precioLista, periodo: data.periodo };

  // Switch to invoice tab
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  document.querySelector('.tab-btn[data-tab="invoice"]').classList.add("active");
  document.getElementById("tab-invoice").classList.remove("hidden");

  // Update form simulator
  actualizarSimuladorForm();
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
    showToast("Usá imprimir → guardar como PDF", "");
    window.print();
  }
});

// ═══════════════════════════════════════════════════════════
//  NIVELES PERSONAL PAY
// ═══════════════════════════════════════════════════════════

const NIVELES = {
  0: null,
  1: { nombre: "Nivel 1", consumoClientes: 0,      reintegroFactura: 10, topeReintegro: 750,  color: "#a7f3d0" },
  2: { nombre: "Nivel 2", consumoClientes: 75000,  reintegroFactura: 15, topeReintegro: 2000, color: "#00AEEF" },
  3: { nombre: "Nivel 3", consumoClientes: 200000, reintegroFactura: 20, topeReintegro: 3500, color: "#5118C5" },
  4: { nombre: "Nivel 4", consumoClientes: 300000, reintegroFactura: 25, topeReintegro: 7000, color: "#002B49" },
};

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

// ─── SIMULADOR MENSAJE TAB ────────────────────────────────

function actualizarSimulador() {
  const consumo = parseFloat(document.getElementById("sim-consumo").value) || 0;
  const factura = parseFloat(document.getElementById("sim-factura").value) || 0;
  const nivelAct = getNivelActual(consumo);

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

  const result = document.getElementById("sim-result");
  if (consumo > 0) {
    result.classList.remove("hidden");
    const badge    = document.getElementById("sim-nivel-badge");
    const ahorroEl = document.getElementById("sim-ahorro-total");
    const detalle  = document.getElementById("sim-detalle");
    const rei      = factura > 0 ? Math.min(factura * (nivelAct.pct / 100), nivelAct.tope) : 0;
    badge.textContent = "Nivel actual: " + nivelAct.nivel;
    badge.className   = "sim-nivel-badge n" + nivelAct.nivel;
    ahorroEl.innerHTML = factura > 0
      ? `Reintegro estimado pagando con Personal Pay: <strong>${ARS(rei)}</strong>`
      : "Ingresá el monto de factura para ver el reintegro estimado";
    const sig = SIM_NIVELES.find(n => n.nivel === nivelAct.nivel + 1);
    detalle.textContent = sig
      ? `Para subir al Nivel ${sig.nivel} le faltan ${ARS(sig.consumoMin - consumo)}/mes → reintegro sube a ${sig.pct}% (hasta ${ARS(sig.tope)}/mes)`
      : "¡Está en el nivel máximo! Aprovechá el 25% de reintegro con tope de $7.000/mes.";
  } else {
    result.classList.add("hidden");
    SIM_NIVELES.forEach(n => {
      document.getElementById("nivel-col-" + n.nivel).classList.remove("nivel-activo","nivel-siguiente");
    });
  }
}

document.getElementById("sim-consumo").addEventListener("input", actualizarSimulador);
document.getElementById("sim-factura").addEventListener("input", actualizarSimulador);

// ─── SIMULADOR FORMULARIO TAB ────────────────────────────

function actualizarSimuladorForm() {
  const consumo = parseFloat(document.getElementById("form-sim-consumo").value) || 0;
  const facturaAmt = (() => {
    if (window._lastInvoice && window._lastInvoice.total) return window._lastInvoice.total;
    return 0;
  })();
  const nivelAct = getNivelActual(consumo);

  SIM_NIVELES.forEach(n => {
    const col = document.getElementById("form-nivel-col-" + n.nivel);
    const rei = document.getElementById("form-rei-" + n.nivel);
    if (!col) return;
    const activo = consumo > 0 && n.nivel <= nivelAct.nivel;
    col.classList.toggle("nivel-activo", activo);
    col.classList.toggle("nivel-siguiente", consumo > 0 && n.nivel === nivelAct.nivel + 1);
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
    const badge    = document.getElementById("form-sim-nivel-badge");
    const ahorroEl = document.getElementById("form-sim-ahorro");
    const detalle  = document.getElementById("form-sim-detalle");
    badge.textContent = "Nivel actual: " + nivelAct.nivel;
    badge.className   = "sim-nivel-badge n" + nivelAct.nivel;
    ahorroEl.innerHTML = facturaAmt > 0
      ? `Reintegro estimado: <strong>${ARS(Math.min(facturaAmt * (nivelAct.pct / 100), nivelAct.tope))}</strong>`
      : "Generá la factura para ver el reintegro estimado";
    const sig = SIM_NIVELES.find(n => n.nivel === nivelAct.nivel + 1);
    detalle.textContent = sig
      ? `Para subir al Nivel ${sig.nivel} le faltan ${ARS(sig.consumoMin - consumo)}/mes → ${sig.pct}% reintegro (tope ${ARS(sig.tope)}/mes)`
      : "¡Nivel máximo! 25% de reintegro con tope de $7.000/mes.";
  } else {
    result.classList.add("hidden");
    SIM_NIVELES.forEach(n => {
      const col = document.getElementById("form-nivel-col-" + n.nivel);
      if (col) col.classList.remove("nivel-activo", "nivel-siguiente");
    });
  }
}

document.getElementById("form-sim-consumo").addEventListener("input", actualizarSimuladorForm);

// ═══════════════════════════════════════════════════════════
//  PERFILES + SPEECHES
// ═══════════════════════════════════════════════════════════

let _perfilActivo = "positivo";

document.querySelectorAll(".btn-perfil").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".btn-perfil").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    _perfilActivo = btn.dataset.perfil;
    const nivelBtn = document.querySelector(".btn-speech.active");
    if (nivelBtn) {
      const nivel = +nivelBtn.dataset.nivel;
      const inv   = window._lastInvoice || {};
      document.getElementById("speech-text").textContent = generarSpeechConPerfil(nivel, inv, _perfilActivo);
    }
  });
});

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
        ${nivel < 4
          ? `<div class="ben-upgrade">▲ Próximo nivel: ${NIVELES[nivel+1].nombre} desde ${ARS(NIVELES[nivel+1].consumoClientes)}/mes → ${NIVELES[nivel+1].reintegroFactura}% reintegro</div>`
          : '<div class="ben-upgrade">⭐ Nivel máximo alcanzado</div>'}
      </div>
    </div>`;
}

function generarSpeechConPerfil(nivel, inv, perfil) {
  const nombre      = inv.nombre ? inv.nombre.split(" ")[0] : "cliente";
  const totalFact   = inv.total || 0;
  const totalDesc   = inv.totalDescuentos || 0;
  const precioLista = inv.precioLista || 0;
  const periodo     = inv.periodo || "este período";

  let base;
  if (nivel === 0) {
    base = totalDesc > 0
      ? `${nombre}, conseguí ${ARS(totalDesc)} de descuento en tu factura de Personal. 💰 Bajaste de ${ARS(precioLista)} a ${ARS(totalFact)} para ${periodo}. Cualquier consulta, estoy.`
      : `${nombre}, acá está tu factura de Personal del período ${periodo}. Total: ${ARS(totalFact)}. Avisame si tenés consultas.`;
  } else {
    const n = NIVELES[nivel];
    const rei = Math.min(totalFact * (n.reintegroFactura / 100), n.topeReintegro);
    const ahorro = totalDesc + rei;
    base = `${nombre}, conseguí esto para vos. 🎯 `;
    if (totalDesc > 0) base += `Bajé tu factura de ${ARS(precioLista)} a ${ARS(totalFact)} — ${ARS(totalDesc)} de ahorro directo. `;
    else               base += `Tu factura de ${periodo} quedó en ${ARS(totalFact)}. `;
    base += `Pagándola con Personal Pay te entra ${ARS(rei)} de reintegro (${n.reintegroFactura}%, tope ${ARS(n.topeReintegro)}/mes). `;
    if (ahorro > 0) base += `💡 Ahorro total estimado: ${ARS(ahorro)}. `;
    base += `Además: 20% extra en recargas 📱, hasta 20% en supermercados 🛒, 15% en Tienda Personal sin tope 🛍️. `;
    if (nivel < 4) {
      const sig = NIVELES[nivel + 1];
      base += `Si llegás a ${ARS(sig.consumoClientes)}/mes subís al ${sig.nombre} → ${sig.reintegroFactura}% de reintegro (tope ${ARS(sig.topeReintegro)}).`;
    } else {
      base += `Estás en el nivel máximo 🏆 — aprovechá todos los beneficios.`;
    }
  }

  const n = NIVELES[nivel];
  const totalFact2 = totalFact;
  const rei2 = n ? Math.min(totalFact2 * (n.reintegroFactura / 100), n.topeReintegro) : 0;

  const adaptaciones = {
    positivo: () => base,
    negativo: () => `${nombre}, entiendo que puede haber habido inconvenientes, pero te cuento algo concreto que logré. ✅ ` + base.replace(nombre + ", ", ""),
    enfadado: () => `${nombre}, escuchame un segundo — tengo algo puntual que te va a interesar. 🛑 ` + base.replace(nombre + ", ", "") + ` Sé que hay cosas por mejorar y lo trabajamos.`,
    confundido: () => `${nombre}, te explico simple y claro. 📋 ` + base.replace(nombre + ", ", "") + ` ¿Querés que repasemos algún punto juntos?`,
    sabelotodo: () => `${nombre}, te paso los números exactos para que los evalúes. 📊 ` + base.replace(nombre + ", ", "") + ` Es información oficial — cualquier detalle te lo confirmo.`,
    hablador: () => nivel === 0
      ? `${nombre}, rápido porque sé que tenés mucho para contar 😄: conseguí ${totalDesc > 0 ? ARS(totalDesc) + " de descuento" : "el detalle de tu factura"} en Personal. ¡Dale, seguimos!`
      : `${nombre}, en dos palabras 😄: factura ${ARS(totalFact2)} + ${ARS(rei2)} de reintegro = ${ARS(totalFact2 - rei2)} real. ¡Conviene! Después me contás todo 😉`,
    "poco-comunicativo": () => nivel === 0
      ? `${nombre}: factura ${ARS(totalFact2)}${totalDesc > 0 ? ", descuento " + ARS(totalDesc) : ""}. ¿Alguna duda?`
      : `${nombre}: factura ${ARS(totalFact2)}, reintegro Personal Pay ${ARS(rei2)}. ¿Pagás desde la app? 👍`,
    relajado: () => base + " 😊 Sin apuro, cualquier consulta estoy acá.",
    controlador: () => `${nombre}, te detallo todo paso a paso para que lo revises. 📌 ` + base.replace(nombre + ", ", "") + ` Cualquier punto que quieras verificar, lo chequeamos juntos.`,
  };

  return (adaptaciones[perfil] || adaptaciones.positivo)();
}

document.querySelectorAll(".btn-speech").forEach(btn => {
  btn.addEventListener("click", () => {
    const nivel = +btn.dataset.nivel;
    const inv   = window._lastInvoice || {};
    const simConsumo = parseFloat(document.getElementById("sim-consumo").value) || 0;
    const simFactura = parseFloat(document.getElementById("sim-factura").value) || 0;
    if (simConsumo) inv.simConsumo = simConsumo;
    if (simFactura && !inv.total) inv.total = simFactura;

    document.querySelectorAll(".btn-speech").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    renderBenefits(nivel);
    document.getElementById("speech-text").textContent = generarSpeechConPerfil(nivel, inv, _perfilActivo);
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
