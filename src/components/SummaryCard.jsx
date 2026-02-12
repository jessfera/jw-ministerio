import React from "react";

export default function SummaryCard({ summary }) {
  if (!summary) return null;

  return (
    <div className="card">
      <h3>Resumo do mês</h3>
      <div className="grid2">
        <div><b>Horas PA (total):</b> {summary.totalHorasPA}</div>
        <div><b>Horas PR (total):</b> {summary.totalHorasPR}</div>
        <div><b>Estudos bíblicos (total):</b> {summary.totalEstudosBiblicos}</div>
        <div><b>P. Auxiliares:</b> {summary.qtdPioneirosAuxiliares} (horas: {summary.totalHorasPioneirosAuxiliares})</div>
        <div><b>P. Regulares:</b> {summary.qtdPioneirosRegulares} (horas: {summary.totalHorasPioneirosRegulares})</div>
      </div>
    </div>
  );
}