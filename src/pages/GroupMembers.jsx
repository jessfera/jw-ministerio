import React, { useEffect, useMemo, useState } from "react";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";

export default function GroupMembers({ onGoReport }) {
  const { profile, logout } = useAuth();
  const groupId = profile?.grupoId;

  const [members, setMembers] = useState([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!groupId) return;
    const colRef = collection(db, "groups", groupId, "members");
    const unsub = onSnapshot(colRef, (qs) => {
      const data = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMembers(data);
    });
    return () => unsub();
  }, [groupId]);

  const sorted = useMemo(() => {
    return [...members].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [members]);

  async function addMember() {
    const nome = newName.trim();
    if (!nome || !groupId) return;

    await addDoc(collection(db, "groups", groupId, "members"), {
      nome,
      ativo: true,
    });

    setNewName("");
  }

  async function toggleActive(id, ativo) {
    await updateDoc(doc(db, "groups", groupId, "members", id), { ativo });
  }

  async function removeMember(id) {
    await deleteDoc(doc(db, "groups", groupId, "members", id));
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2>Cadastro do Grupo</h2>
          <div className="muted">
            Cadastre os componentes fixos. Eles aparecerao automaticamente em cada mes.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onGoReport}>Ir para o mes</button>
          <button onClick={logout}>Sair</button>
        </div>
      </div>

      <div className="card">
        <h3>Adicionar componente</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Nome do componente"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={addMember}>Adicionar</button>
        </div>
      </div>

      <div className="card">
        <h3>Componentes</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ativo</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.id}>
                  <td>{m.nome}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={m.ativo !== false}
                      onChange={(e) => toggleActive(m.id, e.target.checked)}
                    />
                  </td>
                  <td>
                    <button className="danger" onClick={() => removeMember(m.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}

              {sorted.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    Nenhum componente cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="muted" style={{ marginTop: 10 }}>
          Dica: se voce desmarcar "Ativo", o componente nao aparece no mes (mas nao perde historico).
        </p>
      </div>
    </div>
  );
}
