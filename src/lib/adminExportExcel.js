import * as XLSX from "xlsx";

export function exportAdminMonthToExcel({ monthLabel, groupsData }) {
  const rows = [];

  for (const g of groupsData) {
    for (const r of g.rows || []) {
      rows.push({
        Grupo: g.numero ?? "",
        Nome: r.nome ?? "",
        Participou: r.participou ? "Sim" : "Não",
        "P. Aux": r.pAux ? "Sim" : "Não",
        "P. Reg": r.pReg ? "Sim" : "Não",
        Estudos: r.estudos ?? 0,
        "Horas PA": r.horasPA ?? 0,
        "Horas PR": r.horasPR ?? 0,
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Consolidado");

  XLSX.writeFile(wb, `admin-relatorio-${monthLabel}.xlsx`);
}
