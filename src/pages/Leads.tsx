import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  User,
  Trash2,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
  UserPlus,
  TrendingUp,
  Wallet,
  Award,
  AlertTriangle,
  Percent,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field } from "@/components/ui/Modal";
import type {
  Lead,
  LeadInput,
  LeadStage,
  LeadRating,
  LeadSource,
  Activity,
  ActivityInput,
  ActivityType,
  CustomerInput,
  Campaign,
} from "@/shared/types";
import { cn, formatCurrency } from "@/lib/utils";

// Hilfsfunktion: ist das Follow-up-Datum ueberfaellig (vor heute) und der Lead
// noch offen (nicht gewonnen/verloren)?
function isOverdue(lead: Lead): boolean {
  if (!lead.followUpDate) return false;
  if (lead.stage === "gewonnen" || lead.stage === "verloren") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(lead.followUpDate) < today;
}

const LEAD_STAGES: { id: LeadStage; label: string }[] = [
  { id: "neu", label: "Neu" },
  { id: "kontaktiert", label: "Kontaktiert" },
  { id: "angebot", label: "Angebot" },
  { id: "verhandlung", label: "Verhandlung" },
  { id: "gewonnen", label: "Gewonnen" },
  { id: "verloren", label: "Verloren" },
];

const LEAD_SOURCES: { id: LeadSource; label: string }[] = [
  { id: "website", label: "Website" },
  { id: "empfehlung", label: "Empfehlung" },
  { id: "messe", label: "Messe" },
  { id: "kaltakquise", label: "Kaltakquise" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "google_ads", label: "Google Ads" },
  { id: "sonstige", label: "Sonstige" },
];

const LEAD_RATINGS: { id: LeadRating; label: string; color: string }[] = [
  { id: "hot", label: "Hot", color: "bg-red-500" },
  { id: "warm", label: "Warm", color: "bg-yellow-500" },
  { id: "cold", label: "Cold", color: "bg-blue-500" },
];

const ACTIVITY_TYPES: { id: ActivityType; label: string; icon: any }[] = [
  { id: "call", label: "Anruf", icon: Phone },
  { id: "email", label: "E-Mail", icon: Mail },
  { id: "meeting", label: "Meeting", icon: Calendar },
  { id: "note", label: "Notiz", icon: MessageSquare },
];

const emptyForm: LeadInput = {
  company: "",
  contact: "",
  email: "",
  phone: "",
  value: 0,
  stage: "neu",
  source: "sonstige",
  rating: "cold",
  owner: "MS",
  followUpDate: "",
  probability: 0,
  competitor: "",
  campaignId: "",
  notes: "",
};

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<LeadInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState<LeadRating | "all">("all");
  const [filterSource, setFilterSource] = useState<LeadSource | "all">("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activities, setActivities] = useState<Record<string, Activity[]>>({});
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState<ActivityInput>({
    leadId: "",
    type: "note",
    subject: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    duration: 0,
    outcome: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [data, camps] = await Promise.all([
      window.api.leads.list(),
      window.api.campaigns.list(),
    ]);
    setLeads(data);
    setCampaigns(camps);
    setLoading(false);
  }, []);

  function campaignName(id: string): string {
    return campaigns.find((c) => c.id === id)?.name ?? "";
  }

  useEffect(() => {
    load();
  }, [load]);

  // Eindeutige Inhaber fuer den Filter
  const owners = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.owner) set.add(l.owner);
    return Array.from(set).sort();
  }, [leads]);

  // Such- und Filterlogik
  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filterRating !== "all" && l.rating !== filterRating) return false;
      if (filterSource !== "all" && l.source !== filterSource) return false;
      if (filterOwner !== "all" && l.owner !== filterOwner) return false;
      if (q) {
        const haystack = `${l.company} ${l.contact} ${l.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, filterRating, filterSource, filterOwner]);

  const byStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {
      neu: [],
      kontaktiert: [],
      angebot: [],
      verhandlung: [],
      gewonnen: [],
      verloren: [],
    };
    for (const lead of filteredLeads) map[lead.stage].push(lead);
    return map;
  }, [filteredLeads]);

  // Kennzahlen (auf Basis ALLER Leads, nicht der Filter)
  const stats = useMemo(() => {
    const open = leads.filter(
      (l) => l.stage !== "gewonnen" && l.stage !== "verloren",
    );
    const pipelineValue = open.reduce((sum, l) => sum + l.value, 0);
    const weightedForecast = open.reduce(
      (sum, l) => sum + (l.value * l.probability) / 100,
      0,
    );
    const won = leads.filter((l) => l.stage === "gewonnen");
    const lost = leads.filter((l) => l.stage === "verloren");
    const wonValue = won.reduce((sum, l) => sum + l.value, 0);
    const decided = won.length + lost.length;
    const conversion = decided > 0 ? (won.length / decided) * 100 : 0;
    const overdue = leads.filter(isOverdue).length;
    return {
      pipelineValue,
      weightedForecast,
      wonValue,
      conversion,
      overdue,
    };
  }, [leads]);

  const filtersActive =
    search.trim() !== "" ||
    filterRating !== "all" ||
    filterSource !== "all" ||
    filterOwner !== "all";

  async function handleDrop(stage: LeadStage) {
    setOverStage(null);
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    await window.api.leads.move(id, stage);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingId(lead.id);
    setForm({
      company: lead.company,
      contact: lead.contact,
      email: lead.email,
      phone: lead.phone,
      value: lead.value,
      stage: lead.stage,
      source: lead.source,
      rating: lead.rating,
      owner: lead.owner,
      followUpDate: lead.followUpDate,
      probability: lead.probability,
      competitor: lead.competitor,
      campaignId: lead.campaignId ?? "",
      notes: lead.notes,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim()) return;
    setSaving(true);
    const payload = { ...form, value: Number(form.value) || 0 };
    if (editingId) {
      await window.api.leads.update(editingId, payload);
    } else {
      await window.api.leads.create(payload);
    }
    setSaving(false);
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Diesen Lead wirklich löschen?")) return;
    await window.api.leads.remove(id);
    await load();
  }

  // Gewonnenen Lead in einen Kunden ueberfuehren.
  async function handleConvert(lead: Lead) {
    if (
      !window.confirm(
        `Lead "${lead.company}" als Kunden anlegen? Der Lead wird auf "Gewonnen" gesetzt.`,
      )
    )
      return;
    const customer: CustomerInput = {
      name: lead.company,
      contact: lead.contact,
      email: lead.email,
      phone: lead.phone,
      street: "",
      zip: "",
      city: "",
      notes: lead.notes
        ? `Aus Lead konvertiert.\n${lead.notes}`
        : "Aus Lead konvertiert.",
      status: "aktiv",
      industry: "sonstige",
      website: "",
      customerSince: new Date().toISOString().split('T')[0],
      tags: "",
      ltv: lead.value,
      healthScore: 70,
      taxNumber: "",
      vatId: "",
      bankName: "",
      bankIban: "",
      bankBic: "",
      paymentTerms: "",
      creditLimit: 0,
    };
    await window.api.customers.create(customer);
    if (lead.stage !== "gewonnen") {
      await window.api.leads.update(lead.id, { stage: "gewonnen", probability: 100 });
    }
    await load();
    window.alert(`"${lead.company}" wurde als Kunde angelegt.`);
  }

  function resetFilters() {
    setSearch("");
    setFilterRating("all");
    setFilterSource("all");
    setFilterOwner("all");
  }

  async function toggleActivities(leadId: string) {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
    } else {
      setExpandedLeadId(leadId);
      if (!activities[leadId]) {
        const leadActivities = await window.api.activities.list(leadId);
        setActivities((prev) => ({ ...prev, [leadId]: leadActivities }));
      }
    }
  }

  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    await window.api.activities.create(activityForm);
    setActivityModalOpen(false);
    const leadActivities = await window.api.activities.list(activityForm.leadId);
    setActivities((prev) => ({ ...prev, [activityForm.leadId]: leadActivities }));
    setActivityForm({
      leadId: "",
      type: "note",
      subject: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      duration: 0,
      outcome: "",
    });
  }

  function openActivityModal(leadId: string) {
    setActivityForm({
      ...activityForm,
      leadId,
    });
    setActivityModalOpen(true);
  }

  async function handleDeleteActivity(activityId: string, leadId: string) {
    await window.api.activities.remove(activityId);
    const leadActivities = await window.api.activities.list(leadId);
    setActivities((prev) => ({ ...prev, [leadId]: leadActivities }));
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* KPI-Leiste */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          icon={Wallet}
          label="Offene Pipeline"
          value={formatCurrency(stats.pipelineValue)}
          tone="default"
        />
        <KpiCard
          icon={TrendingUp}
          label="Forecast (gewichtet)"
          value={formatCurrency(stats.weightedForecast)}
          tone="primary"
        />
        <KpiCard
          icon={Award}
          label="Gewonnen"
          value={formatCurrency(stats.wonValue)}
          tone="success"
        />
        <KpiCard
          icon={Percent}
          label="Conversion"
          value={`${stats.conversion.toFixed(0)} %`}
          tone="default"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Überfällige Follow-ups"
          value={String(stats.overdue)}
          tone={stats.overdue > 0 ? "danger" : "default"}
        />
      </div>

      {/* Such- und Filterleiste */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Firma, Kontakt, E-Mail…"
            className="pl-9"
          />
        </div>
        <select
          value={filterRating}
          onChange={(e) => setFilterRating(e.target.value as LeadRating | "all")}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Alle Bewertungen</option>
          {LEAD_RATINGS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as LeadSource | "all")}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Alle Quellen</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Alle Inhaber</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Filter zurücksetzen
          </Button>
        )}
        <Button size="sm" onClick={openCreate} className="ml-auto">
          <Plus className="h-4 w-4" />
          Lead hinzufügen
        </Button>
      </div>

      {filtersActive && (
        <p className="text-xs text-muted-foreground">
          {filteredLeads.length} von {leads.length} Leads angezeigt
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Lade Leads…</p>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 xl:grid-cols-5">
          {LEAD_STAGES.map((stage) => {
            const items = byStage[stage.id];
            const stageValue = items.reduce((sum, l) => sum + l.value, 0);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage.id);
                }}
                onDragLeave={() => setOverStage(null)}
                onDrop={() => handleDrop(stage.id)}
                className={cn(
                  "flex min-w-[240px] flex-col rounded-lg border border-border bg-muted/40 transition-colors",
                  overStage === stage.id && "border-primary bg-accent/60",
                )}
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {stage.label}
                    </span>
                    <Badge tone="muted">{items.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(stageValue)}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-2">
                  {items.map((lead) => (
                    <article
                      key={lead.id}
                      draggable
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        "group cursor-grab rounded-md border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
                        dragId === lead.id && "opacity-50",
                        isOverdue(lead) && "border-danger/60 bg-danger/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {lead.company}
                        </p>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {lead.stage !== "verloren" && (
                            <button
                              onClick={() => handleConvert(lead)}
                              className="text-muted-foreground hover:text-success"
                              aria-label="In Kunden umwandeln"
                              title="In Kunden umwandeln"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(lead)}
                            className="text-muted-foreground hover:text-primary"
                            aria-label="Lead bearbeiten"
                            title="Bearbeiten"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="text-muted-foreground hover:text-danger"
                            aria-label="Lead löschen"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {lead.contact || "—"}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(lead.value)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {lead.probability > 0 && (
                            <span className="text-xs text-muted-foreground">{lead.probability}%</span>
                          )}
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              LEAD_RATINGS.find((r) => r.id === lead.rating)?.color || "bg-gray-500"
                            )}
                            title={lead.rating}
                          />
                        </div>
                      </div>
                      {lead.followUpDate && (
                        <p
                          className={cn(
                            "mt-1.5 flex items-center gap-1 text-xs",
                            isOverdue(lead)
                              ? "font-medium text-danger"
                              : "text-muted-foreground",
                          )}
                        >
                          {isOverdue(lead) && <AlertTriangle className="h-3 w-3" />}
                          Follow-up: {new Date(lead.followUpDate).toLocaleDateString("de-DE")}
                          {isOverdue(lead) && " (überfällig)"}
                        </p>
                      )}
                      {lead.competitor && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mitbewerber: {lead.competitor}
                        </p>
                      )}
                      {lead.campaignId && campaignName(lead.campaignId) && (
                        <div className="mt-1.5">
                          <Badge tone="muted">
                            {campaignName(lead.campaignId)}
                          </Badge>
                        </div>
                      )}
                      <button
                        onClick={() => toggleActivities(lead.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expandedLeadId === lead.id ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        {activities[lead.id]?.length || 0} Aktivitäten
                      </button>
                      {expandedLeadId === lead.id && (
                        <div className="mt-2 space-y-2 border-t border-border pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">Aktivitäten</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => openActivityModal(lead.id)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          {activities[lead.id]?.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Keine Aktivitäten</p>
                          ) : (
                            <div className="space-y-1.5">
                              {activities[lead.id]?.map((activity) => {
                                const ActivityIcon = ACTIVITY_TYPES.find((t) => t.id === activity.type)?.icon || MessageSquare;
                                return (
                                  <div
                                    key={activity.id}
                                    className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs"
                                  >
                                    <ActivityIcon className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground truncate">{activity.subject}</p>
                                      <p className="text-muted-foreground truncate">{activity.description}</p>
                                      <p className="mt-0.5 text-muted-foreground">
                                        {new Date(activity.date).toLocaleDateString('de-DE')}
                                        {activity.duration > 0 && ` · ${activity.duration}min`}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteActivity(activity.id, lead.id)}
                                      className="shrink-0 text-muted-foreground hover:text-danger"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}

                  {items.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border py-8 text-xs text-muted-foreground">
                      Hierher ziehen
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Lead bearbeiten" : "Neuen Lead anlegen"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Firma *">
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Firmenname"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ansprechpartner">
              <Input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </Field>
            <Field label="E-Mail">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Telefon">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Inhaber">
              <Input
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="z. B. MS"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Auftragswert (€)">
              <Input
                type="number"
                value={form.value}
                onChange={(e) =>
                  setForm({ ...form, value: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Phase">
              <select
                value={form.stage}
                onChange={(e) =>
                  setForm({ ...form, stage: e.target.value as LeadStage })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {LEAD_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Quelle">
              <select
                value={form.source}
                onChange={(e) =>
                  setForm({ ...form, source: e.target.value as LeadSource })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bewertung">
              <select
                value={form.rating}
                onChange={(e) =>
                  setForm({ ...form, rating: e.target.value as LeadRating })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {LEAD_RATINGS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Wahrscheinlichkeit (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) =>
                  setForm({ ...form, probability: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Follow-up Datum">
              <Input
                type="date"
                value={form.followUpDate}
                onChange={(e) =>
                  setForm({ ...form, followUpDate: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mitbewerber">
              <Input
                value={form.competitor}
                onChange={(e) => setForm({ ...form, competitor: e.target.value })}
                placeholder="z. B. IT-Service Plus"
              />
            </Field>
            <Field label="Kampagne">
              <select
                value={form.campaignId}
                onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">– keine –</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notizen">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Interne Notizen..."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Speichern…"
                : editingId
                  ? "Änderungen speichern"
                  : "Lead anlegen"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title="Neue Aktivität"
      >
        <form onSubmit={handleCreateActivity} className="space-y-4">
          <Field label="Typ">
            <select
              value={activityForm.type}
              onChange={(e) =>
                setActivityForm({ ...activityForm, type: e.target.value as ActivityType })
              }
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Betreff *">
            <Input
              value={activityForm.subject}
              onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
              placeholder="z. B. Erstgespräch"
              autoFocus
            />
          </Field>
          <Field label="Beschreibung">
            <textarea
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              className="min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Details zur Aktivität..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Datum">
              <Input
                type="date"
                value={activityForm.date}
                onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
              />
            </Field>
            <Field label="Dauer (Minuten)">
              <Input
                type="number"
                min="0"
                value={activityForm.duration}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, duration: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <Field label="Ergebnis">
            <Input
              value={activityForm.outcome}
              onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
              placeholder="z. B. Rückruf vereinbart"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActivityModalOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit">
              Aktivität speichern
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

type KpiTone = "default" | "primary" | "success" | "danger";

const KPI_TONES: Record<KpiTone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  danger: "text-danger",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: KpiTone;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted",
          KPI_TONES[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={cn("truncate text-lg font-semibold", KPI_TONES[tone])}>
          {value}
        </p>
      </div>
    </div>
  );
}
