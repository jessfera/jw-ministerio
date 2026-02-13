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
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.VITE_LOGO_URL || import.meta.env.VITE_LOGO)) ||
    "/logo.png"
  );
}

async function loadImageToDataUrl(src) {
  if (!src) return null;
  return await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        // If canvas conversion fails (CORS), we just don't render the logo.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Exporta o relatório de 1 grupo (mês) em PDF.
 *
 * Observação: agora suporta cabeçalho com logo + nome da congregação.
 * Se você não passar os params, ele tenta pegar de envs:
 *  - VITE_CONGREGACAO_NOME (ou VITE_CONGREGACAO)
 *  - VITE_LOGO_URL (ou VITE_LOGO)  | default: /logo.png
 */
await exportGroupMonthToPdf({
  monthId,
  group,
  rows,
  totals,
  congregationName: "Congregação Nova Paraguaçu",
  logoUrl: "/logo.png",
}); = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const congName = congregationName || getCongregationName();
  const logoSrc = logoUrl || getLogoUrl();
  const logoDataUrl = await loadImageToDataUrl(logoSrc);

  const left = 40;
  let y = 48;

  // Cabeçalho (logo + nome da congregação)
  if (logoDataUrl) {
    // altura fixa para não distorcer demais
    const logoH = 34;
    const logoW = 34;
    doc.addImage(logoDataUrl, "PNG", left, y - 28, logoW, logoH);
  }

  doc.setFontSize(14);
  doc.text(congName, left + (logoDataUrl ? 44 : 0), y);

  doc.setFontSize(11);
  const groupLine = `Grupo nº ${group?.numero ?? "-"}  —  Superintendente: ${
    group?.superintendenteNome ?? "-"
  }`;
  doc.text(groupLine, left, y + 18);
  doc.text(`Mês: ${monthId || "-"}`, left, y + 34);

  y += 56;

  // Resumo
  doc.setFontSize(12);
  doc.text("Resumo do mês", left, y);
  doc.setFontSize(10);
  y += 14;
  doc.text(`Horas PA (total): ${safeNum(totals?.horasPA)}`, left, (y += 14));
  doc.text(`Horas PR (total): ${safeNum(totals?.horasPR)}`, left, (y += 14));
  doc.text(`Estudos bíblicos (total): ${safeNum(totals?.estudos)}`, left, (y += 14));
  doc.text(`P. Auxiliares: ${safeNum(totals?.pAux)} (horas: ${safeNum(totals?.horasPA)})`, left, (y += 14));
  doc.text(`P. Regulares: ${safeNum(totals?.pReg)} (horas: ${safeNum(totals?.horasPR)})`, left, (y += 14));

  y += 18;

  // Tabela
  autoTable(doc, {
    startY: y,
    head: [["Nome", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
    body: (rows || []).map((r) => [
      r.nome ?? "",
      r.participou ? "Sim" : "Não",
      r.pioneiroAux ? "Sim" : "Não",
      r.pioneiroReg ? "Sim" : "Não",
      String(safeNum(r.estudos)),
      String(safeNum(r.horasPA)),
      String(safeNum(r.horasPR)),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [230, 230, 230] },
    margin: { left, right: 40 },
  });

  doc.save(`relatorio-${monthId || "mes"}-grupo-${group?.numero ?? ""}.pdf`);
}
