import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, User, Trash2, Phone, Mail, Calendar, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field } from "@/components/ui/Modal";
import type { Lead, LeadInput, LeadStage, LeadRating, LeadSource, Activity, ActivityInput, ActivityType } from "@/shared/types";
import { cn, formatCurrency } from "@/lib/utils";

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
  notes: "",
};

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<LeadInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
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
    const data = await window.api.leads.list();
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {
      neu: [],
      kontaktiert: [],
      angebot: [],
      verhandlung: [],
      gewonnen: [],
      verloren: [],
    };
    for (const lead of leads) map[lead.stage].push(lead);
    return map;
  }, [leads]);

  const totalValue = leads
    .filter((l) => l.stage !== "gewonnen")
    .reduce((sum, l) => sum + l.value, 0);

  async function handleDrop(stage: LeadStage) {
    setOverStage(null);
    if (!dragId) return;
    const id = dragId;
    setDragId(null);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    await window.api.leads.move(id, stage);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim()) return;
    setSaving(true);
    await window.api.leads.create({ ...form, value: Number(form.value) || 0 });
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Diesen Lead wirklich löschen?")) return;
    await window.api.leads.remove(id);
    await load();
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Offene Pipeline:{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(totalValue)}
          </span>{" "}
          · {leads.length} Leads
        </p>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Lead hinzufügen
        </Button>
      </div>

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
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {lead.company}
                        </p>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                          aria-label="Lead löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Follow-up: {new Date(lead.followUpDate).toLocaleDateString('de-DE')}
                        </p>
                      )}
                      {lead.competitor && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mitbewerber: {lead.competitor}
                        </p>
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
        title="Neuen Lead anlegen"
      >
        <form onSubmit={handleCreate} className="space-y-4">
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
          <Field label="Mitbewerber">
            <Input
              value={form.competitor}
              onChange={(e) => setForm({ ...form, competitor: e.target.value })}
              placeholder="z. B. IT-Service Plus"
            />
          </Field>
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
              {saving ? "Speichern…" : "Lead anlegen"}
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
