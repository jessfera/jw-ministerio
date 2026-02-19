import React, { useEffect, useMemo, useRef, useState } from "react";
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
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import MonthPicker from "../components/MonthPicker";
import ReportTable from "../components/ReportTable";
import SummaryCard from "../components/SummaryCard";
import { calcSummary } from "../lib/summary";
import { monthIdFromDate } from "../lib/month";

// ✅ imports corretos dos exports
import { exportGroupMonthToPdf } from "../export/exportPdf";
import { exportGroupMonthToExcel } from "../export/exportExcel";

export default function GroupReport({ onGoMembers }) {
  const { profile, logout, user } = useAuth();
  const groupId = profile?.grupoId;

  const [monthId, setMonthId] = useState(monthIdFromDate());
  const [group, setGroup] = useState(null);
  const [rows, setRows] = useState([]);
  const [reportStatus, setReportStatus] = useState("rascunho");

  const congregationName = "Congregação Nova Paraguaçu";
  const logoUrl =
    typeof window !== "undefined"
      ? new URL("/logo.png", window.location.origin).href
      : "/logo.png";

  // evita rodar init duplicado (React strict mode / re-render / login)
  const initKeyRef = useRef("");

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      const snap = await getDoc(doc(db, "groups", groupId));
      if (snap.exists()) setGroup(snap.data());
    })();
  }, [groupId]);

  // ✅ INIT DO MÊS SEM ZERAR:
  // - cria doc do mês somente se não existir
  // - cria publicadores somente se não existir (por memberId)
  // - se já existir, só garante "nome" (não sobrescreve horas/checkbox)
  useEffect(() => {
    if (!groupId || !monthId || !user?.uid) return;

    const key = `${groupId}__${monthId}__${user.uid}`;
    if (initKeyRef.current === key) return;
    initKeyRef.current = key;

    const reportRef = doc(db, "groups", groupId, "reports", monthId);
    const pubsCol = collection(db, "groups", groupId, "reports", monthId, "publicadores");

    (async () => {
      // 1) cria doc do mês somente se não existir
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
      }

      // 2) pega members ativos
      const membersSnap = await getDocs(collection(db, "groups", groupId, "members"));
      const members = membersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => m.ativo !== false);

      // 3) lista publicadores existentes (pra não sobrescrever)
      const pubsSnap = await getDocs(pubsCol);
      const existingIds = new Set(pubsSnap.docs.map((d) => d.id));

      // 4) cria apenas os faltantes (batched)
      const batch = writeBatch(db);
      let hasWrites = false;

      for (const m of members) {
        const pubRef = doc(db, "groups", groupId, "reports", monthId, "publicadores", m.id);

        if (!existingIds.has(m.id)) {
          // cria do zero (não existe)
          batch.set(pubRef, {
            nome: m.nome,
            participou: false,
            pioneiroAuxiliar: false,
            pioneiroRegular: false,
            estudosBiblicos: 0,
            horasPA: 0,
            horasPR: 0,
          });
          hasWrites = true;
        } else {
          // já existe: só garante o nome (sem mexer em horas/checkbox)
          batch.set(pubRef, { nome: m.nome }, { merge: true });
          hasWrites = true;
        }
      }

      if (hasWrites) {
        batch.set(
          reportRef,
          { atualizadoEm: serverTimestamp(), atualizadoPor: user.uid },
          { merge: true }
        );
        await batch.commit();
      }
    })();
  }, [groupId, monthId, user?.uid]);

  useEffect(() => {
    if (!groupId || !monthId) return;

    const reportRef = doc(db, "groups", groupId, "reports", monthId);
    const unsubReport = onSnapshot(reportRef, (snap) => {
      if (snap.exists()) setReportStatus(snap.data().status || "rascunho");
      else setReportStatus("rascunho");
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

  const groupLabel = useMemo(() => {
    const numero = group?.numero ?? "";
    const sup = group?.superintendenteNome ?? "";
    return `Grupo ${numero}${sup ? " - " + sup : ""}`.trim();
  }, [group]);

  async function onExportPdf() {
    try {
      await exportGroupMonthToPdf({
        monthId,
        congregationName,
        logoUrl,
        group: {
          numero: group?.numero ?? "",
          superintendenteNome: group?.superintendenteNome ?? "",
        },
        rows,
        totals: summary, // ✅ aqui é totals
      });
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar PDF. Veja o console.");
    }
  }

  async function onExportExcel() {
    try {
      await exportGroupMonthToExcel({
        monthId,
        congregationName,
        group: {
          numero: group?.numero ?? "",
          superintendenteNome: group?.superintendenteNome ?? "",
        },
        rows,
        totals: summary,
      });
    } catch (e) {
      console.error(e);
      alert("Falha ao gerar Excel. Veja o console.");
    }
  }

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

    await updateDoc(doc(db, "groups", groupId, "reports", monthId), {
      atualizadoEm: serverTimestamp(),
      atualizadoPor: user?.uid || null,
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
    await updateDoc(doc(db, "groups", groupId, "reports", monthId), {
      atualizadoEm: serverTimestamp(),
      atualizadoPor: user?.uid || null,
    });
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

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <MonthPicker value={monthId} onChange={setMonthId} />
          <button onClick={onExportPdf} disabled={rows.length === 0}>Baixar PDF</button>
          <button onClick={onExportExcel} disabled={rows.length === 0}>Baixar Excel</button>
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
