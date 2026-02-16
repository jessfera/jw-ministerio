import React, { useMemo } from "react";
import { labelFromMonthId, monthIdFromDate } from "../lib/month";

const START_MONTH_ID = "2026-02";
const END_MONTH_ID = "2028-08";

function parseMonthId(id) {
  const [y, m] = String(id).split("-").map(Number);
  return { y, m };
}

function buildMonthRange(startId, endId) {
  const start = parseMonthId(startId);
  const end = parseMonthId(endId);

  const out = [];
  let y = start.y;
  let m = start.m; // 1..12

  while (y < end.y || (y === end.y && m <= end.m)) {
    const mm = String(m).padStart(2, "0");
    out.push(`${y}-${mm}`);
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export default function MonthPicker({ value, onChange }) {
  const options = useMemo(
    () => buildMonthRange(START_MONTH_ID, END_MONTH_ID),
    []
  );

  // garante que sempre há um mês válido selecionado
  const current = options.includes(value) ? value : options[0];

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