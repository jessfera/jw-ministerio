import React, { useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import MonthPicker from "../components/MonthPicker";
import ReportTable from "../components/ReportTable";
import SummaryCard from "../components/SummaryCard";
import { calcSummary } from "../lib/summary";
import { monthIdFromDate } from "../lib/month";

export default function GroupReport({ onGoMembers }) {
  const { profile, logout, user } = useAuth();
  const groupId = profile?.grupoId;

  const [monthId, setMonthId] = useState(monthIdFromDate());
  const [group, setGroup] = useState(null);
  const [rows, setRows] = useState([]);
  const [reportStatus, setReportStatus] = useState("rascunho");
  const [syncMsg, setSyncMsg] = useState("");

  // Carrega info do grupo (nome/numero)
  useEffect(() => {
    if (!groupId) return;
    (async () => {
      const snap = await getDoc(doc(db, "groups", groupId));
      if (snap.exists()) setGroup(snap.data());
    })();
  }, [groupId]);

  /**
   * SINCRONIZA members -> publicadores do mês
   * - Escuta members em tempo real
   * - Para cada membro ativo, garante doc em publicadores/{memberId}
   * - Com try/catch e mensagem
   */
  useEffect(() => {
    if (!groupId || !monthId || !user?.uid) return;

    const reportRef = doc(db, "groups", groupId, "reports", monthId);
    const membersCol = collection(db, "groups", groupId, "members");

    const unsubMembers = onSnapshot(
      membersCol,
      async (qs) => {
        try {
          setSyncMsg("Sincronizando componentes com o mês...");

          // garante que o doc do mês existe
          await setDoc(
            reportRef,
            {
              mes: monthId,
              status: "rascunho",
              atualizadoEm: serverTimestamp(),
              atualizadoPor: user.uid,
            },
            { merge: true }
          );

          const members = qs.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((m) => m.ativo !== false);

          // garante docs do mês para cada membro ativo (ID = memberId)
          await Promise.all(
            members.map((m) => {
              const pubRef = doc(
                db,
                "groups",
                groupId,
                "reports",
                monthId,
                "publicadores",
                m.id
              );

              return setDoc(
                pubRef,
                {
                  nome: m.nome,
                  participou: false,
                  pioneiroAuxiliar: false,
                  pioneiroRegular: false,
                  estudosBiblicos: 0,
                  horasPA: 0,
                  horasPR: 0,
                },
                { merge: true }
              );
            })
          );

          setSyncMsg(`OK: ${members.length} componente(s) sincronizado(s) em ${monthId}.`);
        } catch (e) {
          console.error(e);
          setSyncMsg("ERRO ao sincronizar. Abra o Console (F12) para ver o detalhe.");
        }
      },
      (err) => {
        console.error(err);
        setSyncMsg("ERRO ao ler membros (permissão ou conexão). Veja o Console (F12).");
      }
    );

    return () => unsubMembers();
  }, [groupId, monthId, user?.uid]);

  // Escuta status do mês + lista de publicadores do mês
  useEffect(() => {
    if (!groupId || !monthId) return;

    const reportRef = doc(db, "groups", groupId, "reports", monthId);
    const unsubReport = onSnapshot(reportRef, (snap) => {
      if (snap.exists()) setReportStatus(snap.data().status || "rascunho");
    });

    const pubsCol = collection(db, "groups", groupId, "reports", monthId, "publicadores");
    const unsub = onSnapshot(pubsCol, (qs) => {
      const data = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRows(data);
    });

    return () => {
      unsub();
      unsubReport();
    };
  }, [groupId, monthId]);

  const summary = useMemo(() => calcSummary(rows), [rows]);

  async function onUpdate(id, patch) {
    const ref = doc(db, "groups", groupId, "reports", monthId, "publicadores", id);
    await updateDoc(ref, patch);
    await updateDoc(doc(db, "groups", groupId, "reports", monthId), {
      atualizadoEm: serverTimestamp(),
      atualizadoPor: user?.uid || null,
    });
  }

  async function onRemove(id) {
    // OBS: removendo do mês (não do cadastro). Use com cuidado.
    const ref = doc(db, "groups", groupId, "reports", monthId, "publicadores", id);
    await deleteDoc(ref);
  }

  async function enviarMes() {
    await updateDoc(doc(db, "groups", groupId, "reports", monthId), {
      status: "enviado",
      atualizadoEm: serverTimestamp(),
      atualizadoPor: user?.uid || null,
    });
  }

  async function voltarRascunho() {
    await updateDoc(doc(db, "groups", groupId, "reports", monthId), {
      status: "rascunho",
      atualizadoEm: serverTimestamp(),
      atualizadoPor: user?.uid || null,
    });
  }

  if (!profile) return null;

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>Painel do Grupo</h2>
          {group && (
            <div className="muted">
              Grupo nº <b>{group.numero}</b> - Superintendente:{" "}
              {group.superintendenteNome || "(nao informado)"}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <MonthPicker value={monthId} onChange={setMonthId} />
          <button onClick={onGoMembers}>Cadastro</button>
          <button onClick={logout}>Sair</button>
        </div>
      </div>

      <div className="muted" style={{ marginBottom: 8 }}>
        Status do mês: <b>{reportStatus}</b>
      </div>

      {!!syncMsg && (
        <div className="muted" style={{ marginBottom: 12 }}>
          {syncMsg}
        </div>
      )}

      <SummaryCard summary={summary} />

      <ReportTable
        rows={rows}
        onAdd={null}            // <- mês não adiciona manualmente (vem do cadastro)
        onUpdate={onUpdate}
        onRemove={onRemove}
        readOnly={reportStatus === "enviado"}
      />

      {reportStatus !== "enviado" ? (
        <div style={{ marginTop: 12 }}>
          <button onClick={enviarMes}>Enviar mês</button>
          <span className="muted" style={{ marginLeft: 10 }}>
            (depois de enviado, fica somente leitura)
          </span>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <button onClick={voltarRascunho}>Voltar para rascunho</button>
          <span className="muted" style={{ marginLeft: 10 }}>
            (reabre para edicao)
          </span>
        </div>
      )}
    </div>
  );
}
