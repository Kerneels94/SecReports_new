"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const ATTEMPTED_COLOR = "#d97706";
const POSITIVE_COLOR = "#e11d48";
const ACCENT = "#86efac";
const CURSOR = { stroke: "#71717a", strokeWidth: 1, strokeDasharray: "4 4" };
const AXIS_TICK = { fill: "#9393a0", fontSize: 11 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-04" -> "Apr"; anything else passes through. */
const monthTick = (value: string) => MONTHS[Number(value.slice(5, 7)) - 1] ?? value;

/** Chart tooltip label for a value plotted in minutes. */
const minutesLabel = (value: number | string | undefined) => {
  const ms = Number(value) * 60000;
  if (ms < 0 || Number.isNaN(ms)) return "0 minutes 0 seconds";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} minutes ${seconds} seconds`;
};

function ChartTooltip({ active, payload, label, format }: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; payload?: { month?: string } }[];
  label?: string;
  /** Renders the value, for charts whose values are not plain numbers. */
  format?: (value: number | string | undefined) => string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-lg border border-border-light bg-surface-elevated px-3 py-2 text-xs text-text shadow-lg">
      {label ?? <p className="font-medium text-text">{payload[0].payload?.month}</p>}
      <p className="text-text-secondary">
        {payload[0].name}:{" "}
        <span className="font-medium text-text">{format ? format(value) : value}</span>
      </p>
    </div>
  );
}

export function IncidentPieChart({ attempted, positive }: { attempted: number; positive: number }) {
  const data = [
    { name: "Attempted", value: attempted },
    { name: "Positive", value: positive },
  ];
  const total = attempted + positive;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex flex-1 items-center justify-center py-2">
        <div className="h-56 w-full max-w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={82}
                startAngle={90}
                endAngle={-270}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? ATTEMPTED_COLOR : POSITIVE_COLOR} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold leading-none text-text">
            {total}
          </span>
          <span className="mt-1 text-[11px] text-text-secondary">incidents</span>
        </div>
      </div>
      <ul className="mt-3 grid gap-2.5">
        {data.map((d, i) => (
          <li
            key={d.name}
            className="flex items-center gap-2.5 text-sm text-text-secondary"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: i === 0 ? ATTEMPTED_COLOR : POSITIVE_COLOR }}
            />
            {d.name}
            <b className="ml-auto font-mono font-semibold text-text">{d.value}</b>
            <em className="w-10 text-right not-italic text-text-secondary">
              {pct(d.value)}%
            </em>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResponseTimeChart({ data }: { data: { month: string; avgMs: number }[] }) {
  // Plotted in minutes so the axis gets sensible tick steps, but the underlying value stays
  // exact ms: a whole-minute rounding on the chart is what hid sub-minute responses.
  const series = data.map((d) => ({ month: d.month, avgMinutes: d.avgMs / 60000 }));

  return (
    <div className="h-full min-h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#3f3f46" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ ...AXIS_TICK }}
            tickFormatter={monthTick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ ...AXIS_TICK }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            unit="m"
          />
          <Tooltip content={<ChartTooltip format={minutesLabel} />} cursor={CURSOR} />
          <Line
            type="monotone"
            dataKey="avgMinutes"
            name="Avg response time"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ fill: "#27272a", stroke: ACCENT, strokeWidth: 2, r: 3.5 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YearlyTrendChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={ACCENT} stopOpacity={0.26} />
              <stop offset="1" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#3f3f46" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ ...AXIS_TICK }}
            tickFormatter={monthTick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ ...AXIS_TICK }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={CURSOR} />
          <Area
            type="monotone"
            dataKey="count"
            name="Incidents"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#trend-fill)"
            dot={{ fill: "#27272a", stroke: ACCENT, strokeWidth: 2, r: 3.5 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
