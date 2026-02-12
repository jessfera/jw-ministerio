import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import MonthPicker from "../components/MonthPicker";
import SummaryCard from "../components/SummaryCard";
import { calcSummary } from "../lib/summary";
import { monthIdFromDate } from "../lib/month";
import { exportAdminMonthToExcel } from "../lib/adminExportExcel";
import { exportAdminMonthToPdf } from "../lib/adminExportPdf";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [monthId, setMonthId] = useState(monthIdFromDate());
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [statuses, setStatuses] = useState({}); // groupId -> status

  // carrega lista de grupos
  useEffect(() => {
    const run = async () => {
      const snap = await getDocs(collection(db, "groups"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (a.numero ?? 0) - (b.numero ?? 0));
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

    const pubsCol = collection(db, "groups", selectedGroupId, "reports", monthId, "publicadores");
    const unsub = onSnapshot(pubsCol, (qs) => {
      setSelectedRows(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [selectedGroupId, monthId]);

  // resumo do grupo selecionado
  const selectedSummary = useMemo(() => calcSummary(selectedRows), [selectedRows]);

  // resumo global (admin): soma todos grupos lendo todas as linhas (7 grupos é pouco)
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
  }, [groups, monthId, statuses]); // recalcula quando status muda (ou mês)

  async function loadAllRowsByGroup(groupList = groups) {
    const allRowsByGroup = {};
    for (const g of groupList) {
      const snap = await getDocs(
        collection(db, "groups", g.id, "reports", monthId, "publicadores")
      );
      allRowsByGroup[g.id] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    return allRowsByGroup;
  }

  async function handleExportMonthPdf() {
    const allRowsByGroup = await loadAllRowsByGroup(groups);
    exportAdminMonthToPdf({ monthId, groups, statuses, allRowsByGroup });
  }

  async function handleExportMonthExcel() {
    const allRowsByGroup = await loadAllRowsByGroup(groups);
    exportAdminMonthToExcel({ monthId, groups, statuses, allRowsByGroup });
  }

  async function handleExportGroupPdf() {
    const g = groups.find((x) => x.id === selectedGroupId);
    if (!g) return;
    const groupList = [g];
    const allRowsByGroup = await loadAllRowsByGroup(groupList);
    exportAdminMonthToPdf({
      monthId,
      groups: groupList,
      statuses: { [g.id]: statuses[g.id] || "rascunho" },
      allRowsByGroup,
    });
  }

  async function handleExportGroupExcel() {
    const g = groups.find((x) => x.id === selectedGroupId);
    if (!g) return;
    const groupList = [g];
    const allRowsByGroup = await loadAllRowsByGroup(groupList);
    exportAdminMonthToExcel({
      monthId,
      groups: groupList,
      statuses: { [g.id]: statuses[g.id] || "rascunho" },
      allRowsByGroup,
    });
  }

  async function handleDeleteTestMonth() {
    const ok = window.confirm(
      `Excluir TODOS os lançamentos de teste de ${monthId} em todos os grupos?\n\nIsso apaga o relatório do mês e os publicadores (não mexe no cadastro de membros).`
    );
    if (!ok) return;

    for (const g of groups) {
      const pubsCol = collection(
        db,
        "groups",
        g.id,
        "reports",
        monthId,
        "publicadores"
      );
      const pubsSnap = await getDocs(pubsCol);

      let batch = writeBatch(db);
      let ops = 0;

      pubsSnap.docs.forEach((d) => {
        batch.delete(d.ref);
        ops += 1;
        if (ops >= 450) {
          // eslint-disable-next-line no-void
          void batch.commit();
          batch = writeBatch(db);
          ops = 0;
        }
      });

      batch.delete(doc(db, "groups", g.id, "reports", monthId));
      await batch.commit();
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>Painel do Administrador</h2>
          <div className="muted">Acompanhe os 7 grupos e o resumo do mês.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <MonthPicker value={monthId} onChange={setMonthId} />
          <button onClick={handleExportMonthPdf}>Baixar PDF (mês)</button>
          <button onClick={handleExportMonthExcel}>Baixar Excel (mês)</button>
          <button disabled={!selectedGroupId} onClick={handleExportGroupPdf}>
            PDF do grupo
          </button>
          <button disabled={!selectedGroupId} onClick={handleExportGroupExcel}>
            Excel do grupo
          </button>
          <button
            onClick={handleDeleteTestMonth}
            style={{ borderColor: "#e11d48", color: "#e11d48" }}
          >
            Excluir mês de teste
          </button>
          <button onClick={logout}>Sair</button>
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
                    <th>Nome</th><th>Participou</th><th>P. Aux</th><th>P. Reg</th><th>Estudos</th><th>Horas PA</th><th>Horas PR</th>
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
                    <tr><td colSpan={7} className="muted">Sem lançamentos neste mês.</td></tr>
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