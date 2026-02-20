import React from "react";

export default function SummaryCard({ summary }) {
  if (!summary) return null;

  const v = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

  return (
    <div className="card">
      <h3>Resumo do mês</h3>

      {/* ✅ já existiam */}
      <div><b>Horas PA (total):</b> {v(summary.totalHorasPA ?? summary.horasPA)}</div>
      <div><b>Horas PR (total):</b> {v(summary.totalHorasPR ?? summary.horasPR)}</div>
      <div><b>Estudos bíblicos (total):</b> {v(summary.totalEstudosBiblicos ?? summary.estudos)}</div>
      <div>
        <b>P. Auxiliares:</b> {v(summary.totalPAux ?? summary.pAux)} (horas: {v(summary.totalHorasPA ?? summary.horasPA)})
      </div>
      <div>
        <b>P. Regulares:</b> {v(summary.totalPReg ?? summary.pReg)} (horas: {v(summary.totalHorasPR ?? summary.horasPR)})
      </div>

      {/* ✅ novos campos (aparecem automaticamente no Admin, porque ele usa o mesmo SummaryCard) */}
      <div style={{ marginTop: 10 }}>
        <div><b>Participou (total cadastrados):</b> {v(summary.totalCadastrados)}</div>
        <div><b>Participou (total marcados):</b> {v(summary.totalParticipou)}</div>
        <div><b>Estudos bíblicos PR (total):</b> {v(summary.totalEstudosBiblicosPR)}</div>
        <div><b>Estudos bíblicos PA (total):</b> {v(summary.totalEstudosBiblicosPA)}</div>
        <div><b>Estudos bíblicos Participou (total):</b> {v(summary.totalEstudosBiblicosParticipou)}</div>
      </div>
    </div>
  );
}