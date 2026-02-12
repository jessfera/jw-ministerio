import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

function monthLabelFromId(monthId) {
  // monthId: "2026-02" -> "Fev/2026" (simples)
  const [y, m] = monthId.split("-");
  const mm = parseInt(m, 10);
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[mm-1]}/${y}`;
}

function safeFilename(s) {
  return String(s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_");
}

export function exportAdminGroupExcel({ monthId, group, rows, summary }) {
  const wb = XLSX.utils.book_new();
  const label = monthLabelFromId(monthId);

  // Resumo
  const resumo = [
    ["Mês", label],
    ["Grupo", group?.numero ?? ""],
    ["Superintendente", group?.superintendenteNome ?? ""],
    [],
    ["Horas PA (total)", summary?.horasPA ?? 0],
    ["Horas PR (total)", summary?.horasPR ?? 0],
    ["Estudos bíblicos (total)", summary?.estudos ?? 0],
    ["P. Auxiliares (qtde)", summary?.pAuxCount ?? 0],
    ["P. Regulares (qtde)", summary?.pRegCount ?? 0],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // Tabela completa
  const tabela = (rows || []).map((r) => ({
    Nome: r.nome ?? "",
    Participou: r.participou ? "Sim" : "Não",
    "P. Aux": r.pioneiroAuxiliar ? "Sim" : "Não",
    "P. Reg": r.pioneiroRegular ? "Sim" : "Não",
    Estudos: Number(r.estudos ?? 0),
    "Horas PA": Number(r.horasPA ?? 0),
    "Horas PR": Number(r.horasPR ?? 0),
  }));
  const wsTabela = XLSX.utils.json_to_sheet(tabela);
  XLSX.utils.book_append_sheet(wb, wsTabela, "Tabela");

  const fname = `Relatorio_${label}_Grupo_${group?.numero ?? ""}_${safeFilename(group?.superintendenteNome)}.xlsx`;
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([out], { type: "application/octet-stream" }), fname);
}

export function exportAdminMonthExcel({ monthId, groupsData, consolidated }) {
  // groupsData: [{ group, rows, summary, status }]
  const wb = XLSX.utils.book_new();
  const label = monthLabelFromId(monthId);

  // Consolidado
  const consRows = (groupsData || []).map((g) => ({
    Grupo: g.group?.numero ?? "",
    Superintendente: g.group?.superintendenteNome ?? "",
    Status: g.status ?? "sem registro",
    "Horas PA": g.summary?.horasPA ?? 0,
    "Horas PR": g.summary?.horasPR ?? 0,
    "Estudos": g.summary?.estudos ?? 0,
    "P. Aux (qtde)": g.summary?.pAuxCount ?? 0,
    "P. Reg (qtde)": g.summary?.pRegCount ?? 0,
  }));
  const wsCons = XLSX.utils.json_to_sheet(consRows);
  XLSX.utils.book_append_sheet(wb, wsCons, "Consolidado");

  // Totais gerais (opcional)
  if (consolidated) {
    const wsTot = XLSX.utils.aoa_to_sheet([
      ["Mês", label],
      [],
      ["Horas PA (total)", consolidated.horasPA ?? 0],
      ["Horas PR (total)", consolidated.horasPR ?? 0],
      ["Estudos (total)", consolidated.estudos ?? 0],
      ["P. Auxiliares (qtde)", consolidated.pAuxCount ?? 0],
      ["P. Regulares (qtde)", consolidated.pRegCount ?? 0],
    ]);
    XLSX.utils.book_append_sheet(wb, wsTot, "Totais");
  }

  // Uma aba por grupo com tabela completa
  for (const g of groupsData || []) {
    const sheetName = `G${g.group?.numero ?? ""}`.slice(0, 31);
    const tabela = (g.rows || []).map((r) => ({
      Nome: r.nome ?? "",
      Participou: r.participou ? "Sim" : "Não",
      "P. Aux": r.pioneiroAuxiliar ? "Sim" : "Não",
      "P. Reg": r.pioneiroRegular ? "Sim" : "Não",
      Estudos: Number(r.estudos ?? 0),
      "Horas PA": Number(r.horasPA ?? 0),
      "Horas PR": Number(r.horasPR ?? 0),
    }));
    const ws = XLSX.utils.json_to_sheet(tabela);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const fname = `Relatorio_${label}_Consolidado.xlsx`;
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([out], { type: "application/octet-stream" }), fname);
}
