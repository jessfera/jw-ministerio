export function calcSummary(rows) {
  let totalEstudosBiblicos = 0;
  let totalHorasPA = 0;
  let totalHorasPR = 0;

  let qtdPioneirosAuxiliares = 0;
  let qtdPioneirosRegulares = 0;

  let totalHorasPioneirosAuxiliares = 0;
  let totalHorasPioneirosRegulares = 0;

  for (const r of rows) {
    const estudos = Number(r.estudosBiblicos || 0);
    const hPA = Number(r.horasPA || 0);
    const hPR = Number(r.horasPR || 0);

    totalEstudosBiblicos += estudos;
    totalHorasPA += hPA;
    totalHorasPR += hPR;

    const somaHoras = hPA + hPR;

    if (r.pioneiroAuxiliar) {
      qtdPioneirosAuxiliares += 1;
      totalHorasPioneirosAuxiliares += somaHoras;
    }
    if (r.pioneiroRegular) {
      qtdPioneirosRegulares += 1;
      totalHorasPioneirosRegulares += somaHoras;
    }
  }

  // arredondar 1 casa (opcional)
  const round1 = (n) => Math.round(n * 10) / 10;

  return {
    totalEstudosBiblicos,
    totalHorasPA: round1(totalHorasPA),
    totalHorasPR: round1(totalHorasPR),
    qtdPioneirosAuxiliares,
    qtdPioneirosRegulares,
    totalHorasPioneirosAuxiliares: round1(totalHorasPioneirosAuxiliares),
    totalHorasPioneirosRegulares: round1(totalHorasPioneirosRegulares),
  };
}