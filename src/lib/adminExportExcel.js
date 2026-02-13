import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function computeTotalsFromRows(rows = []) {
  return rows.reduce(
    (acc, r) => {
      const estudos = Number(r.estudosBiblicos || 0) || 0;
      const horasPA = Number(r.horasPA || 0) || 0;
      const horasPR = Number(r.horasPR || 0) || 0;
      acc.totalEstudos += estudos;
      acc.totalHorasPA += horasPA;
      acc.totalHorasPR += horasPR;
      if (r.pioneiroAuxiliar) acc.qtdPA += 1;
      if (r.pioneiroRegular) acc.qtdPR += 1;
      return acc;
    },
    { totalHorasPA: 0, totalHorasPR: 0, totalEstudos: 0, qtdPA: 0, qtdPR: 0 }
  );
}

function computeTotalsFromAll(allRowsByGroup = {}) {
  const all = Object.values(allRowsByGroup).flat();
  return computeTotalsFromRows(all);
}

export function exportAdminMonthToExcel({ monthId, groups, allRowsByGroup, totals }) {
  const safeTotals = totals || computeTotalsFromAll(allRowsByGroup);

  const wb = XLSX.utils.book_new();

  // Resumo (consolidação do mês)
  const resumo = [
    ["Relatório ADMIN - Consolidação do mês"],
    ["Mês", monthId],
    [],
    ["Horas PA (total)", safeTotals.totalHorasPA || 0],
    ["Horas PR (total)", safeTotals.totalHorasPR || 0],
    ["Estudos bíblicos (total)", safeTotals.totalEstudos || 0],
    ["P. Auxiliares (qtd)", safeTotals.qtdPA || 0],
    ["P. Regulares (qtd)", safeTotals.qtdPR || 0],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // Uma aba por grupo (tabela completa)
  for (const g of groups) {
    const rows = (allRowsByGroup[g.id] || [])
      .slice()
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

    const data = [
      [
        "Componente",
        "Participou",
        "P. Aux",
        "P. Reg",
        "Estudos",
        "Horas PA",
        "Horas PR",
      ],
      ...rows.map((r) => [
        r.nome || "",
        r.participou ? "Sim" : "Não",
        r.pioneiroAuxiliar ? "Sim" : "Não",
        r.pioneiroRegular ? "Sim" : "Não",
        Number(r.estudosBiblicos || 0),
        Number(r.horasPA || 0),
        Number(r.horasPR || 0),
      ]),
    ];

    if (data.length === 1) {
      data.push(["(sem lançamentos)", "", "", "", "", "", ""]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    const sheetName = `Grupo ${g.numero ?? g.id}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([out], { type: "application/octet-stream" }), `Relatorio_ADMIN_${monthId}.xlsx`);
}
