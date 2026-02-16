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

    // garante URL absoluta (importante no Vercel)
    const url = new URL(src, window.location.origin).toString();

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
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

function monthLabel(monthId) {
  return monthId || "-";
}

function normRow(r) {
  return {
    nome: r.nome ?? r.name ?? "",
    participou: !!(r.participou ?? r.participation),
    pAux: !!(r.pAux ?? r.pioneiroAux ?? r.pioneiroAuxiliar),
    pReg: !!(r.pReg ?? r.pioneiroReg ?? r.pioneiroRegular),
    estudos: safeNum(r.estudos ?? r.estudosBiblicos),
    horasPA: safeNum(r.horasPA),
    horasPR: safeNum(r.horasPR),
  };
}

function drawHeader(doc, { congregationName, logoDataUrl, subtitle }) {
  const left = 40;
  const top = 36;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", left, top, 42, 42);
    } catch {
      // ignora
    }
  }

  doc.setFontSize(14);
  doc.text(congregationName, left + (logoDataUrl ? 54 : 0), top + 16);
  doc.setFontSize(11);
  doc.text(subtitle, left + (logoDataUrl ? 54 : 0), top + 34);

  return top + 64;
}

function drawTotals(doc, y, totals) {
  const left = 40;
  doc.setFontSize(10);

  const horasPA = safeNum(totals?.horasPA);
  const horasPR = safeNum(totals?.horasPR);
  const estudos = safeNum(totals?.estudos);
  const pAux = safeNum(totals?.pAux);
  const pReg = safeNum(totals?.pReg);

  const lines = [
    `Horas PA (total): ${horasPA}`,
    `Horas PR (total): ${horasPR}`,
    `Estudos bíblicos (total): ${estudos}`,
    `P. Auxiliares: ${pAux} (horas: ${horasPA})`,
    `P. Regulares: ${pReg} (horas: ${horasPR})`,
  ];

  for (const l of lines) {
    doc.text(l, left, y);
    y += 14;
  }

  return y + 6;
}

/**
 * Export PDF (Admin) — compatível com o AdminDashboard atual:
 * exportAdminMonthToPdf({ monthId, congregationName, logoUrl, groups, statuses, rowsByGroup })
 *
 * Gera "tabelas completas": uma seção por grupo, incluindo status do grupo.
 */
export async function exportAdminMonthToPdf(opts = {}) {
  const { monthId, congregationName, logoUrl, groups = [], statuses = {}, rowsByGroup = {} } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const congName = congregationName || getCongregationName();
  const logoDataUrl = await loadImageToDataUrl(logoUrl || getLogoUrl());

  const left = 40;
  let y = drawHeader(doc, {
    congregationName: congName,
    logoDataUrl,
    subtitle: `Relatório (Admin) — ${monthLabel(monthId)}`,
  });

  doc.setFontSize(12);
  doc.text("Relatório ADMIN - Tabelas completas", left, y);
  y += 18;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const status = statuses[g.id] || "rascunho";
    const rawRows = Array.isArray(rowsByGroup[g.id]) ? rowsByGroup[g.id] : [];
    const rows = rawRows.map(normRow);

    // quebra página se necessário
    if (y > 700) {
      doc.addPage();
      y = 60;
    }

    doc.setFontSize(11);
    doc.text(`Grupo ${g.numero ?? "?"} - ${g.superintendenteNome ?? ""} (${status})`, left, y);
    y += 10;

    autoTable(doc, {
      startY: y + 6,
      head: [["Componente", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
      body: rows.length
        ? rows.map((r) => [
            r.nome,
            r.participou ? "Sim" : "Não",
            r.pAux ? "Sim" : "Não",
            r.pReg ? "Sim" : "Não",
            String(r.estudos),
            String(r.horasPA),
            String(r.horasPR),
          ])
        : [["(sem lançamentos)", "", "", "", "", "", ""]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255 },
      theme: "grid",
      margin: { left, right: 40 },
    });

    y = (doc.lastAutoTable?.finalY || y + 200) + 26;
  }

  doc.save(`Relatorio_ADMIN_${monthLabel(monthId)}_tabelas_completas.pdf`);
}

/**
 * Alias (pra evitar quebra se você estiver usando exportAdminPdf em algum lugar).
 */
export async function exportAdminPdf(opts = {}) {
  return exportAdminMonthToPdf(opts);
}