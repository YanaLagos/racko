import { useId, useMemo } from "react";

export default function PredictivoRing({
  percent = 0,
  size = 120,
  stroke = 14,
  idleFillPct = 35,
  hasData = true,
}) {
  const safeSize = Math.max(40, Number(size) || 120);
  const safeStroke = Math.max(1, Number(stroke) || 14);

  const r = (safeSize - safeStroke) / 2;
  const c = 2 * Math.PI * r;

  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const effectivePct = hasData
    ? p
    : Math.max(0, Math.min(100, Number(idleFillPct) || 0));

  const filled = (c * effectivePct) / 100;

  const uid = useId();
  const gradId = useMemo(() => `ringGrad-${uid}`, [uid]);

  const cx = safeSize / 2;
  const cy = safeSize / 2;

  return (
    <svg className="predictivo-svg" viewBox={`0 0 ${safeSize} ${safeSize}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-secondary)" />
        </linearGradient>
      </defs>

      {/* BASE: círculo completo */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(181,101,251,0.18)"
        strokeWidth={safeStroke}
        strokeLinecap="round"
      />

      {/* PROGRESO: arranca abajo */}
      <g transform={`rotate(90 ${cx} ${cy})`}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={safeStroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          strokeDashoffset="0"
          style={{ transition: "stroke-dasharray 650ms ease" }}
        />
      </g>
    </svg>
  );
}
