import * as XLSX from "xlsx";

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normRow(r) {
  return {
    nome: r.nome ?? r.name ?? "",
    participou: !!(r.participou ?? r.participation),
    pAux: !!(r.pioneiroAuxiliar ?? r.pioneiroAux ?? r.pAux),
    pReg: !!(r.pioneiroRegular ?? r.pioneiroReg ?? r.pReg),
    estudos: safeNum(r.estudosBiblicos ?? r.estudos),
    horasPA: safeNum(r.horasPA),
    horasPR: safeNum(r.horasPR),
  };
}

export async function exportGroupMonthToExcel(opts = {}) {
  const { monthId, group, rows, totals, congregationName } = opts;

  const wb = XLSX.utils.book_new();

  const resumo = [
    [congregationName || "Congregação Nova Paraguaçu"],
    ["Relatório do Ministério"],
    ["Mês", monthId || "-"],
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

  const tabela = (rows || []).map(normRow).map((r) => ({
    Nome: r.nome,
    Participou: r.participou ? "Sim" : "Não",
    "P. Aux": r.pAux ? "Sim" : "Não",
    "P. Reg": r.pReg ? "Sim" : "Não",
    Estudos: safeNum(r.estudos),
    "Horas PA": safeNum(r.horasPA),
    "Horas PR": safeNum(r.horasPR),
  }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tabela), "Tabela");

  const safeMonth = (monthId || "mes").replace(/[^0-9A-Za-z-_]/g, "_");
  XLSX.writeFile(wb, `Relatorio_${safeMonth}_Grupo_${group?.numero ?? ""}.xlsx`);
}
