/* ------------------------ Utils: estado & dinero ------------------------ */
function _parseStateForReports() {
  const LS_KEYS = ["pokemonBank", "pokebank", "bankState", "appState"];
  let s = null;
  for (const k of LS_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) { s = JSON.parse(raw); break; }
    } catch {}
  }
  if (!s) s = { user:{ name:"Ash Ketchum", account:"0987654321" }, balance:500, transactions:[] };

  s.user = s.user || { name:"Ash Ketchum", account:"0987654321" };
  s.balance = Number(s.balance ?? 0);

  let txs = Array.isArray(s.transactions) ? s.transactions
          : (Array.isArray(s.historial) ? s.historial : []);
  txs = txs.map((t, i) => ({
    id: t.id || `tx_${i+1}`,
    type: t.type || t.tipo || "inquiry",
    service: t.service ?? t.servicio ?? null,
    amount: Number(t.amount ?? t.monto ?? 0),
    dateISO: t.dateISO || t.fechaISO || (t.fecha ? new Date(t.fecha).toISOString() : new Date().toISOString()),
    balanceAfter: Number(t.balanceAfter ?? t.saldoPosterior ?? t.saldo ?? s.balance)
  }));

  return { ...s, transactions: txs };
}
const _money = n => `$${Number(n ?? 0).toFixed(2)}`;

/* ------------------------ FIX: limpiar texto para PDF (sin emojis) ------------------------ */
// Quita emojis y caracteres fuera del rango compatible con la fuente estándar de jsPDF.
function limpiarTextoPDF(txt = "") {
  // Opción 1 (recomendada): elimina cualquier emoji/raro fuera del ASCII básico + tildes comunes
  return String(txt).replace(/[^\x20-\x7EñÑáéíóúÁÉÍÓÚüÜ¿?¡!.,:;()\-\/0-9A-Za-z\s]/g, "");
  // Si quisieras quitar solo emojis (dejando otros símbolos), usa en su lugar:
  // return String(txt).replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
}

/* ------------------------ Utils: logo/branding ------------------------ */
async function _loadBrandDataURL() {
  // Path preferido que definiste en historial.html
  const preferred = (window.POKEMON_BANK_BRAND && window.POKEMON_BANK_BRAND.logoPath) || "./assets/img/valor.png";
  const fallbacks = [preferred, "./assets/img/Login1.png", "./assets/img/login.jpg"];
  for (const src of fallbacks) {
    try {
      const dataUrl = await _imageToDataURL(src);
      if (dataUrl) return dataUrl;
    } catch {}
  }
  return null; // seguimos sin logo si no se puede cargar
}

function _imageToDataURL(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Ignorado si es mismo origen
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = src;
  });
}

/* ------------------------ PDF: Estado de cuenta ------------------------ */
async function generarPDFHistorial() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { console.error("jsPDF no disponible"); return; }

  const s = _parseStateForReports();
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 40;
  const marginR = 40;
  const contentW = pageW - marginL - marginR;

  // Colores de marca
  const brandRed = { r: 228, g: 42, b: 45 };

  // Encabezado con barra y logo
  doc.setFillColor(brandRed.r, brandRed.g, brandRed.b);
  doc.rect(0, 0, pageW, 60, "F");

  try {
    const logoDataUrl = await _loadBrandDataURL();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", marginL - 16, 12, 36, 36);
    }
  } catch { /* sin logo no se rompe */ }

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  const bankName = (window.POKEMON_BANK_BRAND && window.POKEMON_BANK_BRAND.bankName) || "Pokémon Bank";
  doc.text(`${bankName} — Estado de Cuenta`, marginL + 28, 36);

  // Datos del usuario
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Usuario: ${s.user.name || "-"}`, marginL, 86);
  doc.text(`Cuenta: ${s.user.account || "-"}`, marginL, 104);
  doc.text(`Saldo actual: ${_money(s.balance)}`, marginL + contentW/2, 86);
  doc.text(`Fecha: ${new Date().toLocaleString()}`, marginL + contentW/2, 104);

  // Encabezado de tabla
  let y = 136;
  const head = ["#", "Fecha", "Tipo", "Servicio", "Monto", "Saldo"];
  const widths = [24, 180, 80, 140, 80, 80]; // suma <= contentW

  doc.setFont(undefined, "bold");
  head.reduce((x, h, i) => { doc.text(h, x, y); return x + widths[i]; }, marginL);
  doc.setFont(undefined, "normal");
  y += 12;

  // Filas
  const rowH = 16;
  const bottomLimit = pageH - 60;
  s.transactions.forEach((tx, i) => {
    if (y + rowH > bottomLimit) {
      doc.addPage();
      // reencabezado simple por página
      y = 60;
      doc.setFont(undefined, "bold");
      head.reduce((x, h, i) => { doc.text(h, x, y); return x + widths[i]; }, marginL);
      doc.setFont(undefined, "normal");
      y += 12;
    }
    const row = [
      String(i+1),
      new Date(tx.dateISO).toLocaleString(),
      limpiarTextoPDF(tx.type || "-"),
      limpiarTextoPDF(tx.service || "-"),
      _money(tx.amount),
      _money(tx.balanceAfter)
    ];
    row.reduce((x, c, idx) => { doc.text(String(c), x, y); return x + widths[idx]; }, marginL);
    y += rowH;
  });

  // Pie
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Documento generado por el sistema Pokémon Bank.", marginL, pageH - 24);

  doc.save(`estado_cuenta_${s.user.account || "cuenta"}.pdf`);
}

/* ------------------------ PDF: Comprobante individual ------------------------ */
async function generarPDFComprobante(tx) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF || !tx) { console.error("jsPDF o transacción inválida"); return; }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 40;

  const brandRed = { r: 228, g: 42, b: 45 };

  // Encabezado con logo y barra
  doc.setFillColor(brandRed.r, brandRed.g, brandRed.b);
  doc.rect(0, 0, pageW, 60, "F");

  try {
    const logoDataUrl = await _loadBrandDataURL();
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", marginL - 16, 12, 36, 36);
    }
  } catch { /* sin logo no se rompe */ }

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  const bankName = (window.POKEMON_BANK_BRAND && window.POKEMON_BANK_BRAND.bankName) || "Pokémon Bank";
  doc.text(`${bankName} — Comprobante de Transacción`, marginL + 28, 36);

  // Contenido
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);

  // Tarjeta con bordes suaves
  const cardX = marginL, cardY = 90, cardW = pageW - marginL*2, cardH = 220;
  _roundedRect(doc, cardX, cardY, cardW, cardH, 10);
  doc.setFont(undefined, "bold");
  doc.text("Detalles", cardX + 12, cardY + 22);
  doc.setFont(undefined, "normal");

  let y = cardY + 48;
  doc.text(`ID de transacción: ${tx.id}`, cardX + 12, y); y += 22;
  doc.text(`Fecha y hora: ${new Date(tx.dateISO).toLocaleString()}`, cardX + 12, y); y += 22;
  doc.text(`Tipo: ${limpiarTextoPDF(tx.type || "-")}`, cardX + 12, y); y += 22;
  if (tx.service) { doc.text(`Servicio: ${limpiarTextoPDF(tx.service)}`, cardX + 12, y); y += 22; }
  doc.text(`Monto: ${_money(tx.amount)}`, cardX + 12, y); y += 22;
  doc.text(`Saldo después: ${_money(tx.balanceAfter)}`, cardX + 12, y);

  // Pie
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text("Conserve este comprobante para su registro personal.", marginL, pageH - 24);

  doc.save(`comprobante_${tx.id}.pdf`);
}

// Helper para rectángulo con esquinas redondeadas
function _roundedRect(doc, x, y, w, h, r) {
  doc.setDrawColor(200);
  doc.setLineWidth(0.8);
  if (typeof doc.roundedRect === "function") {
    doc.roundedRect(x, y, w, h, r, r);
  } else {
    // Fallback si la build de jsPDF no trae roundedRect
    doc.rect(x, y, w, h);
  }
}

/* ------------------------ Exponer global ------------------------ */
window.generarPDFHistorial   = generarPDFHistorial;
window.generarPDFComprobante = generarPDFComprobante;
