/* ----------------------- Utils ----------------------- */
const $$  = (sel) => document.querySelector(sel);
const $$$ = (sel) => Array.from(document.querySelectorAll(sel));
const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;
const fDate = (iso) => new Date(iso).toLocaleString();

// Normaliza acentos y mayúsculas (p. ej. "depósito" ≈ "DEPOSITO")
const normalize = (str = "") =>
  String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Mostrar nombre de usuario en .nombreusuario (URL ?usuario= o localStorage)
(function setUsername() {
  const params = new URLSearchParams(location.search);
  let name = params.get("usuario") || null;

  if (!name) {
    const LS_KEYS = ["pokemonBank", "pokebank", "bankState", "appState"];
    for (const k of LS_KEYS) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const s = JSON.parse(raw);
          name = s?.user?.name || s?.usuario?.nombre || null;
          if (name) break;
        }
      } catch {}
    }
  }
  if (!name) name = "Invitado";
  const el = $$(".nombreusuario");
  if (el) el.textContent = name;
})();

/* ----------------- Estado desde localStorage (AUTODETECT) ----------------- */
// Escanea TODO el localStorage, encuentra el arreglo de transacciones donde esté y normaliza.
function parseState() {
  // 1) Recolecta todos los objetos del localStorage
  const all = [];
  for (const k of Object.keys(localStorage)) {
    try {
      const v = JSON.parse(localStorage.getItem(k) || "null");
      if (v && typeof v === "object") all.push(v);
    } catch {}
  }

  // helpers
  const pick = (...vals) => vals.find(v => v !== undefined && v !== null);
  const toNum = (n, d = 0) => Number(n ?? d);

  // 2) ¿Esto parece una transacción?
  const isTx = (x) => x && typeof x === "object" && (
    "type" in x || "tipo" in x || "amount" in x || "monto" in x || "service" in x || "servicio" in x
  );

  // 3) Busca un array de transacciones en cualquier nivel
  function findTxArray(obj) {
    if (!obj || typeof obj !== "object") return null;

    if (Array.isArray(obj.transactions) && obj.transactions.some(isTx)) return obj.transactions;
    if (Array.isArray(obj.historial)    && obj.historial.some(isTx))    return obj.historial;
    if (Array.isArray(obj.transacciones)&& obj.transacciones.some(isTx))return obj.transacciones;

    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (Array.isArray(v) && v.some(isTx)) return v;
      if (v && typeof v === "object") {
        const r = findTxArray(v);
        if (r) return r;
      }
    }
    return null;
  }

  // 4) Elige el objeto con más transacciones válidas
  let bestObj = null, bestTxs = [];
  for (const o of all) {
    const txs = findTxArray(o) || [];
    if (txs.length > bestTxs.length) { bestTxs = txs; bestObj = o; }
  }

  // 5) Si no hay nada, defaults
  if (!bestObj) {
    return {
      user: { name: "Ash Ketchum", account: "0987654321" },
      balance: 500,
      transactions: []
    };
  }

  // 6) Usuario/saldo flexibles
  const user = {
    name:    pick(bestObj?.user?.name, bestObj?.usuario?.nombre, bestObj?.username, "Ash Ketchum"),
    account: pick(bestObj?.user?.account, bestObj?.cuenta, bestObj?.account, "0987654321")
  };
  const balance = toNum(pick(bestObj?.balance, bestObj?.saldo), 0);

  // 7) Normaliza transacciones a {id,type,service,amount,dateISO,balanceAfter}
  const txs = (bestTxs || []).map((t, i) => ({
    id: t.id || `tx_${String(i + 1).padStart(3, "0")}`,
    type: t.type || t.tipo || "inquiry",
    service: t.service ?? t.servicio ?? null,
    amount: toNum(pick(t.amount, t.monto), 0),
    dateISO:
      t.dateISO || t.fechaISO ||
      (t.fecha ? new Date(t.fecha).toISOString() : new Date().toISOString()),
    balanceAfter: toNum(pick(t.balanceAfter, t.saldoPosterior, t.saldo, balance), balance)
  }));

  return { user, balance, transactions: txs };
}

// Estado en memoria
let state = parseState();
let data = state.transactions.slice();

/* ----------------- Filtro + orden ----------------- */
let sortKey = "dateISO"; // ordenar por fecha por defecto
let sortDir = -1;        // -1 desc, 1 asc

function applyFilter() {
  const q = normalize($$("#buscador")?.value || "");
  if (!q) return data.slice();
  return data.filter(tx =>
    normalize(tx.type || "").includes(q) ||
    normalize(tx.service || "-").includes(q) ||
    normalize(fDate(tx.dateISO)).includes(q) ||
    String(tx.amount).includes(q) ||
    String(tx.balanceAfter).includes(q)
  );
}

function applySort(arr) {
  if (!sortKey) return arr;
  return arr.slice().sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (sortKey === "amount" || sortKey === "balanceAfter") { va = Number(va); vb = Number(vb); }
    if (va < vb) return -1 * sortDir;
    if (va > vb) return  1 * sortDir;
    return 0;
  });
}

/* ----------------- Render de la tabla ----------------- */
function renderTable() {
  const tbody = $$("#tablaHistorial tbody");
  if (!tbody) return;

  const empty = $$("#empty");
  const resumen = $$("#resumen");

  const rows = applySort(applyFilter());
  tbody.innerHTML = "";

  empty?.classList.toggle("d-none", rows.length > 0);
  if (resumen) resumen.textContent = rows.length ? `${rows.length} transacción(es)` : "Sin transacciones";

  rows.forEach((tx, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${fDate(tx.dateISO)}</td>
      <td>${tx.type}</td>
      <td>${tx.service ?? "-"}</td>
      <td class="text-end">${money(tx.amount)}</td>
      <td class="text-end">${money(tx.balanceAfter)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary btn-pdf" data-id="${tx.id}" title="Descargar comprobante">PDF</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Handler: PDF individual (usa reportes.js → generarPDFComprobante)
  tbody.querySelectorAll(".btn-pdf").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const tx = rows.find(t => t.id === id);
      if (tx && typeof window.generarPDFComprobante === "function") {
        window.generarPDFComprobante(tx);
      } else {
        Swal?.fire({ icon: "error", title: "No se pudo generar el PDF", text: "Verifica que reportes.js esté cargado." });
      }
    });
  });
}

/* ----------------- Eventos UI / Init ----------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Búsqueda
  $$("#buscador")?.addEventListener("input", renderTable);

  // Orden por cabecera
  $$$("#tablaHistorial thead th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const map = { fecha: "dateISO", tipo: "type", servicio: "service", monto: "amount", saldo: "balanceAfter" };
      const key = map[th.dataset.sort] || "dateISO";
      sortDir = (sortKey === key ? -sortDir : 1);
      sortKey = key;
      renderTable();
    });
  });

  // Botón: Estado de cuenta (todo el historial)
  $$("#btnPDF")?.addEventListener("click", () => {
    if (typeof window.generarPDFHistorial === "function") {
      window.generarPDFHistorial();
    } else {
      Swal?.fire({ icon: "error", title: "No se pudo generar el PDF", text: "Verifica que reportes.js esté cargado." });
    }
  });

  // Botón: Ver gráfico (modal + Chart.js) — simple y SIN "Consultas"
  $$("#btnGrafico")?.addEventListener("click", () => {
    const modalEl = $$("#modalGrafico");
    const canvas = $$("#graficoTx");
    if (!modalEl || !canvas || !window.Chart) return;

    // Conteo por tipo (ES/EN), omitiendo consultas
    const counts = { deposit: 0, withdraw: 0, payment: 0 };
    const normalizeType = (t = "") => {
      t = String(t).toLowerCase().trim();
      if (["deposit", "depósito", "deposito"].includes(t)) return "deposit";
      if (["withdraw", "retiro"].includes(t)) return "withdraw";
      if (["payment", "pago", "servicio"].includes(t)) return "payment";
      return null; // ignorar otros
    };
    state.transactions.forEach(tx => {
      const k = normalizeType(tx.type);
      if (k && counts[k] != null) counts[k]++;
    });

    // Limpia chart previo si existiera
    if (canvas.__chart) {
      canvas.__chart.destroy();
      canvas.__chart = null;
    }

    canvas.__chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: ["Depósitos", "Retiros", "Pagos"],
        datasets: [{
          label: "Cantidad",
          data: [counts.deposit, counts.withdraw, counts.payment],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });

    if (window.bootstrap?.Modal) new bootstrap.Modal(modalEl).show();
    else modalEl.classList.add('show'); // fallback simple
  });

  // Mensaje inicial
  if (window.Swal) {
    if (!state.transactions.length) {
      Swal.fire({
        icon: "info",
        title: "Sin transacciones registradas",
        text: "Aún no existen movimientos en tu cuenta.",
        confirmButtonColor: "#007bff",
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "Historial cargado exitosamente",
        text: `Se encontraron ${state.transactions.length} transacciones registradas.`,
        confirmButtonColor: "#007bff",
        timer: 1500,
        showConfirmButton: false
      });
    }
  }

  renderTable();
});