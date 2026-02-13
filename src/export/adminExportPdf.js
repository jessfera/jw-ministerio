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

function getLogoUrl() {
  return (
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_LOGO_URL) ||
    "/logo.png"
  );
}

async function loadImageToDataUrl(src) {
  if (!src || typeof window === "undefined") return null;
  return await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fmtMonthLabel(monthId) {
  // monthId is "AAAA-MM". We'll keep it simple and display it as-is.
  return monthId;
}

/**
 * Admin PDF export.
 * - exportType: "month" (consolidado) or "group" (grupo selecionado)
 * - When exportType === "group", pass selectedGroup.
 */
await exportAdminPdf({
  monthId,
  exportType: "month", // ou "group"
  selectedGroup,
  monthTotals,
  groupTotals,
  groupRows,
  congregationName: "Congregação Nova Paraguaçu",
  logoUrl: "/logo.png",
}); {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const congName = congregationName || getCongregationName();
  const logoSrc = logoUrl || getLogoUrl();
  const logoDataUrl = await loadImageToDataUrl(logoSrc);

  // Header
  const left = 40;
  const top = 40;
  let cursorY = top;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", left, cursorY, 48, 48);
    } catch {
      // ignore image issues
    }
  }
  doc.setFontSize(14);
  doc.text(congName, left + (logoDataUrl ? 60 : 0), cursorY + 18);
  doc.setFontSize(11);
  doc.text(`Relatório (Admin) — ${fmtMonthLabel(monthId)}`, left + (logoDataUrl ? 60 : 0), cursorY + 36);

  cursorY += 70;

  // Summary (month)
  const totals = exportType === "group" ? groupTotals : monthTotals;
  const title = exportType === "group"
    ? `Grupo nº ${selectedGroup?.numero ?? ""} — ${selectedGroup?.superintendenteNome ?? ""}`
    : "Consolidação do mês";

  doc.setFontSize(12);
  doc.text(title, left, cursorY);
  cursorY += 16;

  if (totals) {
    doc.setFontSize(10);
    const lines = [
      `Horas PA (total): ${totals.horasPA ?? 0}`,
      `Horas PR (total): ${totals.horasPR ?? 0}`,
      `Estudos bíblicos (total): ${totals.estudos ?? 0}`,
      `P. Auxiliares: ${totals.pAux ?? 0} (horas: ${totals.horasPA ?? 0})`,
      `P. Regulares: ${totals.pReg ?? 0} (horas: ${totals.horasPR ?? 0})`,
    ];
    lines.forEach((l) => {
      doc.text(l, left, cursorY);
      cursorY += 14;
    });
    cursorY += 6;
  }

  // Table (only for group export)
  if (exportType === "group" && Array.isArray(groupRows)) {
    autoTable(doc, {
      startY: cursorY,
      head: [["Nome", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
      body: groupRows.map((r) => [
        r.nome || "",
        r.participou ? "Sim" : "Não",
        r.pAux ? "Sim" : "Não",
        r.pReg ? "Sim" : "Não",
        r.estudos ?? 0,
        r.horasPA ?? 0,
        r.horasPR ?? 0,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fontSize: 9 },
      theme: "grid",
    });
  }

  const safeMonth = (monthId || "mes").replace(/[^0-9A-Za-z-_]/g, "_");
  const suffix = exportType === "group" ? `grupo_${selectedGroup?.numero ?? ""}` : "consolidado";
  doc.save(`relatorio_admin_${safeMonth}_${suffix}.pdf`);
}
