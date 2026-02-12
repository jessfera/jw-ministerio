import React, { useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
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

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      const snap = await getDoc(doc(db, "groups", groupId));
      if (snap.exists()) setGroup(snap.data());
    })();
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !monthId || !user?.uid) return;

    const reportRef = doc(db, "groups", groupId, "reports", monthId);

    (async () => {
      // IMPORTANTE: não sobrescrever um mês já preenchido/enviado.
      // Criamos o doc do mês apenas se ele NÃO existir.
      const reportSnap = await getDoc(reportRef);
      if (!reportSnap.exists()) {
        await setDoc(reportRef, {
          mes: monthId,
          status: "rascunho",
          criadoEm: serverTimestamp(),
          criadoPor: user.uid,
          atualizadoEm: serverTimestamp(),
          atualizadoPor: user.uid,
        });
      } else {
        // só atualiza o "atualizadoEm" sem mexer no status
        await updateDoc(reportRef, {
          atualizadoEm: serverTimestamp(),
          atualizadoPor: user.uid,
        });
      }

      const membersSnap = await getDocs(collection(db, "groups", groupId, "members"));
      const members = membersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => m.ativo !== false);

      for (const m of members) {
        const pubRef = doc(
          db,
          "groups",
          groupId,
          "reports",
          monthId,
          "publicadores",
          m.id
        );

        // NÃO usar merge com defaults aqui, pois isso sobrescreve valores já lançados.
        // Regra: se não existe, cria com defaults; se existe, só garante o nome.
        const pubSnap = await getDoc(pubRef);
        if (!pubSnap.exists()) {
          await setDoc(pubRef, {
            nome: m.nome,
            participou: false,
            pioneiroAuxiliar: false,
            pioneiroRegular: false,
            estudosBiblicos: 0,
            horasPA: 0,
            horasPR: 0,
          });
        } else {
          const oldNome = pubSnap.data()?.nome;
          if (oldNome !== m.nome) {
            await updateDoc(pubRef, { nome: m.nome });
          }
        }
      }
    })();
  }, [groupId, monthId, user?.uid]);

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

  async function onAdd(nome) {
    const pubsCol = collection(db, "groups", groupId, "reports", monthId, "publicadores");
    await addDoc(pubsCol, {
      nome,
      participou: false,
      pioneiroAuxiliar: false,
      pioneiroRegular: false,
      estudosBiblicos: 0,
      horasPA: 0,
      horasPR: 0,
    });
  }

  async function onUpdate(id, patch) {
    const ref = doc(db, "groups", groupId, "reports", monthId, "publicadores", id);
    await updateDoc(ref, patch);
    await updateDoc(doc(db, "groups", groupId, "reports", monthId), {
      atualizadoEm: serverTimestamp(),
      atualizadoPor: user?.uid || null,
    });
  }

  async function onRemove(id) {
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

      <div className="muted" style={{ marginBottom: 12 }}>
        Status do mês: <b>{reportStatus}</b>
      </div>

      <SummaryCard summary={summary} />

      <ReportTable
        rows={rows}
        onAdd={onAdd}
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
