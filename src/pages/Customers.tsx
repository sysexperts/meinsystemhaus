import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Building2,
  DollarSign,
  Activity,
  AlertTriangle,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Globe,
  Tag,
  HeartPulse,
  Edit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field } from "@/components/ui/Modal";
import type { Customer, CustomerInput, CustomerStatus, CustomerIndustry } from "@/shared/types";
import type { Lead, Project } from "@/shared/types";
import { cn, formatCurrency } from "@/lib/utils";

const STATUS_TONE: Record<CustomerStatus, "success" | "warning" | "muted"> = {
  aktiv: "success",
  interessent: "warning",
  inaktiv: "muted",
};

const INDUSTRY_LABELS: Record<CustomerIndustry, string> = {
  it: "IT",
  handel: "Handel",
  dienstleistung: "Dienstleistung",
  produktion: "Produktion",
  sonstige: "Sonstige",
};

const emptyForm: CustomerInput = {
  name: "",
  contact: "",
  email: "",
  phone: "",
  street: "",
  zip: "",
  city: "",
  notes: "",
  status: "interessent",
  industry: "sonstige",
  website: "",
  customerSince: "",
  tags: "",
  ltv: 0,
  healthScore: 50,
  taxNumber: "",
  vatId: "",
  bankName: "",
  bankIban: "",
  bankBic: "",
  paymentTerms: "",
  creditLimit: 0,
};

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | "all">("all");
  const [filterIndustry, setFilterIndustry] = useState<CustomerIndustry | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [customersData, leadsData, projectsData] = await Promise.all([
      window.api.customers.list(),
      window.api.leads.list(),
      window.api.projects.list(),
    ]);
    setCustomers(customersData);
    setLeads(leadsData);
    setProjects(projectsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = customers;
    
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((c) =>
        [c.name, c.contact, c.city, c.email, c.tags, c.taxNumber, c.vatId].some((v) =>
          v.toLowerCase().includes(q),
        ),
      );
    }
    
    if (filterStatus !== "all") {
      result = result.filter((c) => c.status === filterStatus);
    }
    
    if (filterIndustry !== "all") {
      result = result.filter((c) => c.industry === filterIndustry);
    }
    
    return result.sort((a, b) => b.healthScore - a.healthScore);
  }, [customers, query, filterStatus, filterIndustry]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === "aktiv").length;
    const totalLtv = customers.reduce((sum, c) => sum + c.ltv, 0);
    const avgHealthScore = customers.length > 0 
      ? customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length 
      : 0;
    const atRisk = customers.filter((c) => c.healthScore < 40).length;
    
    return { total, active, totalLtv, avgHealthScore, atRisk };
  }, [customers]);

  const customerSegments = useMemo(() => {
    const segments = new Map<CustomerStatus, { count: number; ltv: number }>();
    ["aktiv", "interessent", "inaktiv"].forEach(status => {
      segments.set(status as CustomerStatus, { count: 0, ltv: 0 });
    });
    
    customers.forEach(c => {
      const seg = segments.get(c.status);
      if (seg) {
        seg.count += 1;
        seg.ltv += c.ltv;
      }
    });
    
    return Array.from(segments.entries()).map(([status, data]) => ({
      status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      ...data,
    }));
  }, [customers]);

  const industrySegments = useMemo(() => {
    const segments = new Map<CustomerIndustry, { count: number; ltv: number }>();
    ["it", "handel", "dienstleistung", "produktion", "sonstige"].forEach(industry => {
      segments.set(industry as CustomerIndustry, { count: 0, ltv: 0 });
    });
    
    customers.forEach(c => {
      const seg = segments.get(c.industry);
      if (seg) {
        seg.count += 1;
        seg.ltv += c.ltv;
      }
    });
    
    return Array.from(segments.entries())
      .map(([industry, data]) => ({
        industry: industry as CustomerIndustry,
        label: INDUSTRY_LABELS[industry as CustomerIndustry],
        ...data,
      }))
      .sort((a, b) => b.count - a.count);
  }, [customers]);

  const getCustomerLeads = (customerId: string) => {
    return leads.filter(l => l.company === customers.find(c => c.id === customerId)?.name);
  };

  const getCustomerProjects = (customerId: string) => {
    return projects.filter(p => p.customerId === customerId);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 70) return "Gesund";
    if (score >= 40) return "Risiko";
    return "Kritisch";
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await window.api.customers.create(form);
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    await load();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !form.name.trim()) return;
    setSaving(true);
    await window.api.customers.update(editingId, form);
    setSaving(false);
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Diesen Kunden wirklich löschen?")) return;
    await window.api.customers.remove(id);
    await load();
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm(customer);
    setModalOpen(true);
  }

  function openDetail(customer: Customer) {
    setSelectedCustomer(customer);
    setDetailModalOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">Lade Kunden…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kunden suchen..."
              className="h-10 w-72 rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as CustomerStatus | "all")}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Alle Status</option>
            <option value="aktiv">Aktiv</option>
            <option value="interessent">Interessent</option>
            <option value="inaktiv">Inaktiv</option>
          </select>
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value as CustomerIndustry | "all")}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Alle Branchen</option>
            <option value="it">IT</option>
            <option value="handel">Handel</option>
            <option value="dienstleistung">Dienstleistung</option>
            <option value="produktion">Produktion</option>
            <option value="sonstige">Sonstige</option>
          </select>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Kunde anlegen
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard icon={Building2} label="Gesamt Kunden" value={String(stats.total)} />
        <KpiCard icon={Activity} label="Aktive Kunden" value={String(stats.active)} tone="success" />
        <KpiCard icon={DollarSign} label="Gesamt LTV" value={formatCurrency(stats.totalLtv)} tone="primary" />
        <KpiCard icon={HeartPulse} label="Ø Health Score" value={`${stats.avgHealthScore.toFixed(0)}`} tone={stats.avgHealthScore >= 70 ? "success" : stats.avgHealthScore >= 40 ? "warning" : "danger"} />
        <KpiCard icon={AlertTriangle} label="Risiko Kunden" value={String(stats.atRisk)} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kunden nach Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customerSegments.map((seg) => (
              <div key={seg.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{seg.label}</span>
                  <span className="text-muted-foreground">
                    {seg.count} · {formatCurrency(seg.ltv)}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary/80"
                    style={{ width: `${(seg.count / stats.total) * 100 || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Kunden nach Branche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {industrySegments.map((seg) => (
              <div key={seg.industry} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{seg.label}</span>
                  <span className="text-muted-foreground">
                    {seg.count} · {formatCurrency(seg.ltv)}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-success/80"
                    style={{ width: `${(seg.count / stats.total) * 100 || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Firma</th>
                <th className="px-5 py-3 font-medium">Branche</th>
                <th className="px-5 py-3 font-medium">Ansprechpartner</th>
                <th className="px-5 py-3 font-medium">Ort</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Health Score</th>
                <th className="px-5 py-3 font-medium">LTV</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="group border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-5 py-3 cursor-pointer" onClick={() => openDetail(c)}>
                    <div>
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.website && (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-3 w-3" />
                          {c.website}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {INDUSTRY_LABELS[c.industry]}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {c.contact || "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {c.city || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", c.healthScore >= 70 ? "bg-success" : c.healthScore >= 40 ? "bg-warning" : "bg-destructive")}
                          style={{ width: `${c.healthScore}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-medium", getHealthScoreColor(c.healthScore))}>
                        {c.healthScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {formatCurrency(c.ltv)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                        aria-label="Kunde bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(c.id);
                        }}
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                        aria-label="Kunde löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    Keine Kunden gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
          setForm(emptyForm);
        }}
        title={editingId ? "Kunde bearbeiten" : "Neuen Kunden anlegen"}
      >
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <Field label="Firma *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            <Field label="Website">
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as CustomerStatus })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="interessent">Interessent</option>
                <option value="aktiv">Aktiv</option>
                <option value="inaktiv">Inaktiv</option>
              </select>
            </Field>
            <Field label="Branche">
              <select
                value={form.industry}
                onChange={(e) =>
                  setForm({ ...form, industry: e.target.value as CustomerIndustry })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="it">IT</option>
                <option value="handel">Handel</option>
                <option value="dienstleistung">Dienstleistung</option>
                <option value="produktion">Produktion</option>
                <option value="sonstige">Sonstige</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Straße">
              <Input
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </Field>
            <Field label="PLZ">
              <Input
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </Field>
            <Field label="Ort">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </Field>
          </div>
          
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Rechnungsdaten</h4>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Steuernummer">
                <Input
                  value={form.taxNumber}
                  onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                  placeholder="DE123456789"
                />
              </Field>
              <Field label="USt-IdNr. (VAT ID)">
                <Input
                  value={form.vatId}
                  onChange={(e) => setForm({ ...form, vatId: e.target.value })}
                  placeholder="DE123456789"
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Bankverbindung</h4>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bankname">
                <Input
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                />
              </Field>
              <Field label="IBAN">
                <Input
                  value={form.bankIban}
                  onChange={(e) => setForm({ ...form, bankIban: e.target.value })}
                  placeholder="DE89 3704 0044 0532 0130 00"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Field label="BIC">
                <Input
                  value={form.bankBic}
                  onChange={(e) => setForm({ ...form, bankBic: e.target.value })}
                  placeholder="COBADEFFXXX"
                />
              </Field>
              <Field label="Zahlungsbedingungen">
                <Input
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  placeholder="z.B. 14 Tage netto"
                />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tags (kommagetrennt)">
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="VIP, Key-Account, etc."
              />
            </Field>
            <Field label="Health Score (0-100)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.healthScore}
                onChange={(e) => setForm({ ...form, healthScore: parseInt(e.target.value) || 50 })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="LTV (Lifetime Value)">
              <Input
                type="number"
                min="0"
                value={form.ltv}
                onChange={(e) => setForm({ ...form, ltv: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Kreditlimit">
              <Input
                type="number"
                min="0"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <Field label="Notizen">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Interne Notizen..."
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Speichern…" : editingId ? "Kunde aktualisieren" : "Kunde anlegen"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Kunden-Details"
      >
        {selectedCustomer && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Kontaktdaten</h3>
                <div className="space-y-2 text-sm">
                  {selectedCustomer.contact && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {selectedCustomer.contact}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {selectedCustomer.email}
                    </div>
                  )}
                  {selectedCustomer.city && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {selectedCustomer.street && `${selectedCustomer.street}, `}{selectedCustomer.zip} {selectedCustomer.city}
                    </div>
                  )}
                  {selectedCustomer.website && (
                    <a
                      href={selectedCustomer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      {selectedCustomer.website}
                    </a>
                  )}
                  {selectedCustomer.customerSince && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Kunde seit {selectedCustomer.customerSince}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Metriken</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge tone={STATUS_TONE[selectedCustomer.status]}>{selectedCustomer.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Branche</span>
                    <span className="text-sm text-foreground">{INDUSTRY_LABELS[selectedCustomer.industry]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">LTV</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(selectedCustomer.ltv)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Kreditlimit</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(selectedCustomer.creditLimit)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Health Score</span>
                      <span className={cn("text-sm font-medium", getHealthScoreColor(selectedCustomer.healthScore))}>
                        {selectedCustomer.healthScore} ({getHealthScoreLabel(selectedCustomer.healthScore)})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", selectedCustomer.healthScore >= 70 ? "bg-success" : selectedCustomer.healthScore >= 40 ? "bg-warning" : "bg-destructive")}
                        style={{ width: `${selectedCustomer.healthScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(selectedCustomer.taxNumber || selectedCustomer.vatId) && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Rechnungsdaten</h3>
                <div className="space-y-2 text-sm">
                  {selectedCustomer.taxNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Steuernummer</span>
                      <span className="text-foreground font-mono">{selectedCustomer.taxNumber}</span>
                    </div>
                  )}
                  {selectedCustomer.vatId && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">USt-IdNr.</span>
                      <span className="text-foreground font-mono">{selectedCustomer.vatId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(selectedCustomer.bankName || selectedCustomer.bankIban) && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Bankverbindung</h3>
                <div className="space-y-2 text-sm">
                  {selectedCustomer.bankName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="text-foreground">{selectedCustomer.bankName}</span>
                    </div>
                  )}
                  {selectedCustomer.bankIban && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">IBAN</span>
                      <span className="text-foreground font-mono">{selectedCustomer.bankIban}</span>
                    </div>
                  )}
                  {selectedCustomer.bankBic && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">BIC</span>
                      <span className="text-foreground font-mono">{selectedCustomer.bankBic}</span>
                    </div>
                  )}
                  {selectedCustomer.paymentTerms && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Zahlungsbedingungen</span>
                      <span className="text-foreground">{selectedCustomer.paymentTerms}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedCustomer.tags && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomer.tags.split(',').map((tag, i) => (
                    <Badge key={i} tone="muted" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedCustomer.notes && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Notizen</h3>
                <p className="text-sm text-muted-foreground">{selectedCustomer.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Zugehörige Leads ({getCustomerLeads(selectedCustomer.id).length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getCustomerLeads(selectedCustomer.id).length > 0 ? (
                    getCustomerLeads(selectedCustomer.id).map((lead) => (
                      <div key={lead.id} className="rounded-md border border-border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{lead.company}</span>
                          <Badge tone={lead.stage === "gewonnen" ? "success" : lead.stage === "verloren" ? "danger" : "muted"} className="text-xs">
                            {lead.stage}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatCurrency(lead.value)} · {lead.contact}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Keine Leads zugeordnet</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Zugehörige Projekte ({getCustomerProjects(selectedCustomer.id).length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getCustomerProjects(selectedCustomer.id).length > 0 ? (
                    getCustomerProjects(selectedCustomer.id).map((project) => (
                      <div key={project.id} className="rounded-md border border-border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{project.name}</span>
                          <Badge tone={project.status === "abgeschlossen" ? "success" : project.status === "in_arbeit" ? "primary" : "muted"} className="text-xs">
                            {project.status === "in_arbeit" ? "In Arbeit" : project.status === "abgeschlossen" ? "Abgeschlossen" : project.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {project.description}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Keine Projekte zugeordnet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : tone === "warning"
          ? "text-warning"
          : tone === "danger"
            ? "text-destructive"
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
