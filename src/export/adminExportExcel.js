import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function getCongregationName(fallback = "Congregação Nova Paraguaçu") {
  return (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      (import.meta.env.VITE_CONGREGACAO_NOME || import.meta.env.VITE_CONGREGACAO)) ||
    fallback
  );
}

export function exportAdminMonthToExcel({ monthId, groups, allRowsByGroup, totals }) {
  const wb = XLSX.utils.book_new();

  const congregacao = getCongregationName();

  // Aba Total (resumo geral)
  const totalSheet = XLSX.utils.json_to_sheet([
    { Indicador: "Congregação", Valor: congregacao },
    { Indicador: "Mês", Valor: monthId },
    { Indicador: "Total Horas PA", Valor: totals.totalHorasPA || 0 },
    { Indicador: "Total Horas PR", Valor: totals.totalHorasPR || 0 },
    { Indicador: "Total Estudos Bíblicos", Valor: totals.totalEstudos || 0 },
    { Indicador: "Qtd Pioneiros Auxiliares", Valor: totals.qtdPA || 0 },
    { Indicador: "Qtd Pioneiros Regulares", Valor: totals.qtdPR || 0 },
    { Indicador: "Total Publicadores (linhas)", Valor: totals.totalLinhas || 0 },
  ]);
  XLSX.utils.book_append_sheet(wb, totalSheet, "Total");

  // Uma aba por grupo com tabela completa
  for (const g of groups) {
    const rows = allRowsByGroup[g.id] || [];
    const dataRows = rows
      .slice()
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
      .map((r) => ({
        "Componente do grupo": r.nome || "",
        "Participou no ministério": r.participou ? "Sim" : "Não",
        "Pioneiro auxiliar": r.pioneiroAuxiliar ? "Sim" : "Não",
        "Pioneiro regular": r.pioneiroRegular ? "Sim" : "Não",
        "Estudos bíblicos": Number(r.estudosBiblicos || 0),
        "Horas PA": Number(r.horasPA || 0),
        "Horas PR": Number(r.horasPR || 0),
      }));

    const ws = XLSX.utils.json_to_sheet(dataRows);

    // Cabeçalho no topo da aba (fica acima da tabela)
    XLSX.utils.sheet_add_aoa(
      ws,
      [[congregacao], [`Grupo ${g.numero ?? ""} — ${g.superintendenteNome ?? ""}`], [`Mês: ${monthId}`], []],
      { origin: "A1" }
    );

    // Nome seguro da aba (máx 31 chars no Excel)
    const sheetName = `G${String(g.numero || g.id).replace(/\D/g, "") || g.id}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const fileName = `Relatorio_ADMIN_${monthId}.xlsx`;
  saveAs(new Blob([out], { type: "application/octet-stream" }), fileName);
}
