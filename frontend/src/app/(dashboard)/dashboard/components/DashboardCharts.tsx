"use client";

import {
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

const ACCENT = "var(--color-primary)";
const CURSOR = { stroke: "var(--color-text-subtle)", strokeWidth: 1, strokeDasharray: "4 4" };
const AXIS_TICK = { fill: "var(--color-text-subtle)", fontSize: 11 };

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

export function ResponseTimeChart({ data }: { data: { month: string; avgMs: number }[] }) {
  // Plotted in minutes so the axis gets sensible tick steps, but the underlying value stays
  // exact ms: a whole-minute rounding on the chart is what hid sub-minute responses.
  const series = data.map((d) => ({ month: d.month, avgMinutes: d.avgMs / 60000 }));

  return (
    <div className="h-full min-h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
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
            dot={{ fill: "var(--color-surface)", stroke: ACCENT, strokeWidth: 2, r: 3.5 }}
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
          <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" vertical={false} />
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
            dot={{ fill: "var(--color-surface)", stroke: ACCENT, strokeWidth: 2, r: 3.5 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
