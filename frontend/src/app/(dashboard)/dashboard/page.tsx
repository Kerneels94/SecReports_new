"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

const stats = [
  { label: "Open Incidents", value: "--", color: "text-warning" },
  { label: "Critical", value: "--", color: "text-danger" },
  { label: "Assigned to Me", value: "--", color: "text-primary" },
  { label: "Overdue Actions", value: "--", color: "text-danger" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">Overview of incident reports</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">No incidents reported yet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">No data available.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
