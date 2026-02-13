import * as XLSX from "xlsx";

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeTotalsFromRows(rows = []) {
  return rows.reduce(
    (acc, r) => {
      acc.totalHorasPA += safeNum(r.horasPA);
      acc.totalHorasPR += safeNum(r.horasPR);
      acc.totalEstudos += safeNum(r.estudosBiblicos ?? r.estudos);
      if (r.pioneiroAuxiliar || r.pAux) acc.qtdPA += 1;
      if (r.pioneiroRegular || r.pReg) acc.qtdPR += 1;
      acc.totalLinhas += 1;
      return acc;
    },
    { totalHorasPA: 0, totalHorasPR: 0, totalEstudos: 0, qtdPA: 0, qtdPR: 0, totalLinhas: 0 }
  );
}

export function exportAdminMonthToExcel({ monthId, groups, allRowsByGroup, totals }) {
  const safeTotals = totals || computeTotalsFromRows(Object.values(allRowsByGroup || {}).flat());

  const wb = XLSX.utils.book_new();

  const resumo = [
    ["Relatório ADMIN - Consolidação do mês"],
    ["Mês", monthId],
    [],
    ["Horas PA (total)", safeTotals.totalHorasPA],
    ["Horas PR (total)", safeTotals.totalHorasPR],
    ["Estudos bíblicos (total)", safeTotals.totalEstudos],
    ["P. Auxiliares (qtd)", safeTotals.qtdPA],
    ["P. Regulares (qtd)", safeTotals.qtdPR],
    ["Total de linhas", safeTotals.totalLinhas],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "Resumo");

  for (const g of groups || []) {
    const rows = (allRowsByGroup?.[g.id] || [])
      .slice()
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
      .map((r) => ({
        "Componente do grupo": r.nome || "",
        "Participou no ministério": r.participou ? "Sim" : "Não",
        "Pioneiro auxiliar": (r.pioneiroAuxiliar || r.pAux) ? "Sim" : "Não",
        "Pioneiro regular": (r.pioneiroRegular || r.pReg) ? "Sim" : "Não",
        "Estudos bíblicos": safeNum(r.estudosBiblicos ?? r.estudos),
        "Horas PA": safeNum(r.horasPA),
        "Horas PR": safeNum(r.horasPR),
      }));

    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Componente do grupo": "(sem lançamentos)" }]);
    const sheetName = `Grupo ${g.numero ?? g.id}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, `Relatorio_ADMIN_${monthId}.xlsx`);
}
