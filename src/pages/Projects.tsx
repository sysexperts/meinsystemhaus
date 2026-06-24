import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Edit,
  FolderKanban,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field } from "@/components/ui/Modal";
import type { Project, ProjectInput, ProjectStatus, ProjectPriority, Customer } from "@/shared/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const STATUS_TONE: Record<ProjectStatus, "primary" | "success" | "warning" | "muted"> = {
  planung: "muted",
  in_arbeit: "primary",
  wartend: "warning",
  abgeschlossen: "success",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planung: "Planung",
  in_arbeit: "In Arbeit",
  wartend: "Wartend",
  abgeschlossen: "Abgeschlossen",
};

const PRIORITY_TONE: Record<ProjectPriority, "danger" | "warning" | "muted"> = {
  hoch: "danger",
  mittel: "warning",
  niedrig: "muted",
};

const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  hoch: "Hoch",
  mittel: "Mittel",
  niedrig: "Niedrig",
};

const emptyForm: ProjectInput = {
  customerId: "",
  name: "",
  description: "",
  status: "planung",
  priority: "mittel",
  budget: 0,
  actualCost: 0,
  progress: 0,
  assignee: "",
  startDate: "",
  endDate: "",
  notes: "",
};

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<ProjectPriority | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [projectsData, customersData] = await Promise.all([
      window.api.projects.list(),
      window.api.customers.list(),
    ]);
    setProjects(projectsData);
    setCustomers(customersData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = projects;
    
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        [p.name, p.description, p.assignee].some((v) =>
          v.toLowerCase().includes(q),
        ),
      );
    }
    
    if (filterStatus !== "all") {
      result = result.filter((p) => p.status === filterStatus);
    }
    
    if (filterPriority !== "all") {
      result = result.filter((p) => p.priority === filterPriority);
    }
    
    return result.sort((a, b) => {
      if (a.priority === "hoch" && b.priority !== "hoch") return -1;
      if (a.priority !== "hoch" && b.priority === "hoch") return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [projects, query, filterStatus, filterPriority]);

  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === "in_arbeit").length;
    const completed = projects.filter((p) => p.status === "abgeschlossen").length;
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const totalActualCost = projects.reduce((sum, p) => sum + p.actualCost, 0);
    const avgProgress = projects.length > 0 
      ? projects.reduce((sum, p) => sum + p.progress, 0) / projects.length 
      : 0;
    const overBudget = projects.filter((p) => p.actualCost > p.budget).length;
    const overdue = projects.filter((p) => {
      if (!p.endDate || p.status === "abgeschlossen") return false;
      return new Date(p.endDate) < new Date();
    }).length;
    
    return { total, inProgress, completed, totalBudget, totalActualCost, avgProgress, overBudget, overdue };
  }, [projects]);

  const statusSegments = useMemo(() => {
    const segments = new Map<ProjectStatus, { count: number; budget: number }>();
    ["planung", "in_arbeit", "wartend", "abgeschlossen"].forEach(status => {
      segments.set(status as ProjectStatus, { count: 0, budget: 0 });
    });
    
    projects.forEach(p => {
      const seg = segments.get(p.status);
      if (seg) {
        seg.count += 1;
        seg.budget += p.budget;
      }
    });
    
    return Array.from(segments.entries()).map(([status, data]) => ({
      status,
      label: STATUS_LABELS[status],
      ...data,
    }));
  }, [projects]);

  const prioritySegments = useMemo(() => {
    const segments = new Map<ProjectPriority, { count: number; budget: number }>();
    ["hoch", "mittel", "niedrig"].forEach(priority => {
      segments.set(priority as ProjectPriority, { count: 0, budget: 0 });
    });
    
    projects.forEach(p => {
      const seg = segments.get(p.priority);
      if (seg) {
        seg.count += 1;
        seg.budget += p.budget;
      }
    });
    
    return Array.from(segments.entries())
      .map(([priority, data]) => ({
        priority: priority as ProjectPriority,
        label: PRIORITY_LABELS[priority],
        ...data,
      }))
      .sort((a, b) => b.count - a.count);
  }, [projects]);

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "Unbekannt";
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "text-success";
    if (progress >= 50) return "text-primary";
    if (progress >= 20) return "text-warning";
    return "text-destructive";
  };

  const isOverBudget = (project: Project) => {
    return project.actualCost > project.budget && project.budget > 0;
  };

  const isOverdue = (project: Project) => {
    if (!project.endDate || project.status === "abgeschlossen") return false;
    return new Date(project.endDate) < new Date();
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.customerId) return;
    setSaving(true);
    await window.api.projects.create(form);
    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    await load();
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !form.name.trim() || !form.customerId) return;
    setSaving(true);
    await window.api.projects.update(editingId, form);
    setSaving(false);
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Dieses Projekt wirklich löschen?")) return;
    await window.api.projects.remove(id);
    await load();
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditingId(project.id);
    setForm(project);
    setModalOpen(true);
  }

  function openDetail(project: Project) {
    setSelectedProject(project);
    setDetailModalOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">Lade Projekte…</p>
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
              placeholder="Projekte suchen..."
              className="h-10 w-72 rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | "all")}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Alle Status</option>
            <option value="planung">Planung</option>
            <option value="in_arbeit">In Arbeit</option>
            <option value="wartend">Wartend</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as ProjectPriority | "all")}
            className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">Alle Prioritäten</option>
            <option value="hoch">Hoch</option>
            <option value="mittel">Mittel</option>
            <option value="niedrig">Niedrig</option>
          </select>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Neues Projekt
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard icon={FolderKanban} label="Gesamt Projekte" value={String(stats.total)} />
        <KpiCard icon={TrendingUp} label="In Arbeit" value={String(stats.inProgress)} tone="primary" />
        <KpiCard icon={CheckCircle2} label="Abgeschlossen" value={String(stats.completed)} tone="success" />
        <KpiCard icon={DollarSign} label="Gesamt Budget" value={formatCurrency(stats.totalBudget)} />
        <KpiCard icon={AlertTriangle} label="Über Budget" value={String(stats.overBudget)} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Projekte nach Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusSegments.map((seg) => (
              <div key={seg.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{seg.label}</span>
                  <span className="text-muted-foreground">
                    {seg.count} · {formatCurrency(seg.budget)}
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
            <CardTitle className="text-sm">Projekte nach Priorität</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prioritySegments.map((seg) => (
              <div key={seg.priority} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{seg.label}</span>
                  <span className="text-muted-foreground">
                    {seg.count} · {formatCurrency(seg.budget)}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded bg-muted">
                  <div
                    className={cn("h-full rounded", seg.priority === "hoch" ? "bg-destructive/80" : seg.priority === "mittel" ? "bg-warning/80" : "bg-muted-foreground/80")}
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
                <th className="px-5 py-3 font-medium">Projekt</th>
                <th className="px-5 py-3 font-medium">Kunde</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Priorität</th>
                <th className="px-5 py-3 font-medium">Fortschritt</th>
                <th className="px-5 py-3 font-medium">Budget</th>
                <th className="px-5 py-3 font-medium">Enddatum</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    "group border-b border-border last:border-0 transition-colors hover:bg-muted/50 cursor-pointer",
                    isOverdue(p) && "bg-destructive/5",
                  )}
                  onClick={() => openDetail(p)}
                >
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      {p.assignee && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {p.assignee}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {getCustomerName(p.customerId)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={PRIORITY_TONE[p.priority]}>{PRIORITY_LABELS[p.priority]}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", getProgressColor(p.progress))}
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-medium", getProgressColor(p.progress))}>
                        {p.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="space-y-1">
                      <p className={cn("text-xs", isOverBudget(p) ? "text-destructive font-medium" : "text-muted-foreground")}>
                        {formatCurrency(p.actualCost)} / {formatCurrency(p.budget)}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className={cn(
                        "text-xs",
                        isOverdue(p) ? "text-destructive font-medium" : "text-muted-foreground"
                      )}>
                        {p.endDate ? formatDate(p.endDate) : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(p);
                        }}
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                        aria-label="Projekt bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id);
                        }}
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                        aria-label="Projekt löschen"
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
                    Keine Projekte gefunden.
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
        title={editingId ? "Projekt bearbeiten" : "Neues Projekt"}
      >
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
          <Field label="Kunde *">
            <select
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            >
              <option value="">Kunde auswählen...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Projektname *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Projektname"
              autoFocus
            />
          </Field>
          <Field label="Beschreibung">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Projektbeschreibung..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProjectStatus })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priorität">
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as ProjectPriority })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
                onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Tatsächliche Kosten (€)">
              <Input
                type="number"
                min="0"
                value={form.actualCost}
                onChange={(e) => setForm({ ...form, actualCost: parseFloat(e.target.value) || 0 })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fortschritt (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Bearbeiter">
              <Input
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="Name des Bearbeiters"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Startdatum">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Enddatum">
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
              rows={2}
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
              {saving ? "Speichern…" : editingId ? "Projekt aktualisieren" : "Projekt erstellen"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Projekt-Details"
      >
        {selectedProject && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Projekt-Informationen</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge tone={STATUS_TONE[selectedProject.status]}>{STATUS_LABELS[selectedProject.status]}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Priorität</span>
                    <Badge tone={PRIORITY_TONE[selectedProject.priority]}>{PRIORITY_LABELS[selectedProject.priority]}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Kunde</span>
                    <span className="text-foreground">{getCustomerName(selectedProject.customerId)}</span>
                  </div>
                  {selectedProject.assignee && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bearbeiter</span>
                      <span className="text-foreground">{selectedProject.assignee}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Budget & Kosten</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Budget</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(selectedProject.budget)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tatsächliche Kosten</span>
                    <span className={cn("text-sm font-medium", isOverBudget(selectedProject) ? "text-destructive" : "text-foreground")}>
                      {formatCurrency(selectedProject.actualCost)}
                    </span>
                  </div>
                  {selectedProject.budget > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Budget-Auslastung</span>
                        <span className={cn("text-sm font-medium", isOverBudget(selectedProject) ? "text-destructive" : "text-foreground")}>
                          {((selectedProject.actualCost / selectedProject.budget) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", isOverBudget(selectedProject) ? "bg-destructive" : "bg-success")}
                          style={{ width: `${Math.min((selectedProject.actualCost / selectedProject.budget) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Fortschritt</h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Abgeschlossen</span>
                  <span className={cn("text-sm font-medium", getProgressColor(selectedProject.progress))}>
                    {selectedProject.progress}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", getProgressColor(selectedProject.progress))}
                    style={{ width: `${selectedProject.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Zeitplan</h3>
                <div className="space-y-2 text-sm">
                  {selectedProject.startDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Start: {formatDate(selectedProject.startDate)}
                    </div>
                  )}
                  {selectedProject.endDate && (
                    <div className={cn("flex items-center gap-2", isOverdue(selectedProject) ? "text-destructive" : "text-muted-foreground")}>
                      <Clock className="h-4 w-4" />
                      Ende: {formatDate(selectedProject.endDate)}
                      {isOverdue(selectedProject) && (
                        <Badge tone="danger" className="text-xs">Überfällig</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">KPIs</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Budget-Abweichung</span>
                    <span className={cn("font-medium", isOverBudget(selectedProject) ? "text-destructive" : "text-success")}>
                      {formatCurrency(selectedProject.actualCost - selectedProject.budget)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Verbleibendes Budget</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(selectedProject.budget - selectedProject.actualCost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedProject.description && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Beschreibung</h3>
                <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
              </div>
            )}

            {selectedProject.notes && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Notizen</h3>
                <p className="text-sm text-muted-foreground">{selectedProject.notes}</p>
              </div>
            )}
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
