import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import MonthPicker from "../components/MonthPicker";
import SummaryCard from "../components/SummaryCard";
import { calcSummary } from "../lib/summary";
import { monthIdFromDate } from "../lib/month";

// ✅ Admin exports (corrigido: agora vem de src/export e o nome é exportAdminPdf)
import { exportAdminPdf } from "../export/adminExportPdf";
import { exportAdminMonthToExcel } from "../export/adminExportExcel"; // se o seu caminho/nome for diferente, ajuste aqui

// Grupo exports
import { exportGroupMonthToPdf } from "../export/exportPdf";
import { exportGroupMonthToExcel } from "../export/exportExcel";

export default function AdminDashboard() {
  const { logout } = useAuth();

  const [monthId, setMonthId] = useState(monthIdFromDate());
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [statuses, setStatuses] = useState({}); // groupId -> status
  const [globalSummary, setGlobalSummary] = useState(null);

  // carrega lista de grupos
  useEffect(() => {
    const run = async () => {
      const snap = await getDocs(collection(db, "groups"));
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
      setGroups(data);
      if (!selectedGroupId && data[0]) setSelectedGroupId(data[0].id);
    };
    run();
    // eslint-disable-next-line
  }, []);

  // escuta status por grupo (do month)
  useEffect(() => {
    if (groups.length === 0) return;

    const unsubs = groups.map((g) => {
      const reportRef = doc(db, "groups", g.id, "reports", monthId);
      return onSnapshot(reportRef, (snap) => {
        setStatuses((prev) => ({
          ...prev,
          [g.id]: snap.exists() ? (snap.data().status || "rascunho") : "rascunho",
        }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [groups, monthId]);

  // escuta publicadores do grupo selecionado
  useEffect(() => {
    if (!selectedGroupId) return;

    const pubsCol = collection(
      db,
      "groups",
      selectedGroupId,
      "reports",
      monthId,
      "publicadores"
    );

    const unsub = onSnapshot(pubsCol, (qs) => {
      setSelectedRows(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [selectedGroupId, monthId]);

  const selectedSummary = useMemo(() => calcSummary(selectedRows), [selectedRows]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  async function fetchAllRowsByGroup() {
    const out = {};
    for (const g of groups) {
      const snap = await getDocs(
        collection(db, "groups", g.id, "reports", monthId, "publicadores")
      );
      out[g.id] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return out;
  }

  // resumo global (admin)
  useEffect(() => {
    if (groups.length === 0) return;

    const run = async () => {
      let all = [];
      for (const g of groups) {
        const snap = await getDocs(
          collection(db, "groups", g.id, "reports", monthId, "publicadores")
        );
        all = all.concat(snap.docs.map((d) => d.data()));
      }
      setGlobalSummary(calcSummary(all));
    };

    run();
  }, [groups, monthId, statuses]);

  // ===== EXPORTS =====

  async function onExportMonthPdf() {
    try {
      // consolidado do mês (somatório geral)
      await exportAdminPdf({
        monthId,
        exportType: "month",
        monthTotals: globalSummary,
        congregationName: "Congregação Nova Paraguaçu",
        // logoUrl opcional: se não passar, ele tenta /logo.png
      });
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar PDF do mês. Veja o console para detalhes.");
    }
  }

  async function onExportMonthExcel() {
    try {
      const rowsByGroup = await fetchAllRowsByGroup();
      await exportAdminMonthToExcel({
        monthId,
        congregationName: "Congregação Nova Paraguaçu",
        groups,
        statuses,
        rowsByGroup,
      });
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar Excel do mês. Veja o console para detalhes.");
    }
  }

  // ✅ corrigido: handlers do grupo
  async function onExportSelectedGroupPdf() {
    if (!selectedGroupId || !selectedGroup) return;
    try {
      await exportGroupMonthToPdf({
        monthId,
        congregationName: "Congregação Nova Paraguaçu",
        group: {
          id: selectedGroupId,
          numero: selectedGroup.numero,
          superintendenteNome: selectedGroup.superintendenteNome,
        },
        rows: selectedRows,
        status: statuses[selectedGroupId] || "rascunho",
      });
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar PDF do grupo. Veja o console para detalhes.");
    }
  }

  async function onExportSelectedGroupExcel() {
    if (!selectedGroupId || !selectedGroup) return;
    try {
      await exportGroupMonthToExcel({
        monthId,
        congregationName: "Congregação Nova Paraguaçu",
        group: {
          id: selectedGroupId,
          numero: selectedGroup.numero,
          superintendenteNome: selectedGroup.superintendenteNome,
        },
        rows: selectedRows,
        status: statuses[selectedGroupId] || "rascunho",
      });
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar Excel do grupo. Veja o console para detalhes.");
    }
  }

  // PDF com tabelas completas (1 seção por grupo)
  async function onExportTablesPdf() {
    try {
      const rowsByGroup = await fetchAllRowsByGroup();

      const groupsTables = groups.map((g) => ({
        group: { numero: g.numero, superintendenteNome: g.superintendenteNome },
        rows: rowsByGroup[g.id] || [],
        totals: calcSummary((rowsByGroup[g.id] || []).map((r) => r)),
      }));

      await exportAdminPdf({
        monthId,
        exportType: "tables",
        monthTotals: globalSummary,
        groupsTables,
        congregationName: "Congregação Nova Paraguaçu",
      });
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar PDF (tabelas completas). Veja o console.");
    }
  }

  async function onDeleteTestMonth() {
    if (!monthId) return;
    const ok = window.confirm(
      `Tem certeza que deseja excluir os lançamentos de teste de ${monthId}?\n\nIsso remove groups/*/reports/${monthId} e a subcoleção publicadores.`
    );
    if (!ok) return;

    try {
      for (const g of groups) {
        const pubs = await getDocs(
          collection(db, "groups", g.id, "reports", monthId, "publicadores")
        );
        const batch = writeBatch(db);
        pubs.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(db, "groups", g.id, "reports", monthId));
        await batch.commit();
      }
      alert("Mês de teste excluído.");
    } catch (e) {
      console.error(e);
      alert("Falha ao excluir mês de teste. Veja o console para detalhes.");
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>Painel do Administrador</h2>
          <div className="muted">Acompanhe os 7 grupos e o resumo do mês.</div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>Mês:</span>
            <MonthPicker value={monthId} onChange={setMonthId} />
          </div>

          <button type="button" onClick={onExportMonthPdf} disabled={!monthId || groups.length === 0}>
            Baixar PDF (mês)
          </button>

          <button type="button" onClick={onExportMonthExcel} disabled={!monthId || groups.length === 0}>
            Baixar Excel (mês)
          </button>

          {/* ✅ corrigido: chamando os handlers certos */}
          <button type="button" onClick={onExportSelectedGroupPdf} disabled={!monthId || !selectedGroupId}>
            PDF do grupo
          </button>

          <button type="button" onClick={onExportSelectedGroupExcel} disabled={!monthId || !selectedGroupId}>
            Excel do grupo
          </button>

          <button type="button" onClick={onExportTablesPdf} disabled={!monthId || groups.length === 0}>
            PDF tabelas completas
          </button>

          <button
            type="button"
            onClick={onDeleteTestMonth}
            disabled={!monthId || groups.length === 0}
            style={{ borderColor: "#f66" }}
          >
            Excluir mês de teste
          </button>

          <button type="button" onClick={logout}>Sair</button>
        </div>
      </div>

      <SummaryCard summary={globalSummary} />

      <div className="card">
        <h3>Grupos</h3>
        <div className="grid2">
          {groups.map((g) => (
            <button
              key={g.id}
              className={selectedGroupId === g.id ? "chip chipActive" : "chip"}
              onClick={() => setSelectedGroupId(g.id)}
            >
              Grupo {g.numero} — {statuses[g.id] || "rascunho"}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Detalhe do grupo selecionado</h3>
        {selectedGroupId ? (
          <>
            <div className="muted" style={{ marginBottom: 10 }}>
              Status: <b>{statuses[selectedGroupId] || "rascunho"}</b>
            </div>

            <SummaryCard summary={selectedSummary} />

            <div className="muted">* Aqui fica somente leitura (admin não precisa editar).</div>

            <div style={{ marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Participou</th>
                    <th>P. Aux</th>
                    <th>P. Reg</th>
                    <th>Estudos</th>
                    <th>Horas PA</th>
                    <th>Horas PR</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.nome}</td>
                      <td>{r.participou ? "Sim" : "Não"}</td>
                      <td>{r.pioneiroAuxiliar ? "Sim" : "Não"}</td>
                      <td>{r.pioneiroRegular ? "Sim" : "Não"}</td>
                      <td>{r.estudosBiblicos ?? 0}</td>
                      <td>{r.horasPA ?? 0}</td>
                      <td>{r.horasPR ?? 0}</td>
                    </tr>
                  ))}

                  {selectedRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted">
                        Sem lançamentos neste mês.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="muted">Selecione um grupo.</div>
        )}
      </div>
    </div>
  );
}
