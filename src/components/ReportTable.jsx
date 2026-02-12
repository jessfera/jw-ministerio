import React, { useMemo, useState } from "react";

export default function ReportTable({
  rows,
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false,
}) {
  const [newName, setNewName] = useState("");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [rows]);

  const numInput = (v) => (v === "" ? "" : Number(v));

  return (
    <div className="card">
      <h3>Tabela do grupo</h3>

      {!readOnly && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Nome do componente"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => {
              const nome = newName.trim();
              if (!nome) return;
              onAdd(nome);
              setNewName("");
            }}
          >
            Adicionar
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Componentes do grupo</th>
              <th>Participou</th>
              <th>P. Aux</th>
              <th>P. Reg</th>
              <th>Estudos</th>
              <th>Horas PA</th>
              <th>Horas PR</th>
              {!readOnly && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>{r.nome}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!r.participou}
                    disabled={readOnly}
                    onChange={(e) => onUpdate(r.id, { participou: e.target.checked })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!r.pioneiroAuxiliar}
                    disabled={readOnly}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      // Regra: P. Aux e P. Reg não podem ficar marcados ao mesmo tempo.
                      // Se marcar P. Aux, desmarca P. Reg (e zera horas PR pra evitar inconsistência).
                      onUpdate(r.id, checked
                        ? { pioneiroAuxiliar: true, pioneiroRegular: false, horasPR: 0 }
                        : { pioneiroAuxiliar: false }
                      );
                    }}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!r.pioneiroRegular}
                    disabled={readOnly}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      // Regra: P. Aux e P. Reg não podem ficar marcados ao mesmo tempo.
                      // Se marcar P. Reg, desmarca P. Aux (e zera horas PA pra evitar inconsistência).
                      onUpdate(r.id, checked
                        ? { pioneiroRegular: true, pioneiroAuxiliar: false, horasPA: 0 }
                        : { pioneiroRegular: false }
                      );
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={r.estudosBiblicos ?? 0}
                    disabled={readOnly}
                    onChange={(e) => onUpdate(r.id, { estudosBiblicos: numInput(e.target.value) })}
                    style={{ width: 90 }}
                    min={0}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={r.horasPA ?? 0}
                    disabled={readOnly}
                    onChange={(e) => onUpdate(r.id, { horasPA: numInput(e.target.value) })}
                    style={{ width: 90 }}
                    min={0}
                    step="0.5"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={r.horasPR ?? 0}
                    disabled={readOnly}
                    onChange={(e) => onUpdate(r.id, { horasPR: numInput(e.target.value) })}
                    style={{ width: 90 }}
                    min={0}
                    step="0.5"
                  />
                </td>
                {!readOnly && (
                  <td>
                    <button className="danger" onClick={() => onRemove(r.id)}>
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 7 : 8} style={{ opacity: 0.7 }}>
                  Nenhum componente ainda. Adicione acima.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}