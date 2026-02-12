import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportAdminMonthToPdf({ monthId, groups, allRowsByGroup, totals }) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Relatório ADMIN - Tabelas completas", 14, 16);
  doc.setFontSize(11);
  doc.text(`Mês: ${monthId}`, 14, 24);

  doc.text(
    `Total: Horas PA=${totals.totalHorasPA || 0} | Horas PR=${totals.totalHorasPR || 0} | Estudos=${totals.totalEstudos || 0} | PA=${totals.qtdPA || 0} | PR=${totals.qtdPR || 0}`,
    14,
    32
  );

  let startY = 40;

  for (const g of groups) {
    const rows = (allRowsByGroup[g.id] || [])
      .slice()
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

    const title = `Grupo ${g.numero ?? g.id} - ${g.superintendenteNome || ""}`.trim();

    // quebra de página
    if (startY > 240) {
      doc.addPage();
      startY = 16;
    }

    doc.setFontSize(12);
    doc.text(title, 14, startY);
    startY += 6;

    const body = rows.map((r) => [
      r.nome || "",
      r.participou ? "Sim" : "Não",
      r.pioneiroAuxiliar ? "Sim" : "Não",
      r.pioneiroRegular ? "Sim" : "Não",
      String(Number(r.estudosBiblicos || 0)),
      String(Number(r.horasPA || 0)),
      String(Number(r.horasPR || 0)),
    ]);

    autoTable(doc, {
      startY,
      head: [["Componente", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
      body: body.length ? body : [["(sem lançamentos)", "", "", "", "", "", ""]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
    });

    startY = doc.lastAutoTable.finalY + 12;
  }

  doc.save(`Relatorio_ADMIN_${monthId}.pdf`);
}
