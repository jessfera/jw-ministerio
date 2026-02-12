import jsPDF from "jspdf";
import "jspdf-autotable";

function monthLabelFromId(monthId) {
  const [y, m] = monthId.split("-");
  const mm = parseInt(m, 10);
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `${meses[mm-1]}/${y}`;
}

function safeFilename(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_");
}

export function exportAdminGroupPdf({ monthId, group, rows, summary, status }) {
  const doc = new jsPDF();
  const label = monthLabelFromId(monthId);

  doc.setFontSize(14);
  doc.text(`Relatório do Mês - Grupo ${group?.numero ?? ""}`, 14, 16);

  doc.setFontSize(11);
  doc.text(`Mês: ${label}`, 14, 24);
  doc.text(`Superintendente: ${group?.superintendenteNome ?? ""}`, 14, 30);
  doc.text(`Status: ${status ?? "sem registro"}`, 14, 36);

  doc.text(`Horas PA (total): ${summary?.horasPA ?? 0}`, 14, 46);
  doc.text(`Horas PR (total): ${summary?.horasPR ?? 0}`, 14, 52);
  doc.text(`Estudos (total): ${summary?.estudos ?? 0}`, 14, 58);
  doc.text(`P. Auxiliares: ${summary?.pAuxCount ?? 0} (horas: ${summary?.pAuxHours ?? 0})`, 14, 64);
  doc.text(`P. Regulares: ${summary?.pRegCount ?? 0} (horas: ${summary?.pRegHours ?? 0})`, 14, 70);

  const body = (rows || []).map((r) => ([
    r.nome ?? "",
    r.participou ? "Sim" : "Não",
    r.pioneiroAuxiliar ? "Sim" : "Não",
    r.pioneiroRegular ? "Sim" : "Não",
    Number(r.estudos ?? 0),
    Number(r.horasPA ?? 0),
    Number(r.horasPR ?? 0),
  ]));

  doc.autoTable({
    startY: 78,
    head: [["Nome", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
    body,
    styles: { fontSize: 9 },
    headStyles: { fontStyle: "bold" },
  });

  const fname = `Relatorio_${label}_Grupo_${group?.numero ?? ""}_${safeFilename(group?.superintendenteNome)}.pdf`;
  doc.save(fname);
}

export function exportAdminMonthPdf({ monthId, groupsData, consolidated }) {
  const doc = new jsPDF();
  const label = monthLabelFromId(monthId);

  doc.setFontSize(14);
  doc.text(`Relatório Consolidado - ${label}`, 14, 16);

  doc.setFontSize(11);
  doc.text(`Horas PA (total): ${consolidated?.horasPA ?? 0}`, 14, 26);
  doc.text(`Horas PR (total): ${consolidated?.horasPR ?? 0}`, 14, 32);
  doc.text(`Estudos (total): ${consolidated?.estudos ?? 0}`, 14, 38);
  doc.text(`P. Auxiliares: ${consolidated?.pAuxCount ?? 0} (horas: ${consolidated?.pAuxHours ?? 0})`, 14, 44);
  doc.text(`P. Regulares: ${consolidated?.pRegCount ?? 0} (horas: ${consolidated?.pRegHours ?? 0})`, 14, 50);

  // Tabela consolidada por grupo
  const consBody = (groupsData || []).map((g) => ([
    `Grupo ${g.group?.numero ?? ""}`,
    g.group?.superintendenteNome ?? "",
    g.status ?? "sem registro",
    g.summary?.horasPA ?? 0,
    g.summary?.horasPR ?? 0,
    g.summary?.estudos ?? 0,
    g.summary?.pAuxCount ?? 0,
    g.summary?.pRegCount ?? 0,
  ]));

  doc.autoTable({
    startY: 58,
    head: [["Grupo", "Superintendente", "Status", "Horas PA", "Horas PR", "Estudos", "P. Aux", "P. Reg"]],
    body: consBody,
    styles: { fontSize: 9 },
    headStyles: { fontStyle: "bold" },
  });

  // Uma seção por grupo (tabelas completas)
  for (const g of groupsData || []) {
    doc.addPage();
    doc.setFontSize(13);
    doc.text(`Grupo ${g.group?.numero ?? ""} - ${g.group?.superintendenteNome ?? ""}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Status: ${g.status ?? "sem registro"} | Mês: ${label}`, 14, 24);

    const body = (g.rows || []).map((r) => ([
      r.nome ?? "",
      r.participou ? "Sim" : "Não",
      r.pioneiroAuxiliar ? "Sim" : "Não",
      r.pioneiroRegular ? "Sim" : "Não",
      Number(r.estudos ?? 0),
      Number(r.horasPA ?? 0),
      Number(r.horasPR ?? 0),
    ]));

    doc.autoTable({
      startY: 30,
      head: [["Nome", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
      body,
      styles: { fontSize: 9 },
      headStyles: { fontStyle: "bold" },
    });
  }

  doc.save(`Relatorio_${label}_Consolidado.pdf`);
}
