import * as XLSX from "xlsx";

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function exportGroupMonthToExcel({ monthId, group, rows, totals, congregationName }) {
  const wb = XLSX.utils.book_new();

  const resumo = [
    [congregationName || "Congregação Nova Paraguaçu"],
    ["Relatório do Ministério"],
    ["Mês", monthId],
    ["Grupo", group?.numero ?? "-"],
    ["Superintendente", group?.superintendenteNome ?? "-"],
    [],
    ["Horas PA (total)", safeNum(totals?.horasPA)],
    ["Horas PR (total)", safeNum(totals?.horasPR)],
    ["Estudos bíblicos (total)", safeNum(totals?.estudos)],
    ["P. Auxiliares (qtd)", safeNum(totals?.pAux)],
    ["P. Regulares (qtd)", safeNum(totals?.pReg)],
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

  const tabela = (rows || []).map((r) => ({
    Nome: r.nome ?? "",
    Participou: r.participou ? "Sim" : "Não",
    "P. Aux": r.pioneiroAux ? "Sim" : "Não",
    "P. Reg": r.pioneiroReg ? "Sim" : "Não",
    Estudos: safeNum(r.estudos),
    "Horas PA": safeNum(r.horasPA),
    "Horas PR": safeNum(r.horasPR),
  }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tabela), "Tabela");
  XLSX.writeFile(wb, `Relatorio_${monthId}_Grupo_${group?.numero ?? ""}.xlsx`);
}
