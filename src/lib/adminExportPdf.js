import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportAdminMonthToPdf({ monthLabel, groupsData }) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(14);
  doc.text(`Relatório do mês: ${monthLabel}`, 14, 14);

  // Consolidação (resumo geral)
  const allRows = [];
  for (const g of groupsData) {
    for (const row of g.rows || []) {
      allRows.push({ ...row, groupNumero: g.numero });
    }
  }

  // Tabela completa consolidada
  autoTable(doc, {
    startY: 22,
    head: [[
      "Grupo", "Nome", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"
    ]],
    body: allRows.map(r => ([
      String(r.groupNumero ?? ""),
      r.nome ?? "",
      r.participou ? "Sim" : "Não",
      r.pAux ? "Sim" : "Não",
      r.pReg ? "Sim" : "Não",
      String(r.estudos ?? 0),
      String(r.horasPA ?? 0),
      String(r.horasPR ?? 0),
    ])),
    styles: { fontSize: 9 },
  });

  doc.save(`admin-relatorio-${monthLabel}.pdf`);
}
