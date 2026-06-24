import { useState, useEffect } from "react";
import {
  Target,
  Euro,
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  Users,
  FolderKanban,
  HeartPulse,
  Clock,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Lead, Project, Customer, Campaign } from "@/shared/types";
import { formatCurrency } from "@/lib/utils";

export function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [leadsData, projectsData, customersData, campaignsData] = await Promise.all([
      window.api.leads.list(),
      window.api.projects.list(),
      window.api.customers.list(),
      window.api.campaigns.list(),
    ]);
    setLeads(leadsData);
    setProjects(projectsData);
    setCustomers(customersData);
    setCampaigns(campaignsData);
    setLoading(false);
  }

  const pipelineValue = leads
    .filter((l) => l.stage !== "gewonnen" && l.stage !== "verloren")
    .reduce((sum, l) => sum + l.value, 0);
  const wonValue = leads
    .filter((l) => l.stage === "gewonnen")
    .reduce((sum, l) => sum + l.value, 0);
  const conversionRate = leads.length > 0 
    ? (leads.filter((l) => l.stage === "gewonnen").length / leads.length) * 100 
    : 0;

  const campaignMetrics = campaigns.map((c) => {
    const campaignLeads = leads.filter((l) => l.campaignId === c.id);
    const wonLeads = campaignLeads.filter((l) => l.stage === "gewonnen");
    const wonValue = wonLeads.reduce((sum, l) => sum + l.value, 0);
    const roi = c.budget > 0 ? ((wonValue - c.budget) / c.budget) * 100 : 0;
    return { ...c, leadCount: campaignLeads.length, wonValue, roi };
  });

  const activeCustomers = customers.filter((c) => c.status === "aktiv").length;
  const totalLtv = customers.reduce((sum, c) => sum + c.ltv, 0);
  const avgHealthScore = customers.length > 0 
    ? customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length 
    : 0;
  const atRiskCustomers = customers.filter((c) => c.healthScore < 40).length;

  const inProgressProjects = projects.filter((p) => p.status === "in_arbeit").length;
  const overBudgetProjects = projects.filter((p) => p.actualCost > p.budget).length;
  const avgProjectProgress = projects.length > 0 
    ? projects.reduce((sum, p) => sum + p.progress, 0) / projects.length 
    : 0;

  const today = new Date().toISOString().split('T')[0];
  const overdueFollowUps = leads.filter((l) => l.followUpDate && l.followUpDate < today && l.stage !== "gewonnen" && l.stage !== "verloren");

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
      label: "Umsatz",
      value: formatCurrency(wonValue),
      delta: "+8%",
      icon: Euro,
    },
    {
      label: "Konversionsrate",
      value: `${conversionRate.toFixed(1)}%`,
      delta: "+2.1%",
      icon: TrendingUp,
    },
    {
      label: "Aktive Kunden",
      value: String(activeCustomers),
      delta: "+3",
      icon: Users,
    },
    {
      label: "Gesamt LTV",
      value: formatCurrency(totalLtv),
      delta: "+15%",
      icon: DollarSign,
    },
    {
      label: "Ø Health Score",
      value: `${avgHealthScore.toFixed(0)}`,
      delta: avgHealthScore >= 70 ? "+5" : "-2",
      tone: avgHealthScore >= 70 ? ("success" as const) : avgHealthScore >= 40 ? ("warning" as const) : ("danger" as const),
      icon: HeartPulse,
    },
    {
      label: "Projekte In Arbeit",
      value: String(inProgressProjects),
      delta: "+2",
      icon: FolderKanban,
    },
    {
      label: "Ø Projekt-Fortschritt",
      value: `${avgProjectProgress.toFixed(0)}%`,
      delta: "+8%",
      icon: Clock,
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
                <Badge tone={s.tone || "success"}>
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
            <CardTitle>Überfällige Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueFollowUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine überfälligen Follow-ups</p>
            ) : (
              overdueFollowUps.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">{l.company}</p>
                      <p className="text-xs text-muted-foreground">{l.contact}</p>
                    </div>
                  </div>
                  <Badge tone="danger" className="text-xs">
                    {l.followUpDate}
                  </Badge>
                </div>
              ))
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Kampagnen</span>
              <span className="font-semibold">{campaigns.length}</span>
            </div>
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risiko Kunden</span>
                <span className="font-semibold text-destructive">{atRiskCustomers}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Über Budget Projekte</span>
                <span className="font-semibold text-destructive">{overBudgetProjects}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
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
                  <div className="text-right">
                    <Badge tone={p.status === "in_arbeit" ? "primary" : p.status === "abgeschlossen" ? "success" : "muted"} className="text-xs">
                      {p.status === "in_arbeit" ? "In Arbeit" : p.status === "abgeschlossen" ? "Abgeschlossen" : p.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.progress}% · {formatCurrency(p.actualCost)}/{formatCurrency(p.budget)}
                    </p>
                  </div>
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
            <CardTitle>Kampagnen-Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaignMetrics.slice(0, 4).map((c) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.leadCount} Leads · {formatCurrency(c.wonValue)} gewonnen
                    </p>
                  </div>
                  <Badge tone={c.roi >= 0 ? "success" : "danger"} className="text-xs">
                    {c.roi.toFixed(1)}% ROI
                  </Badge>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <p className="text-sm text-muted-foreground">Keine Kampagnen vorhanden</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
