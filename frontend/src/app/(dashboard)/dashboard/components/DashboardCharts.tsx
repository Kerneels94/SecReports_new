"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { formatDurationMs } from "@/services";

const PIE_COLORS = ["#fbbf24", "#4ade80"];
const CURSOR = { stroke: "#71717a", strokeWidth: 1, strokeDasharray: "4 4" };

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
    <div className="rounded-lg bg-surface-elevated px-3 py-2 text-xs text-text shadow-lg ring-1 ring-border-light">
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

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs" style={{ color: "#a1a1aa" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ResponseTimeChart({ data }: { data: { month: string; avgMs: number }[] }) {
  // Plotted in minutes so the axis gets sensible tick steps, but the underlying value stays
  // exact ms: a whole-minute rounding on the chart is what hid sub-minute responses.
  const series = data.map((d) => ({ month: d.month, avgMinutes: d.avgMs / 60000 }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            unit="m"
          />
          <Tooltip content={<ChartTooltip format={minutesLabel} />} cursor={CURSOR} />
          <Line
            type="monotone"
            dataKey="avgMinutes"
            name="Avg response time (minutes)"
            stroke="#fbbf24"
            strokeWidth={2.5}
            dot={{ fill: "#fbbf24", r: 3, strokeWidth: 0 }}
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
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="month"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={CURSOR} />
          <Line
            type="monotone"
            dataKey="count"
            name="Incidents"
            stroke="#86efac"
            strokeWidth={2.5}
            dot={{ fill: "#86efac", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}