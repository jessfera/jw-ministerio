function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function calcSummary(rows = []) {
  const list = Array.isArray(rows) ? rows : [];

  let totalHorasPA = 0;
  let totalHorasPR = 0;
  let totalEstudosBiblicos = 0;

  let totalPAux = 0; // contagem de P. Aux marcados
  let totalPReg = 0; // contagem de P. Reg marcados

  // ✅ Novos campos
  const totalCadastrados = list.length; // Participou (total cadastrados)
  let totalParticipou = 0; // "Estudos (total da coluna Participou)" -> contagem de participou
  let totalEstudosBiblicosPR = 0; // estudos bíblicos de P. Reg
  let totalEstudosBiblicosPA = 0; // estudos bíblicos de P. Aux
  let totalEstudosBiblicosParticipou = 0; // estudos bíblicos onde participou = true

  for (const r of list) {
    const participou = !!r?.participou;
    const pAux = !!(r?.pioneiroAuxiliar || r?.pAux || r?.pioneiroAux);
    const pReg = !!(r?.pioneiroRegular || r?.pReg || r?.pioneiroReg);

    const horasPA = safeNum(r?.horasPA);
    const horasPR = safeNum(r?.horasPR);
    const estudosBiblicos = safeNum(r?.estudosBiblicos ?? r?.estudos);

    totalHorasPA += horasPA;
    totalHorasPR += horasPR;
    totalEstudosBiblicos += estudosBiblicos;

    if (pAux) totalPAux += 1;
    if (pReg) totalPReg += 1;

    if (participou) totalParticipou += 1;

    if (pReg) totalEstudosBiblicosPR += estudosBiblicos;
    if (pAux) totalEstudosBiblicosPA += estudosBiblicos;
    if (participou) totalEstudosBiblicosParticipou += estudosBiblicos;
  }

  // ✅ Retorno compatível com telas + exports
  return {
    // usados no SummaryCard atual (pelo grep antigo)
    totalHorasPA,
    totalHorasPR,
    totalEstudosBiblicos,
    totalPAux,
    totalPReg,

    // ✅ novos campos pedidos no resumo do admin
    totalCadastrados,
    totalParticipou,
    totalEstudosBiblicosPR,
    totalEstudosBiblicosPA,
    totalEstudosBiblicosParticipou,

    // aliases (pra manter exports/relatórios que usam chaves "curtas")
    horasPA: totalHorasPA,
    horasPR: totalHorasPR,
    estudos: totalEstudosBiblicos,
    pAux: totalPAux,
    pReg: totalPReg,
  };
}