import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";

export default function AdminMembers({ onBack }) {
  const { logout } = useAuth();

  const [groups, setGroups] = useState([]);
  const [fromGroup, setFromGroup] = useState("");
  const [toGroup, setToGroup] = useState("");
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  // superintendentes (usuarios do app)
  const [users, setUsers] = useState([]);
  const [userMsg, setUserMsg] = useState("");

  // carregar grupos
  useEffect(() => {
    (async () => {
      const qs = await getDocs(collection(db, "groups"));
      const arr = qs.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.numero || 0) - (b.numero || 0));
      setGroups(arr);
      if (arr.length && !fromGroup) setFromGroup(arr[0].id);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      // lista apenas os usuarios que vao logar como grupo
      const q = query(collection(db, "users"), where("papel", "==", "grupo"));
      const qs = await getDocs(q);
      const arr = qs.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setUsers(arr);
    })();
  }, []);

  async function changeUserGroup(u, newGroupId) {
    try {
      setUserMsg("");
      if (!newGroupId) return;

      const oldGroupId = u.grupoId;

      // 1) atualiza users/{uid}.grupoId
      await updateDoc(doc(db, "users", u.uid), { grupoId: newGroupId });

      // 2) remove uid de editores do grupo antigo (se existir)
      if (oldGroupId) {
        await updateDoc(doc(db, "groups", oldGroupId), {
          editores: arrayRemove(u.uid),
        });
      }

      // 3) adiciona uid em editores do novo grupo
      await updateDoc(doc(db, "groups", newGroupId), {
        editores: arrayUnion(u.uid),
        // opcional: manter o nome do superintendente atualizado no grupo
        superintendenteNome: u.nome || "",
      });

      // 4) atualiza lista local
      setUsers((prev) =>
        prev.map((x) => (x.uid === u.uid ? { ...x, grupoId: newGroupId } : x))
      );

      setUserMsg(`OK: ${u.nome || u.uid} agora está em ${newGroupId}.`);
    } catch (e) {
      console.error(e);
      setUserMsg(
        `Erro ao alterar grupo de ${u.nome || u.uid}. Veja o console (F12) para detalhes.`
      );
    }
  }

  // carregar membros do grupo origem
  useEffect(() => {
    if (!fromGroup) return;
    (async () => {
      const qs = await getDocs(collection(db, "groups", fromGroup, "members"));
      const arr = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMembers(arr);
      setMsg("");
    })();
  }, [fromGroup]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const base = [...members].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    if (!s) return base;
    return base.filter((m) => (m.nome || "").toLowerCase().includes(s));
  }, [members, search]);

  async function moveMember(member) {
    setMsg("");
    if (!fromGroup || !toGroup) {
      setMsg("Selecione o grupo de origem e o grupo destino.");
      return;
    }
    if (fromGroup === toGroup) {
      setMsg("O grupo destino deve ser diferente do grupo de origem.");
      return;
    }

    // 1) cria no destino (novo doc id controlado para evitar duplicar: usa nome normalizado)
    const newId = normalizeId(member.nome || "membro");
    const destRef = doc(db, "groups", toGroup, "members", newId);

    // se já existir, cria com id alternativo (newId-2, newId-3...)
    let finalRef = destRef;
    for (let i = 2; i <= 50; i++) {
      const snap = await getDoc(finalRef);
      if (!snap.exists()) break;
      finalRef = doc(db, "groups", toGroup, "members", `${newId}-${i}`);
    }

    await setDoc(finalRef, {
      nome: member.nome || "",
      ativo: true,
      movidoDe: fromGroup,
      movidoEm: new Date().toISOString()
    }, { merge: true });

    // 2) inativa no grupo origem
    await updateDoc(doc(db, "groups", fromGroup, "members", member.id), {
      ativo: false,
      movidoPara: toGroup,
      movidoEm: new Date().toISOString()
    });

    setMsg(`Movido: "${member.nome}" de ${fromGroup} para ${toGroup}.`);
    // recarrega membros
    const qs = await getDocs(collection(db, "groups", fromGroup, "members"));
    setMembers(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  function normalizeId(name) {
    return (name || "")
      .toLowerCase()
      .trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "membro";
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>Membros por Grupo (Admin)</h2>
          <div className="muted">Mover membro: cria no destino e inativa no grupo antigo.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onBack}>Voltar</button>
          <button onClick={logout}>Sair</button>
        </div>
      </div>

      <div className="card">
        <h3>Superintendentes (vincular usuário ao grupo)</h3>
        <div className="muted" style={{ marginBottom: 10 }}>
          Aqui você define em qual grupo cada usuário (papel "grupo") vai entrar ao fazer login.
        </div>
        {userMsg && <div className="muted" style={{ marginBottom: 10 }}>{userMsg}</div>}

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>UID</th>
                <th>Grupo atual</th>
                <th>Mudar para</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.nome || "(sem nome)"}</td>
                  <td className="muted" style={{ maxWidth: 260, wordBreak: "break-all" }}>{u.uid}</td>
                  <td>{u.grupoId || "--"}</td>
                  <td>
                    <select
                      value={u.grupoId || ""}
                      onChange={(e) => changeUserGroup(u, e.target.value)}
                    >
                      <option value="">-- selecione --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.id} - Grupo {g.numero}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="muted">Nenhum usuário com papel "grupo" encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Grupo origem<br />
            <select value={fromGroup} onChange={(e) => setFromGroup(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.id} - Grupo {g.numero}
                </option>
              ))}
            </select>
          </label>

          <label>
            Grupo destino<br />
            <select value={toGroup} onChange={(e) => setToGroup(e.target.value)}>
              <option value="">-- selecione --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.id} - Grupo {g.numero}
                </option>
              ))}
            </select>
          </label>

          <label style={{ flex: 1, minWidth: 240 }}>
            Buscar nome<br />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite parte do nome..." />
          </label>
        </div>
        {msg && <div style={{ marginTop: 10 }} className="muted">{msg}</div>}
      </div>

      <div className="card">
        <h3>Lista de membros do grupo {fromGroup}</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ativo</th>
                <th>Mover</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>{m.nome}</td>
                  <td>{m.ativo !== false ? "Sim" : "Nao"}</td>
                  <td>
                    <button onClick={() => moveMember(m)}>Mover</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">Nenhum membro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Observacao: mover nao altera historico de meses anteriores (fica no grupo antigo).
        </p>
      </div>
    </div>
  );
}
