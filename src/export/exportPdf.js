import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function getCongregationName(fallback = "Congregação Nova Paraguaçu") {
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.VITE_CONGREGACAO_NOME || import.meta.env.VITE_CONGREGACAO)) ||
    fallback
  );
}

function getLogoUrl(fallback = "/logo.png") {
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.VITE_LOGO_URL || import.meta.env.VITE_LOGO)) ||
    fallback
  );
}

async function loadImageToDataUrl(src) {
  try {
    if (!src || typeof window === "undefined") return null;
    const abs = src.startsWith("/")
      ? new URL(src, window.location.origin).toString()
      : src;
    const res = await fetch(abs, { cache: "no-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Exporta o relatório de 1 grupo (mês) em PDF.
 *
 * Compatível com duas formas de chamada:
 *  A) Nova:
 *    exportGroupMonthToPdf({ monthId, group, rows, totals, congregationName, logoUrl })
 *
 *  B) Antiga:
 *    exportGroupMonthToPdf({ monthId, groupLabel, summary, members })
 */
export async function exportGroupMonthToPdf(opts = {}) {
  const monthId = opts.monthId;

  // ====== Normaliza dados (A ou B) ======
  const group = opts.group || null;
  const rows = Array.isArray(opts.rows)
    ? opts.rows
    : Array.isArray(opts.members)
      ? opts.members
      : [];

  const totals =
    opts.totals ||
    opts.summary ||
    {
      horasPA: 0,
      horasPR: 0,
      estudos: 0,
      pAux: 0,
      pReg: 0,
    };

  const groupLabel =
    opts.groupLabel ||
    (group
      ? `Grupo nº ${group.numero ?? "-"} — Superintendente: ${group.superintendenteNome ?? "-"}`
      : "Grupo");

  const congregationName = opts.congregationName || getCongregationName();
  const logoUrl = opts.logoUrl || getLogoUrl();
  const logoDataUrl = await loadImageToDataUrl(logoUrl);

  // ====== PDF ======
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const left = 40;
  let y = 48;

  // Header (logo + congregação)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", left, y - 28, 34, 34);
    } catch {
      // ignora problemas de imagem
    }
  }

  doc.setFontSize(14);
  doc.text(congregationName, left + (logoDataUrl ? 44 : 0), y);

  doc.setFontSize(11);
  doc.text(groupLabel, left, y + 18);
  doc.text(`Mês: ${monthId || "-"}`, left, y + 34);

  y += 56;

  // Resumo
  doc.setFontSize(12);
  doc.text("Resumo do mês", left, y);
  doc.setFontSize(10);
  y += 14;

  const horasPA = safeNum(totals.horasPA);
  const horasPR = safeNum(totals.horasPR);
  const estudos = safeNum(totals.estudos);
  const pAux = safeNum(totals.pAux);
  const pReg = safeNum(totals.pReg);

  doc.text(`Horas PA (total): ${horasPA}`, left, (y += 14));
  doc.text(`Horas PR (total): ${horasPR}`, left, (y += 14));
  doc.text(`Estudos bíblicos (total): ${estudos}`, left, (y += 14));
  doc.text(`P. Auxiliares: ${pAux} (horas: ${horasPA})`, left, (y += 14));
  doc.text(`P. Regulares: ${pReg} (horas: ${horasPR})`, left, (y += 14));

  y += 18;

  // Tabela
  const normRows = rows.map((r) => ({
    nome: r.nome ?? r.name ?? "",
    participou: !!(r.participou ?? r.participation),
    pioneiroAux: !!(r.pioneiroAux ?? r.pioneiroAuxiliar ?? r.pAux),
    pioneiroReg: !!(r.pioneiroReg ?? r.pioneiroRegular ?? r.pReg),
    estudos: safeNum(r.estudos ?? r.estudosBiblicos),
    horasPA: safeNum(r.horasPA),
    horasPR: safeNum(r.horasPR),
  }));

  autoTable(doc, {
    startY: y,
    head: [["Nome", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
    body: normRows.map((r) => [
      r.nome,
      r.participou ? "Sim" : "Não",
      r.pioneiroAux ? "Sim" : "Não",
      r.pioneiroReg ? "Sim" : "Não",
      String(r.estudos),
      String(r.horasPA),
      String(r.horasPR),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [230, 230, 230] },
    margin: { left, right: 40 },
  });

  const groupNum = group?.numero ?? "";
  doc.save(`relatorio-${monthId || "mes"}-grupo-${groupNum}.pdf`);
}
