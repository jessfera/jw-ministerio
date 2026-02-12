import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportGroupMonthToExcel({ groupLabel, monthId, rows, summary }) {
  const dataRows = (rows || []).map((r) => ({
    "Componente do grupo": r.nome || "",
    "Participou no ministério": r.participou ? "Sim" : "Não",
    "Pioneiro auxiliar": r.pioneiroAuxiliar ? "Sim" : "Não",
    "Pioneiro regular": r.pioneiroRegular ? "Sim" : "Não",
    "Estudos bíblicos": Number(r.estudosBiblicos || 0),
    "Horas PA": Number(r.horasPA || 0),
    "Horas PR": Number(r.horasPR || 0),
  }));

  const ws1 = XLSX.utils.json_to_sheet(dataRows);

  const resumoRows = [
    { Indicador: "Total Horas PA", Valor: Number(summary?.totalHorasPA || 0) },
    { Indicador: "Total Horas PR", Valor: Number(summary?.totalHorasPR || 0) },
    { Indicador: "Total Estudos Bíblicos", Valor: Number(summary?.totalEstudos || 0) },
    { Indicador: "Qtd Pioneiros Auxiliares", Valor: Number(summary?.qtdPA || 0) },
    { Indicador: "Qtd Pioneiros Regulares", Valor: Number(summary?.qtdPR || 0) },
  ];
  const ws2 = XLSX.utils.json_to_sheet(resumoRows);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "Relatorio");
  XLSX.utils.book_append_sheet(wb, ws2, "Resumo");

  const fileName = `Relatorio_${groupLabel}_${monthId}.xlsx`;
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([out], { type: "application/octet-stream" }), fileName);
}
