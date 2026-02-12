import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import MonthPicker from "../components/MonthPicker";
import SummaryCard from "../components/SummaryCard";
import { calcSummary } from "../lib/summary";
import { monthIdFromDate } from "../lib/month";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [monthId, setMonthId] = useState(monthIdFromDate());
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  // groupId -> { exists: boolean, status: string }
  const [statuses, setStatuses] = useState({});

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
          [g.id]: {
            exists: snap.exists(),
            status: snap.exists() ? (snap.data().status || "rascunho") : "rascunho",
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

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const labelForGroup = (groupId) => {
    const st = statuses[groupId];
    if (!st) return "carregando…";
    // Se não existe o doc do mês, ainda não foi criado/enviado — fica parecendo sempre rascunho.
    return st.exists ? (st.status || "rascunho") : "sem registro";
  };

  const selectedStatusLabel = useMemo(() => {
    if (!selectedGroupId) return "";
    const info = statuses[selectedGroupId];
    if (!info) return "carregando...";
    return info.exists ? (info.status || "rascunho") : "sem registro";
  }, [statuses, selectedGroupId]);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>Painel do Administrador</h2>
          <div className="muted">Acompanhe os 7 grupos e o resumo do mês.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <MonthPicker value={monthId} onChange={setMonthId} />
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
              Grupo {g.numero} — {labelForGroup(g.id)}
            </button>
          ))}
        </div>
        <div className="muted" style={{ marginTop: 10 }}>
          Observação: "rascunho" significa que o grupo ainda não enviou o mês (ou está editando). "sem registro" quer dizer que o documento do mês ainda não foi criado.
        </div>
      </div>

      <div className="card">
        <h3>Detalhe do grupo selecionado</h3>
        {selectedGroupId ? (
          <>
            {selectedGroup && (
              <div className="muted" style={{ marginBottom: 6 }}>
                Grupo <b>{selectedGroup.numero}</b> — Superintendente: <b>{selectedGroup.superintendenteNome || "(não informado)"}</b>
              </div>
            )}
            <div className="muted" style={{ marginBottom: 10 }}>
              Status: <b>{selectedStatusLabel}</b>
              {" "}
              <span>•</span>
              {" "}
              Lançamentos: <b>{selectedRows.length}</b>
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