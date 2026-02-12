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
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import MonthPicker from "../components/MonthPicker";
import ReportTable from "../components/ReportTable";
import SummaryCard from "../components/SummaryCard";
import { calcSummary } from "../lib/summary";
import { monthIdFromDate } from "../lib/month";
import { exportGroupMonthToExcel } from "../export/exportExcel";
import { exportGroupMonthToPdf } from "../export/exportPdf";

export default function GroupReport({ onGoMembers }) {
  const { profile, logout, user } = useAuth();
  const groupId = profile?.grupoId;

  const [monthId, setMonthId] = useState(monthIdFromDate());
  const [group, setGroup] = useState(null);
  const [rows, setRows] = useState([]);
  const [reportStatus, setReportStatus] = useState("rascunho");

  const groupLabel = useMemo(() => {
    const base = group?.numero ? `Grupo_${String(group.numero).padStart(2, "0")}` : (groupId || "Grupo");
    const sup = (group?.superintendenteNome || "").trim();
    const safeSup = sup
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return safeSup ? `${base}_${safeSup}` : base;
  }, [group, groupId]);

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

        await setDoc(
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

  // Obs: o mês é gerado a partir do Cadastro (members). Então não adicionamos manualmente aqui.

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
    // setDoc+merge para não falhar se o doc do mês ainda não existir
    await setDoc(
      doc(db, "groups", groupId, "reports", monthId),
      {
        mes: monthId,
        status: "enviado",
        enviadoEm: serverTimestamp(),
        enviadoPor: user?.uid || null,
        atualizadoEm: serverTimestamp(),
        atualizadoPor: user?.uid || null,
      },
      { merge: true }
    );
  }

  async function voltarRascunho() {
    await setDoc(
      doc(db, "groups", groupId, "reports", monthId),
      {
        mes: monthId,
        status: "rascunho",
        atualizadoEm: serverTimestamp(),
        atualizadoPor: user?.uid || null,
      },
      { merge: true }
    );
  }

  function baixarPdf() {
    exportGroupMonthToPdf({ groupLabel, monthId, rows, summary });
  }

  function baixarExcel() {
    exportGroupMonthToExcel({ groupLabel, monthId, rows, summary });
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

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <MonthPicker value={monthId} onChange={setMonthId} />
          <button onClick={baixarPdf} disabled={!rows.length}>Baixar PDF</button>
          <button onClick={baixarExcel} disabled={!rows.length}>Baixar Excel</button>
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
        onAdd={null}
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
