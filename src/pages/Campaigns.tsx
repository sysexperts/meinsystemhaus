import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Megaphone, Wallet, Award, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field } from "@/components/ui/Modal";
import type {
  Campaign,
  CampaignInput,
  CampaignChannel,
  CampaignStatus,
  Lead,
} from "@/shared/types";
import { cn, formatCurrency } from "@/lib/utils";

const CHANNELS: { id: CampaignChannel; label: string }[] = [
  { id: "website", label: "Website" },
  { id: "empfehlung", label: "Empfehlung" },
  { id: "messe", label: "Messe" },
  { id: "kaltakquise", label: "Kaltakquise" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "google_ads", label: "Google Ads" },
  { id: "email", label: "E-Mail" },
  { id: "print", label: "Print" },
  { id: "sonstige", label: "Sonstige" },
];

const STATUSES: { id: CampaignStatus; label: string; tone: "muted" | "primary" | "warning" | "success" }[] = [
  { id: "geplant", label: "Geplant", tone: "muted" },
  { id: "aktiv", label: "Aktiv", tone: "primary" },
  { id: "pausiert", label: "Pausiert", tone: "warning" },
  { id: "abgeschlossen", label: "Abgeschlossen", tone: "success" },
];

const emptyForm: CampaignInput = {
  name: "",
  channel: "sonstige",
  status: "geplant",
  budget: 0,
  startDate: "",
  endDate: "",
  goal: "",
  notes: "",
};

function channelLabel(id: CampaignChannel) {
  return CHANNELS.find((c) => c.id === id)?.label ?? id;
}

function statusMeta(id: CampaignStatus) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0];
}

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, l] = await Promise.all([
      window.api.campaigns.list(),
      window.api.leads.list(),
    ]);
    setCampaigns(c);
    setLeads(l);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Kennzahlen je Kampagne aus den verknuepften Leads ableiten.
  const metricsById = useMemo(() => {
    const map = new Map<
      string,
      { leadCount: number; wonCount: number; wonValue: number; pipeline: number }
    >();
    for (const c of campaigns) {
      map.set(c.id, { leadCount: 0, wonCount: 0, wonValue: 0, pipeline: 0 });
    }
    for (const l of leads) {
      if (!l.campaignId) continue;
      const m = map.get(l.campaignId);
      if (!m) continue;
      m.leadCount += 1;
      if (l.stage === "gewonnen") {
        m.wonCount += 1;
        m.wonValue += l.value;
      } else if (l.stage !== "verloren") {
        m.pipeline += l.value;
      }
    }
    return map;
  }, [campaigns, leads]);

  const totals = useMemo(() => {
    const budget = campaigns.reduce((s, c) => s + c.budget, 0);
    let wonValue = 0;
    for (const m of metricsById.values()) wonValue += m.wonValue;
    const roi = budget > 0 ? ((wonValue - budget) / budget) * 100 : 0;
    const active = campaigns.filter((c) => c.status === "aktiv").length;
    return { budget, wonValue, roi, active };
  }, [campaigns, metricsById]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      channel: c.channel,
      status: c.status,
      budget: c.budget,
      startDate: c.startDate,
      endDate: c.endDate,
      goal: c.goal,
      notes: c.notes,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, budget: Number(form.budget) || 0 };
    if (editingId) await window.api.campaigns.update(editingId, payload);
    else await window.api.campaigns.create(payload);
    setSaving(false);
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm(
        "Kampagne wirklich löschen? Verknüpfte Leads bleiben erhalten (Zuordnung wird entfernt).",
      )
    )
      return;
    await window.api.campaigns.remove(id);
    await load();
  }

  return (
    <div className="space-y-5">
      {/* KPI-Leiste */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Wallet} label="Budget gesamt" value={formatCurrency(totals.budget)} />
        <Kpi icon={Award} label="Gewonnener Umsatz" value={formatCurrency(totals.wonValue)} tone="success" />
        <Kpi
          icon={TrendingUp}
          label="ROI gesamt"
          value={`${totals.roi >= 0 ? "+" : ""}${totals.roi.toFixed(0)} %`}
          tone={totals.roi >= 0 ? "success" : "danger"}
        />
        <Kpi icon={Megaphone} label="Aktive Kampagnen" value={String(totals.active)} tone="primary" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campaigns.length} Kampagne{campaigns.length === 1 ? "" : "n"}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Kampagne anlegen
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Lade Kampagnen…</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Noch keine Kampagnen. Lege deine erste Kampagne an und ordne ihr
            Leads zu, um den ROI zu verfolgen.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => {
            const m = metricsById.get(c.id) ?? {
              leadCount: 0,
              wonCount: 0,
              wonValue: 0,
              pipeline: 0,
            };
            const roi =
              c.budget > 0 ? ((m.wonValue - c.budget) / c.budget) * 100 : null;
            const costPerLead = m.leadCount > 0 ? c.budget / m.leadCount : null;
            const conversion =
              m.leadCount > 0 ? (m.wonCount / m.leadCount) * 100 : 0;
            const st = statusMeta(c.status);
            return (
              <Card key={c.id} className="group transition-shadow hover:shadow-md">
                <CardContent className="space-y-4 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-foreground">
                        {c.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {channelLabel(c.channel)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1 text-muted-foreground opacity-0 transition hover:text-primary group-hover:opacity-100"
                        aria-label="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 text-muted-foreground opacity-0 transition hover:text-danger group-hover:opacity-100"
                        aria-label="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {c.goal && (
                    <p className="text-sm text-muted-foreground">{c.goal}</p>
                  )}

                  {/* ROI-Hervorhebung */}
                  <div
                    className={cn(
                      "rounded-md border p-3",
                      roi === null
                        ? "border-border bg-muted/40"
                        : roi >= 0
                          ? "border-success/40 bg-success/5"
                          : "border-danger/40 bg-danger/5",
                    )}
                  >
                    <div className="flex items-end justify-between">
                      <span className="text-xs text-muted-foreground">ROI</span>
                      <span
                        className={cn(
                          "text-xl font-semibold",
                          roi === null
                            ? "text-muted-foreground"
                            : roi >= 0
                              ? "text-success"
                              : "text-danger",
                        )}
                      >
                        {roi === null
                          ? "—"
                          : `${roi >= 0 ? "+" : ""}${roi.toFixed(0)} %`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <Metric label="Budget" value={formatCurrency(c.budget)} />
                    <Metric label="Gewonnen" value={formatCurrency(m.wonValue)} />
                    <Metric label="Leads" value={String(m.leadCount)} />
                    <Metric label="Conversion" value={`${conversion.toFixed(0)} %`} />
                    <Metric label="Pipeline" value={formatCurrency(m.pipeline)} />
                    <Metric
                      label="Kosten/Lead"
                      value={costPerLead === null ? "—" : formatCurrency(costPerLead)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Kampagne bearbeiten" : "Neue Kampagne"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="z. B. Frühjahrs-Mailing 2026"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kanal">
              <select
                value={form.channel}
                onChange={(e) =>
                  setForm({ ...form, channel: e.target.value as CampaignChannel })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CHANNELS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CampaignStatus })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget (€)">
              <Input
                type="number"
                min="0"
                value={form.budget}
                onChange={(e) =>
                  setForm({ ...form, budget: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Ziel">
              <Input
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                placeholder="z. B. 20 neue Leads"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Ende">
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notizen">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-[70px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Speichern…"
                : editingId
                  ? "Änderungen speichern"
                  : "Kampagne anlegen"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "primary" | "success" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted",
            toneClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className={cn("truncate text-lg font-semibold", toneClass)}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
