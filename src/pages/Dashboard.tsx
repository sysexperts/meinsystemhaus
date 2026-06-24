import { useState, useEffect } from "react";
import {
  Target,
  FolderKanban,
  Euro,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Lead, Project, Customer } from "@/shared/types";
import { formatCurrency } from "@/lib/utils";

export function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [leadsData, projectsData, customersData] = await Promise.all([
      window.api.leads.list(),
      window.api.projects.list(),
      window.api.customers.list(),
    ]);
    setLeads(leadsData);
    setProjects(projectsData);
    setCustomers(customersData);
    setLoading(false);
  }

  const pipelineValue = leads
    .filter((l) => l.stage !== "gewonnen")
    .reduce((sum, l) => sum + l.value, 0);
  const activeProjects = projects.filter((p) => p.status === "in_arbeit").length;
  const wonValue = leads
    .filter((l) => l.stage === "gewonnen")
    .reduce((sum, l) => sum + l.value, 0);
  const conversionRate = leads.length > 0
    ? Math.round((leads.filter((l) => l.stage === "gewonnen").length / leads.length) * 100)
    : 0;

  function getCustomerName(customerId: string): string {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "Unbekannt";
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Laden...</div>;
  }

  const stats = [
    {
      label: "Offene Pipeline",
      value: formatCurrency(pipelineValue),
      delta: "+12%",
      icon: Target,
    },
    {
      label: "Aktive Projekte",
      value: String(activeProjects),
      delta: "+2",
      icon: FolderKanban,
    },
    {
      label: "Umsatz (Monat)",
      value: formatCurrency(wonValue),
      delta: "+8%",
      icon: Euro,
    },
    {
      label: "Abschlussquote",
      value: `${conversionRate}%`,
      delta: "+4%",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <Badge tone="success">
                  <ArrowUpRight className="mr-0.5 h-3 w-3" />
                  {s.delta}
                </Badge>
              </div>
              <p className="mt-4 text-2xl font-semibold text-foreground">
                {s.value}
              </p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aktuelle Projekte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.slice(0, 4).map((p) => (
              <div key={p.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getCustomerName(p.customerId)}
                    </p>
                  </div>
                  <Badge tone={p.status === "in_arbeit" ? "primary" : p.status === "abgeschlossen" ? "success" : "muted"} className="text-xs">
                    {p.status === "in_arbeit" ? "In Arbeit" : p.status === "abgeschlossen" ? "Abgeschlossen" : p.status}
                  </Badge>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground">Keine Projekte vorhanden</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schnellübersicht</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Gesamte Leads</span>
              <span className="font-semibold">{leads.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kunden</span>
              <span className="font-semibold">{customers.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projekte</span>
              <span className="font-semibold">{projects.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
