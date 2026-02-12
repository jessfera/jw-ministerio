import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportGroupMonthToPdf({ groupLabel, monthId, rows, summary }) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(`Relatorio do mes - ${groupLabel}`, 14, 16);

  doc.setFontSize(11);
  doc.text(`Mes: ${monthId}`, 14, 24);

  const resumoLinha = `Resumo: Horas PA=${Number(summary?.totalHorasPA || 0)} | Horas PR=${Number(
    summary?.totalHorasPR || 0
  )} | Estudos=${Number(summary?.totalEstudos || 0)} | PA=${Number(summary?.qtdPA || 0)} | PR=${Number(
    summary?.qtdPR || 0
  )}`;

  doc.text(resumoLinha, 14, 32);

  const body = (rows || [])
    .slice()
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
    .map((r) => [
      r.nome || "",
      r.participou ? "Sim" : "Nao",
      r.pioneiroAuxiliar ? "Sim" : "Nao",
      r.pioneiroRegular ? "Sim" : "Nao",
      String(Number(r.estudosBiblicos || 0)),
      String(Number(r.horasPA || 0)),
      String(Number(r.horasPR || 0)),
    ]);

  autoTable(doc, {
    startY: 38,
    head: [["Componente", "Participou", "P. Aux", "P. Reg", "Estudos", "Horas PA", "Horas PR"]],
    body,
    styles: { fontSize: 9 },
  });

  const fileName = `Relatorio_${groupLabel}_${monthId}.pdf`;
  doc.save(fileName);
}
