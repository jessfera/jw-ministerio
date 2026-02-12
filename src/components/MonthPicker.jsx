import React from "react";
import { labelFromMonthId, monthIdFromDate } from "../lib/month";

export default function MonthPicker({ value, onChange }) {
  const current = value || monthIdFromDate();

  // gera últimos 18 meses
  const options = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const id = monthIdFromDate(d);
    options.push(id);
  }

  return (
    <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span>Mês:</span>
      <select value={current} onChange={(e) => onChange(e.target.value)}>
        {options.map((id) => (
          <option key={id} value={id}>
            {labelFromMonthId(id)}
          </option>
        ))}
      </select>
    </label>
  );
}