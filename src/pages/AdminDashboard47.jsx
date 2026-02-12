import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import MonthPicker from "../components/MonthPicker";
import SummaryCard from "../components/SummaryCard";
import { calcSummary } from "../lib/summary";
import { monthIdFromDate } from "../lib/month";
import { exportAdminMonthToExcel } from "../export/adminExportExcel";
import { exportAdminMonthToPdf } from "../export/adminExportPdf";

export default function AdminDashboard({ onGoMembers }) {
  const { logout } = useAuth();
  const [monthId, setMonthId] = useState(monthIdFromDate());
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  // groupId -> { exists: boolean, status: string }
  const [statuses, setStatuses] = useState({});
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

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
          [g.id]: {
            exists: snap.exists(),
            status: snap.exists() ? snap.data().status || "rascunho" : "sem registro",
          },
        }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [groups, monthId]);

  // escuta publicadores do grupo selecionado
  useEffect(() => {
    if (!selectedGroupId) return;

    const pubsCol = collection(db, "groups", selectedGroupId, "reports", monthId, "publicadores");
    const unsub = onSnapshot(pubsCol, (qs) => {
      setSelectedRows(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [selectedGroupId, monthId]);

  const selectedSummary = useMemo(() => calcSummary(selectedRows), [selectedRows]);

  // resumo global (admin): soma todos grupos
  const [globalSummary, setGlobalSummary] = useState(null);

  useEffect(() => {
    if (groups.length === 0) return;

    const run = async () => {
      let all = [];
      for (const g of groups) {
        const snap = await getDocs(collection(db, "groups", g.id, "reports", monthId, "publicadores"));
        all = all.concat(snap.docs.map((d) => d.data()));
      }
      setGlobalSummary(calcSummary(all));
    };

    run();
  }, [groups, monthId, statuses]);

  function statusLabel(groupId) {
    const s = statuses[groupId];
    if (!s) return "carregando";
    return s.exists ? s.status : "sem registro";
  }

  async function loadAllGroupTablesForMonth() {
    // usa os grupos já carregados
    const allRowsByGroup = {};

    await Promise.all(
      groups.map(async (g) => {
        const pubsCol = collection(db, "groups", g.id, "reports", monthId, "publicadores");
        const pubsSnap = await getDocs(pubsCol);
        allRowsByGroup[g.id] = pubsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      })
    );

    const allRows = Object.values(allRowsByGroup).flat();
    const totals = {
      ...calcSummary(allRows),
      totalLinhas: allRows.length,
    };

    return { groups, allRowsByGroup, totals };
  }

  async function onExportAdminExcel() {
    try {
      setExporting(true);
      setExportMsg("Gerando Excel...");
      const pack = await loadAllGroupTablesForMonth();
      exportAdminMonthToExcel({ monthId, ...pack });
      setExportMsg("");
    } catch (e) {
      console.error(e);
      setExportMsg("Erro ao exportar Excel. Veja o Console (F12).");
    } finally {
      setExporting(false);
    }
  }

  async function onExportAdminPdf() {
    try {
      setExporting(true);
      setExportMsg("Gerando PDF...");
      const pack = await loadAllGroupTablesForMonth();
      exportAdminMonthToPdf({ monthId, ...pack });
      setExportMsg("");
    } catch (e) {
      console.error(e);
      setExportMsg("Erro ao exportar PDF. Veja o Console (F12).");
    } finally {
      setExporting(false);
    }
  }

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>Painel do Administrador</h2>
          <div className="muted">Acompanhe os 7 grupos e o resumo do mês.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <MonthPicker value={monthId} onChange={setMonthId} />
          <button onClick={onExportAdminPdf} disabled={exporting || groups.length === 0}>
            Exportar PDF (tudo)
          </button>
          <button onClick={onExportAdminExcel} disabled={exporting || groups.length === 0}>
            Exportar Excel (tudo)
          </button>
          <button onClick={onGoMembers}>Membros</button>
          <button onClick={logout}>Sair</button>
        </div>
      </div>

      {!!exportMsg && <div className="muted" style={{ marginBottom: 12 }}>{exportMsg}</div>}

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
              Grupo {g.numero} — {statusLabel(g.id)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Detalhe do grupo selecionado</h3>
        {selectedGroupId ? (
          <>
            <div className="muted" style={{ marginBottom: 6 }}>
              Grupo: <b>{selectedGroup?.numero ?? selectedGroupId}</b> — Superintendente: {selectedGroup?.superintendenteNome || "(não informado)"}
            </div>
            <div className="muted" style={{ marginBottom: 10 }}>
              Status: <b>{statusLabel(selectedGroupId)}</b> — Linhas: <b>{selectedRows.length}</b>
            </div>

            <SummaryCard summary={selectedSummary} />

            <div className="muted">* Somente leitura (admin não edita).</div>

            <div style={{ marginTop: 10, overflowX: "auto" }}>
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
                      <td colSpan={7} className="muted">Sem lançamentos neste mês.</td>
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
