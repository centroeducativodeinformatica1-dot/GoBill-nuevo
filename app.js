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
  hogar: [{ desc: "", lista: "", final: "", pct: "" }],
  movil: [{ desc: "", lista: "", final: "", pct: "" }],
};

function renderSeccion(sec) {
  const list = document.getElementById("conceptos-" + sec);
  list.innerHTML = "";
  secciones[sec].forEach((c, i) => {
    const row  = document.createElement("div");
    row.className = "concepto-row";
    const lista = parseFloat(c.lista) || 0;
    const final = parseFloat(c.final) || 0;
    const pct   = parseFloat(c.pct)   || 0;

    // If precio final is set, precio lista = final / (1 - pct/100)
    // If precio lista is set, neto = lista * (1 - pct/100)
    let listaCalc = lista;
    let finalCalc = final;
    if (final > 0 && pct > 0 && lista === 0) {
      listaCalc = final / (1 - pct / 100);
    } else if (lista > 0) {
      finalCalc = lista - lista * pct / 100;
    }

    row.innerHTML =
      `<input type="text" placeholder="Descripción" value="${c.desc}" data-sec="${sec}" data-i="${i}" data-k="desc" />` +
      `<input type="number" placeholder="$ Precio final" value="${c.final || ''}" data-sec="${sec}" data-i="${i}" data-k="final" class="monto" title="Precio final (app contención)" />` +
      `<input type="number" placeholder="%" value="${c.pct}" min="0" max="100" data-sec="${sec}" data-i="${i}" data-k="pct" class="monto" />` +
      `<input type="number" placeholder="$ Lista" value="${c.lista || ''}" data-sec="${sec}" data-i="${i}" data-k="lista" class="monto lista-manual" title="Precio de lista (manual o auto-calculado)" />` +
      `<span class="concepto-neto">${(listaCalc > 0 || finalCalc > 0) ? ARS(final > 0 && lista === 0 ? final : finalCalc) : "—"}</span>` +
      `<button class="btn-remove-concepto" data-sec="${sec}" data-i="${i}" title="Eliminar">✕</button>`;
    list.appendChild(row);

    // Auto-fill lista when final+pct change
    const inputFinal = row.querySelector('[data-k="final"]');
    const inputLista = row.querySelector('[data-k="lista"]');
    const inputPct   = row.querySelector('[data-k="pct"]');

    function recalc() {
      const f = parseFloat(inputFinal.value) || 0;
      const l = parseFloat(inputLista.value) || 0;
      const p = parseFloat(inputPct.value)   || 0;
      if (f > 0 && p > 0 && l === 0) {
        // auto-calc lista
        const autoLista = f / (1 - p / 100);
        inputLista.value = autoLista.toFixed(2);
        inputLista.classList.add("auto-filled");
        secciones[sec][i].lista = autoLista.toFixed(2);
      } else if (l > 0) {
        inputLista.classList.remove("auto-filled");
        // clear final if lista is entered manually
        if (f === 0) {
          inputFinal.value = "";
          secciones[sec][i].final = "";
        }
      }
      renderSeccion(sec);
    }

    inputFinal.addEventListener("change", e => { secciones[sec][i].final = e.target.value; recalc(); });
    inputLista.addEventListener("change", e => { secciones[sec][i].lista = e.target.value; secciones[sec][i].final = ""; recalc(); });
    inputPct.addEventListener("change",   e => { secciones[sec][i].pct   = e.target.value; recalc(); });
    row.querySelector('[data-k="desc"]').addEventListener("change", e => { secciones[sec][i].desc = e.target.value; });
  });

  list.querySelectorAll(".btn-remove-concepto").forEach(btn => {
    btn.addEventListener("click", e => {
      const s = e.target.dataset.sec;
      const i = +e.target.dataset.i;
      if (secciones[s].length > 1) { secciones[s].splice(i, 1); renderSeccion(s); }
      else { secciones[s][0] = { desc:"", lista:"", final:"", pct:"" }; renderSeccion(s); }
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
  const total     = subtotal + mora - credito;

  return { precioLista, descuentosPct, descuentoCT, totalDescuentos, subtotal, credito, mora, ivaAmt: 0, ivaRate: 0, total, hogar, movil, adicionalesLista, adicionalesDesc };
}

// ═══════════════════════════════════════════════════════════
//  GENERAR FACTURA HTML
// ═══════════════════════════════════════════════════════════

document.getElementById("btn-generar").addEventListener("click", () => {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
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
    <div class="inv-paper-wrap">
      <div class="inv-watermark">NO VÁLIDO COMO FACTURA</div>

      <div class="inv-header">
        <img src="assets/logo-personal.png" alt="Personal" class="inv-logo"
             onerror="this.outerHTML='<span class=inv-logo-placeholder>Personal</span>'" />
        <div class="inv-tipo-col">
          <div class="inv-tipo-box">
            <span class="inv-tipo-x">✕</span>
          </div>
          <span class="inv-tipo-label">FACTURA</span>
        </div>
        ${data.nrofactura ? `<p class="inv-nro">${data.nrofactura}</p>` : ""}
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
      ${mora > 0 ? `<div class="inv-total-row"><span>Mora / Interés</span><span>${ARS(mora)}</span></div>` : ""}
      ${credito > 0 ? `<div class="inv-total-row"><span>Crédito a favor</span><span>−${ARS(credito)}</span></div>` : ""}
      <div class="inv-total-row inv-total-final"><span>TOTAL A PAGAR</span><span>${ARS(total)}</span></div>
    </div>

    <div class="inv-footer">Personal Argentina · Telecomunicaciones · go-bill.vercel.app</div>
    </div>
  `;

  document.getElementById("invoice-render").innerHTML = html;
  window._lastInvoice = { ...data, total, totalDescuentos, precioLista, periodo: data.periodo };

  // Si no hay conceptos (total = 0), avisamos pero igual generamos
  if (total === 0 && precioLista === 0) {
    showToast("Factura generada sin conceptos — podés agregar ítems si querés", "");
  }

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
      const partes = generarSpeechConPerfil(nivel, inv, _perfilActivo);
      const msgsEl = document.getElementById("speech-messages");
      msgsEl.innerHTML = "";
      if (partes.length === 1) {
        msgsEl.innerHTML = `<p class="speech-msg-text">${partes[0]}</p>`;
      } else {
        partes.forEach((txt, i) => {
          msgsEl.innerHTML += `
            <div class="speech-msg-block">
              <div class="speech-msg-label">Mensaje ${i+1}</div>
              <p class="speech-msg-text">${txt}</p>
              <button class="btn-copy-single" data-idx="${i}">📋 Copiar</button>
            </div>`;
        });
        msgsEl.querySelectorAll(".btn-copy-single").forEach(b => {
          b.addEventListener("click", async () => {
            const idx = +b.dataset.idx;
            const t = msgsEl.querySelectorAll(".speech-msg-text")[idx].textContent;
            try { await navigator.clipboard.writeText(t); showToast("Mensaje copiado", "success"); }
            catch { showToast("No se pudo copiar", ""); }
          });
        });
      }
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
  const n           = NIVELES[nivel];
  const rei         = n ? Math.min(totalFact * (n.reintegroFactura / 100), n.topeReintegro) : 0;

  // Helper: formato fecha aprox de vencimiento
  const vencHint = inv.vencimiento ? `con vencimiento aproximado el ${fechaStr(inv.vencimiento)}` : "en tu próxima factura";

  // ── TEMPLATES POR PERFIL ──────────────────────────────────

  const tpl = {

    positivo: () => {
      if (nivel === 0 && totalDesc > 0) return [
        `¡Excelente noticia, ${nombre}! 🎉\n¡Te conseguí una promo especial para que sigas disfrutando del servicio! 😎`,
        `📋 *Resumen de tu beneficio:*\n🔥 Descuento aplicado: ${ARS(totalDesc)}\n✅ Total a abonar: ${ARS(totalFact)}\n\nSi te interesa confirmame y lo cargo en sistema — lo vas a ver reflejado ${vencHint}. 🙂`
      ];
      if (nivel === 0) return [
        `${nombre}, acá está tu factura de Personal del período ${periodo}. Total: ${ARS(totalFact)}. Cualquier consulta estoy a tu disposición. 😊`
      ];
      return [
        `¡Hola ${nombre}! Tengo muy buenas noticias para vos. 🎁\nTeniendo en cuenta tu historial, te conseguí una promoción especial que creo que te va a encantar.`,
        `📊 *Lo que logramos para vos:*\n${totalDesc > 0 ? `💸 Descuento aplicado: ${ARS(totalDesc)}\n✅ Tu factura queda en: ${ARS(totalFact)}\n` : `📄 Factura ${periodo}: ${ARS(totalFact)}\n`}💳 *¿Tenés Personal Pay?* Si pagás con la app, te entra un reintegro automático de *${ARS(rei)}* (${n.reintegroFactura}% de tu factura — son ${ARS(rei)} que te depositan de vuelta sin hacer nada especial).\n\nEso significa que tu costo real queda en aprox. ${ARS(Math.max(0, totalFact - rei))}. 🤩`,
        `🎯 *Y encima tenés estos beneficios adicionales:*\n📱 20% de crédito extra en recargas semanales\n🛒 Hasta 20% en supermercados con Personal Pay\n🛍️ Hasta 15% en Tienda Personal sin tope mensual\n${nivel < 4 ? `\n▲ Si llegás a ${ARS(NIVELES[nivel+1].consumoClientes)}/mes subís al ${NIVELES[nivel+1].nombre} con ${NIVELES[nivel+1].reintegroFactura}% de reintegro.` : '\n⭐ ¡Ya estás en el nivel máximo!'}\n\nSi te parece bien confirmame y lo cargo ahora mismo. 💪`
      ];
    },

    negativo: () => {
      if (nivel === 0) return [
        `${nombre}, entiendo perfectamente tu situación y quiero ser honesto/a con vos. ✅\nMirá lo que pude conseguirte concreto:`
        + (totalDesc > 0 ? `\n\n🔥 Descuento: ${ARS(totalDesc)}\n✅ Total a pagar: ${ARS(totalFact)}\n\nEstoy acá para ayudarte — si necesitás algo más no dudes en avisarme.` : `\n\n📄 Tu factura del período ${periodo}: ${ARS(totalFact)}. Si hay algo que no te cierra, hablemos.`)
      ];
      return [
        `${nombre}, entiendo que estás disconforme, y te agradezco que me lo digas — eso me ayuda a buscar la mejor solución para vos. 🙏\nTe cuento lo que pude conseguir de concreto:`,
        `✅ *Resultado para tu cuenta:*\n${totalDesc > 0 ? `💸 Ahorro directo: ${ARS(totalDesc)}\n📄 Factura ajustada: ${ARS(totalFact)}\n` : `📄 Factura ${periodo}: ${ARS(totalFact)}\n`}💳 Con Personal Pay sumás ${ARS(rei)} más de reintegro (${n.reintegroFactura}%).\n\nSon números concretos, no palabras. Lo que me pedís que mejore lo anoto — trabajamos para eso.`
      ];
    },

    disconforme: () => {
      if (nivel === 0) return [
        `${nombre}, entiendo completamente lo que me estás comentando 🙏\nY la verdad, si yo estuviera en tu lugar también estaría molesto/a.\nQuedate tranquilo/a que lo vamos a resolver 💪`,
        `Mientras reviso tu caso, quiero ayudarte también por el lado del costo, porque veo que hay margen para mejorar.\n${totalDesc > 0 ? `🎁 Ya te apliqué un descuento de ${ARS(totalDesc)}\n💰 Pasarías a pagar ${ARS(totalFact)} en vez de ${ARS(precioLista)}\n\nLa idea es que, además de solucionarte el inconveniente, también sientas el beneficio en la factura.\n👉 ¿Te parece bien? Lo dejo aplicado ahora y ya te impacta en la próxima factura` : `📄 Tu factura del período ${periodo} es de ${ARS(totalFact)}\n\nDecime cuál es el inconveniente específico y lo resolvemos juntos ahora 💪`}`
      ];
      return [
        `${nombre}, entiendo completamente lo que me estás comentando 🙏\nY la verdad, si yo estuviera en tu lugar también estaría molesto/a. Quedate tranquilo/a que lo vamos a resolver 💪`,
        `Mientras reviso tu caso, quiero ayudarte también por el lado del costo.\n\n${totalDesc > 0 ? `🎁 Te apliqué un descuento de ${ARS(totalDesc)}\n💰 Pasás a pagar ${ARS(totalFact)} en vez de ${ARS(precioLista)}` : `📄 Tu factura del período ${periodo}: ${ARS(totalFact)}`}\n\n¿Te sirve así? La idea es que sientas el beneficio en la factura, además de resolver lo que me planteás.\n👉 Lo dejo aplicado ahora así ya impacta en la próxima factura y avanzamos con la solución`,
        `💳 *Y hay algo más que quiero que conozcas — Personal Pay:*\nSi pagás la factura desde la app Personal Pay, te entra un reintegro automático de ${ARS(rei)} (${n.reintegroFactura}% de tu factura).\n\n📱 20% de crédito extra en recargas semanales\n🛒 Hasta 20% en supermercados\n🛍️ Hasta 15% en Tienda Personal\n\nO sea: bajamos la factura, la solucionamos, y encima la app te devuelve plata. ¿Vamos bien hasta acá?`
      ];
    },

    confundido: () => {
      if (nivel === 0) return [
        `${nombre}, te explico de manera sencilla para que quede 100% claro. 📋\n`
        + (totalDesc > 0
          ? `📌 Precio original: ${ARS(precioLista)}\n📌 Con el descuento que te apliqué: ${ARS(totalFact)}\n📌 Ahorrás: ${ARS(totalDesc)}\n\nCualquier duda que te quede, preguntame con confianza — estoy para aclararte todo.`
          : `📌 Tu factura de ${periodo} es de ${ARS(totalFact)}.\n\n¿Hay algún punto que no te queda claro? Me decís y lo repasamos juntos.`)
      ];
      return [
        `${nombre}, te explico paso a paso para que no quede ninguna duda. 📋`,
        `📌 *Paso 1 — Tu factura:*\n${totalDesc > 0 ? `Precio de lista: ${ARS(precioLista)}\nDescuento aplicado: -${ARS(totalDesc)}\nTotal que pagás: ${ARS(totalFact)}` : `Total período ${periodo}: ${ARS(totalFact)}`}`,
        `📌 *Paso 2 — Personal Pay:*\nSi pagás con Personal Pay en la app, te devuelven ${ARS(rei)} (eso es el ${n.reintegroFactura}% de reintegro).\n\nO sea, de los ${ARS(totalFact)} que pagás, te vuelven ${ARS(rei)} — tu costo real es ${ARS(Math.max(0, totalFact - rei))}.\n\n¿Quedó claro? ¿Querés que repasemos algo?`
      ];
    },

    sabelotodo: () => {
      if (nivel === 0) return [
        `${nombre}, te paso los números exactos para que los evalúes. 📊\n`
        + (totalDesc > 0
          ? `Precio de lista: ${ARS(precioLista)}\nDescuento aplicado (${Math.round(totalDesc/precioLista*100)}%): -${ARS(totalDesc)}\nTotal neto: ${ARS(totalFact)}\n\nEs información oficial — cualquier detalle adicional te lo confirmo.`
          : `Factura período ${periodo}: ${ARS(totalFact)}. Para cualquier validación que necesites, estoy.`)
      ];
      return [
        `${nombre}, te paso la info exacta para que la analices como corresponde. 📊`,
        `📈 *Datos concretos de tu cuenta:*\n${totalDesc > 0 ? `• Precio lista: ${ARS(precioLista)}\n• Descuento aplicado: -${ARS(totalDesc)} (${precioLista > 0 ? Math.round(totalDesc/precioLista*100) : 0}%)\n• Total factura: ${ARS(totalFact)}\n` : `• Factura ${periodo}: ${ARS(totalFact)}\n`}• Nivel Personal Pay: ${n.nombre}\n• Reintegro facturas: ${n.reintegroFactura}% (tope ${ARS(n.topeReintegro)}/mes)\n• Reintegro estimado: ${ARS(rei)}\n• Costo efectivo: ${ARS(Math.max(0, totalFact - rei))}\n\nTodo verificable en la app oficial de Personal. Cualquier cifra que quieras cotejar, te confirmo.`
      ];
    },

    "poco-comunicativo": () => {
      if (nivel === 0) return [
        `${nombre}: factura ${ARS(totalFact)}${totalDesc > 0 ? `, con descuento de ${ARS(totalDesc)}` : ""}. ¿Alguna duda?`
      ];
      return [
        `${nombre}:\n• Factura: ${ARS(totalFact)}\n• Reintegro Personal Pay: ${ARS(rei)}\n• Costo neto: ${ARS(Math.max(0, totalFact - rei))}\n\n¿Pagás desde la app? Con Personal Pay ese reintegro te entra automático 👍`
      ];
    },

    relajado: () => {
      if (nivel === 0) return [
        `${nombre}, sin apuro te cuento. 😊\n`
        + (totalDesc > 0 ? `Te apliqué un descuento de ${ARS(totalDesc)}, así que pagás ${ARS(totalFact)} en vez de ${ARS(precioLista)}. Cuando quieras charlamos cualquier otra consulta.` : `Tu factura de ${periodo} es ${ARS(totalFact)}. Cualquier cosa que necesites, acá estoy.`)
      ];
      return [
        `${nombre}, cuando tengas un momento te cuento algo que conseguí para vos. 😊\nNo hay apuro, pero creo que te va a interesar.`,
        `${totalDesc > 0 ? `Logré bajarte la factura de ${ARS(precioLista)} a ${ARS(totalFact)}` : `Tu factura de ${periodo} es ${ARS(totalFact)}`} y si la pagás con Personal Pay te vuelven ${ARS(rei)} de reintegro.\n\nO sea, terminás pagando alrededor de ${ARS(Math.max(0, totalFact - rei))} en la práctica. No está nada mal, ¿no? 😄\n\nCualquier duda que surja, acá estoy sin problemas.`
      ];
    },

    bonus: () => {
      // Speech especial para refuerzo de cierre / segunda oportunidad
      const extraPersonalPay = nivel > 0
        ? `\n\n💳 *Recordá — Personal Pay:*\nPagás desde la app y te depositan ${ARS(rei)} de reintegro automático. Es plata que te vuelve sin trámite, sin papeles. Solo pagás y ya.`
        : "";
      if (nivel === 0) return [
        `${nombre}, antes de terminar quiero que sepas algo 💡\n\nNo es solo la factura — es todo lo que Personal tiene para vos que todavía no estás aprovechando al máximo.\n\n🎁 Si en algún momento querés revisar tu plan o ver si hay algo que ajustar, estoy acá para eso.\n\n👉 ¿Hay algo más en lo que te pueda ayudar hoy?`
      ];
      return [
        `${nombre}, antes de cerrar quiero que te quede una cosa clara 💡`,
        `Todo lo que te mostré hoy es real y ya está disponible para vos:\n\n${totalDesc > 0 ? `✅ Descuento de ${ARS(totalDesc)} — factura en ${ARS(totalFact)}\n` : `📄 Factura ${periodo}: ${ARS(totalFact)}\n`}💳 Personal Pay: reintegro de ${ARS(rei)} automático por pagar desde la app\n📱 20% extra en recargas semanales\n🛒 Hasta 20% en supermercados\n🛍️ Hasta 15% en Tienda Personal${extraPersonalPay}\n\n👉 No hay nada que perder y sí bastante que ganar. ¿Lo dejamos activado?`
      ];
    },

    microcierres: () => {
      // Herramienta de apoyo: frases de microcierre para usar durante la conversación
      return [
        `💬 *Microcierres — usalos durante la charla:*\n\n"¿Te sirve así?"\n"¿Vamos bien hasta acá?"\n"¿Tiene sentido lo que te digo?"\n"¿Lo vemos juntos?"\n"¿Querés que lo aplico ahora?"\n"¿Te parece?"\n"¿Arrancamos?"\n\n👉 Metelos entre mensaje y mensaje para que el cliente vaya diciendo pequeños "sí" antes del cierre final. Cada "sí" intermedio hace más fácil el "sí" definitivo.`,
        `🎯 *Frases de cierre final:*\n\n"Si querés, lo activo ahora y ya impacta en la próxima factura — ¿lo hacemos?"\n"Es la forma más rápida de bajar tu factura desde ya — ¿lo aplico?"\n"Lo dejo cargado y listo, ¿de acuerdo?"\n"¿Arrancamos con esto?"\n\n🔁 *Si el cliente duda:*\n"Igual lo anoto para que no se te vaya la promo — estas condiciones son temporales."\n"No te comprometés a nada, solo te muestro los números — ¿seguimos?"`
      ];
    },

    controlador: () => {
      if (nivel === 0) return [
        `${nombre}, te detallo todo para que tengas el control completo de la situación. 📌\n`
        + (totalDesc > 0
          ? `1. Precio original: ${ARS(precioLista)}\n2. Descuento aplicado: -${ARS(totalDesc)}\n3. Total final: ${ARS(totalFact)}\n\nCualquier punto que quieras verificar lo chequeamos juntos.`
          : `1. Factura período ${periodo}: ${ARS(totalFact)}\n\nTodo en orden. ¿Querés revisar algún detalle?`)
      ];
      return [
        `${nombre}, te paso el detalle completo para que puedas revisar cada punto. 📌`,
        `📋 *Detalle de factura:*\n${totalDesc > 0 ? `1. Precio lista: ${ARS(precioLista)}\n2. Descuento: -${ARS(totalDesc)}\n3. Total factura: ${ARS(totalFact)}\n` : `1. Factura ${periodo}: ${ARS(totalFact)}\n`}4. Nivel Personal Pay: ${n.nombre}\n5. % Reintegro: ${n.reintegroFactura}%\n6. Tope reintegro: ${ARS(n.topeReintegro)}/mes\n7. Reintegro estimado: ${ARS(rei)}\n8. Costo efectivo final: ${ARS(Math.max(0, totalFact - rei))}`,
        `✅ *Beneficios adicionales confirmados:*\n• 20% crédito extra en recargas semanales\n• Hasta 20% en supermercados con Personal Pay\n• Hasta 15% en Tienda Personal sin tope\n${nivel < 4 ? `• Próximo nivel: ${NIVELES[nivel+1].nombre} desde ${ARS(NIVELES[nivel+1].consumoClientes)}/mes → ${NIVELES[nivel+1].reintegroFactura}% reintegro` : '• Nivel máximo — todos los beneficios activados'}\n\nCualquier número que quieras verificar, lo revisamos juntos sin problema.`
      ];
    },
  };

  return ((tpl[perfil] || tpl.positivo)()) ;
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
    const partes = generarSpeechConPerfil(nivel, inv, _perfilActivo);
    const msgsEl = document.getElementById("speech-messages");
    msgsEl.innerHTML = "";
    if (partes.length === 1) {
      msgsEl.innerHTML = `<p class="speech-msg-text">${partes[0]}</p>`;
    } else {
      partes.forEach((txt, i) => {
        msgsEl.innerHTML += `
          <div class="speech-msg-block">
            <div class="speech-msg-label">Mensaje ${i+1}</div>
            <p class="speech-msg-text">${txt}</p>
            <button class="btn-copy-single" data-idx="${i}">📋 Copiar</button>
          </div>`;
      });
      msgsEl.querySelectorAll(".btn-copy-single").forEach(b => {
        b.addEventListener("click", async () => {
          const idx = +b.dataset.idx;
          const t = msgsEl.querySelectorAll(".speech-msg-text")[idx].textContent;
          try { await navigator.clipboard.writeText(t); showToast("Mensaje copiado", "success"); }
          catch { showToast("No se pudo copiar", ""); }
        });
      });
    }
    document.getElementById("speech-output").classList.remove("hidden");
  });
});

document.getElementById("btn-copy-speech").addEventListener("click", async () => {
  const msgs = document.querySelectorAll("#speech-messages .speech-msg-text");
  const txt = Array.from(msgs).map((el, i) => msgs.length > 1 ? `Mensaje ${i+1}:\n${el.textContent}` : el.textContent).join("\n\n");
  try {
    await navigator.clipboard.writeText(txt);
    showToast("Mensaje copiado", "success");
  } catch {
    showToast("No se pudo copiar — seleccionalo manualmente", "");
  }
});
