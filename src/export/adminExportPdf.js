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

    // garante URL absoluta (evita bug com paths relativos)
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

function drawHeader(doc, { congregationName, logoDataUrl, subtitle }) {
  const left = 40;
  const top = 36;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", left, top, 42, 42);
    } catch {
      // ignore
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

/**
 * Exportação PDF do Admin.
 *
 * Compatível com:
 *  - exportType: "month" (consolidado)
 *  - exportType: "group" (apenas grupo selecionado)
 *  - exportType: "tables" (tabelas completas — 1 seção por grupo)
 *
 * Parâmetros esperados (os que você tiver):
 *  - monthId
 *  - exportType
 *  - monthTotals (consolidado)
 *  - selectedGroup, groupTotals, groupRows (quando exportType === "group")
 *  - groupsTables: [{ group, rows, totals }] (quando exportType === "tables")
 *
 * Cabeçalho sempre tenta usar:
 *  - public/logo.png (default)
 *  - nome: "Congregação Nova Paraguaçu" (default)
 *  - ou envs VITE_LOGO_URL / VITE_CONGREGACAO_NOME
 */
export async function exportAdminPdf(opts = {}) {
  const {
    monthId,
    exportType,
    selectedGroup,
    monthTotals,
    groupTotals,
    groupRows,
    groupsTables,
    congregationName,
    logoUrl,
  } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const congName = congregationName || getCongregationName();
  const logoDataUrl = await loadImageToDataUrl(logoUrl || getLogoUrl());

  const left = 40;
  let y = drawHeader(doc, {
    congregationName: congName,
    logoDataUrl,
    subtitle: `Relatório (Admin) — ${monthLabel(monthId)}`,
  });

  // ===== Consolidação do mês =====
  if (exportType === "month") {
    doc.setFontSize(12);
    doc.text("Consolidação do mês", left, y);
    y += 16;
    y = drawTotals(doc, y, monthTotals);
    doc.save(`Relatorio_ADMIN_${monthLabel(monthId)}_consolidado.pdf`);
    return;
  }

  // ===== Apenas 1 grupo =====
  if (exportType === "group") {
    doc.setFontSize(12);
    doc.text(
      `Grupo nº ${selectedGroup?.numero ?? ""} — ${selectedGroup?.superintendenteNome ?? ""}`,
      left,
      y
    );
    y += 16;
    y = drawTotals(doc, y, groupTotals);

    const tableRows = Array.isArray(groupRows) ? groupRows.map(normRow) : [];

    autoTable(doc, {
      startY: y,
      head: [["Nome", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
      body: tableRows.length
        ? tableRows.map((r) => [
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
      headStyles: { fillColor: [230, 230, 230] },
      margin: { left, right: 40 },
    });

    doc.save(
      `Relatorio_ADMIN_${monthLabel(monthId)}_grupo_${selectedGroup?.numero ?? ""}.pdf`
    );
    return;
  }

  // ===== Tabelas completas (uma seção por grupo) =====
  // (Seu AdminDashboard normalmente chama isso com exportType "tables".)
  const tables = Array.isArray(groupsTables) ? groupsTables : [];

  doc.setFontSize(12);
  doc.text("Relatório ADMIN - Tabelas completas", left, y);
  y += 16;

  // Totais do mês, se tiver
  if (monthTotals) {
    doc.setFontSize(10);
    doc.text(
      `Total: Horas PA=${safeNum(monthTotals.horasPA)} | Horas PR=${safeNum(
        monthTotals.horasPR
      )} | Estudos=${safeNum(monthTotals.estudos)} | PAux=${safeNum(
        monthTotals.pAux
      )} | PReg=${safeNum(monthTotals.pReg)}`,
      left,
      y
    );
    y += 18;
  }

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i] || {};
    const g = t.group || {};
    const title = `Grupo ${g.numero ?? "?"} - ${g.superintendenteNome ?? ""}`;

    // Se faltar espaço, quebra página
    if (y > 700) {
      doc.addPage();
      y = 60;
    }

    doc.setFontSize(11);
    doc.text(title, left, y);
    y += 10;

    const tableRows = Array.isArray(t.rows) ? t.rows.map(normRow) : [];

    autoTable(doc, {
      startY: y + 6,
      head: [["Componente", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
      body: tableRows.length
        ? tableRows.map((r) => [
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

    // Atualiza Y depois da tabela
    y = (doc.lastAutoTable?.finalY || y + 200) + 26;
  }

  doc.save(`Relatorio_ADMIN_${monthLabel(monthId)}_tabelas_completas.pdf`);
}
