import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  Bug,
  Sparkles,
  HelpCircle,
  User,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Ticket, TicketInput, Customer, Project } from "@/shared/types";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "primary" | "muted"> = {
  offen: "primary",
  in_bearbeitung: "warning",
  wartend: "muted",
  geloest: "success",
  geschlossen: "muted",
};

const STATUS_LABELS: Record<string, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  wartend: "Wartend",
  geloest: "Gelöst",
  geschlossen: "Geschlossen",
};

const PRIORITY_TONE: Record<string, "danger" | "warning" | "muted"> = {
  hoch: "danger",
  mittel: "warning",
  niedrig: "muted",
};

const PRIORITY_LABELS: Record<string, string> = {
  hoch: "Hoch",
  mittel: "Mittel",
  niedrig: "Niedrig",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  bug: Bug,
  feature: Sparkles,
  support: HelpCircle,
  frage: HelpCircle,
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  support: "Support",
  frage: "Frage",
};

const emptyForm: TicketInput = {
  customerId: "",
  projectId: "",
  subject: "",
  description: "",
  status: "offen",
  priority: "mittel",
  type: "support",
  assignee: "",
  dueDate: "",
  resolution: "",
};

export function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [formData, setFormData] = useState<TicketInput>(emptyForm);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [ticketsData, customersData, projectsData] = await Promise.all([
      window.api.tickets.list(),
      window.api.customers.list(),
      window.api.projects.list(),
    ]);
    setTickets(ticketsData);
    setCustomers(customersData);
    setProjects(projectsData);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchesQuery =
        t.subject.toLowerCase().includes(query.toLowerCase()) ||
        t.description.toLowerCase().includes(query.toLowerCase()) ||
        t.assignee.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
      const matchesType = typeFilter === "all" || t.type === typeFilter;
      return matchesQuery && matchesStatus && matchesPriority && matchesType;
    });
  }, [tickets, query, statusFilter, priorityFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "offen").length;
    const inProgress = tickets.filter((t) => t.status === "in_bearbeitung").length;
    const resolved = tickets.filter((t) => t.status === "geloest").length;
    const highPriority = tickets.filter((t) => t.priority === "hoch" && t.status !== "geloest" && t.status !== "geschlossen").length;
    const overdue = tickets.filter((t) => t.dueDate && t.dueDate < new Date().toISOString().split('T')[0] && t.status !== "geloest" && t.status !== "geschlossen").length;
    return { total, open, inProgress, resolved, highPriority, overdue };
  }, [tickets]);

  function getCustomerName(customerId: string): string {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "Unbekannt";
  }

  function getProjectName(projectId: string | undefined): string {
    if (!projectId) return "-";
    const project = projects.find((p) => p.id === projectId);
    return project?.name || "Unbekannt";
  }

  function isOverdue(ticket: Ticket): boolean {
    if (!ticket.dueDate) return false;
    return ticket.dueDate < new Date().toISOString().split('T')[0] && ticket.status !== "geloest" && ticket.status !== "geschlossen";
  }

  async function handleCreate() {
    if (!formData.customerId) {
      alert("Bitte wählen Sie einen Kunden aus.");
      return;
    }
    if (!formData.subject) {
      alert("Bitte geben Sie einen Betreff ein.");
      return;
    }
    await window.api.tickets.create(formData);
    setCreateModalOpen(false);
    setFormData(emptyForm);
    loadData();
  }

  async function handleUpdate() {
    if (!selectedTicket) return;
    await window.api.tickets.update(selectedTicket.id, formData);
    setEditModalOpen(false);
    setSelectedTicket(null);
    setFormData(emptyForm);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Ticket wirklich löschen?")) return;
    await window.api.tickets.remove(id);
    loadData();
  }

  function openCreate() {
    setFormData(emptyForm);
    setCreateModalOpen(true);
  }

  function openEdit(ticket: Ticket) {
    setSelectedTicket(ticket);
    setFormData({
      customerId: ticket.customerId,
      projectId: ticket.projectId,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      type: ticket.type,
      assignee: ticket.assignee,
      dueDate: ticket.dueDate,
      resolution: ticket.resolution,
    });
    setEditModalOpen(true);
  }

  function openDetail(ticket: Ticket) {
    setSelectedTicket(ticket);
    setDetailModalOpen(true);
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-semibold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-semibold">{stats.open}</p>
            <p className="text-sm text-muted-foreground">Offen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-semibold">{stats.inProgress}</p>
            <p className="text-sm text-muted-foreground">In Bearbeitung</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-semibold">{stats.resolved}</p>
            <p className="text-sm text-muted-foreground">Gelöst</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-semibold text-destructive">{stats.highPriority}</p>
            <p className="text-sm text-muted-foreground">Hoch Prio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-semibold text-destructive">{stats.overdue}</p>
            <p className="text-sm text-muted-foreground">Überfällig</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ticket-Liste</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Alle Status</option>
                <option value="offen">Offen</option>
                <option value="in_bearbeitung">In Bearbeitung</option>
                <option value="wartend">Wartend</option>
                <option value="geloest">Gelöst</option>
                <option value="geschlossen">Geschlossen</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Alle Prioritäten</option>
                <option value="hoch">Hoch</option>
                <option value="mittel">Mittel</option>
                <option value="niedrig">Niedrig</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">Alle Typen</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="support">Support</option>
                <option value="frage">Frage</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Tickets gefunden</p>
            ) : (
              filtered.map((ticket) => {
                const TypeIcon = TYPE_ICONS[ticket.type];
                return (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 cursor-pointer"
                    onClick={() => openDetail(ticket)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent">
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{ticket.subject}</p>
                          {isOverdue(ticket) && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getCustomerName(ticket.customerId)} · {TYPE_LABELS[ticket.type]}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge tone={STATUS_TONE[ticket.status]} className="text-xs">
                            {STATUS_LABELS[ticket.status]}
                          </Badge>
                          <Badge tone={PRIORITY_TONE[ticket.priority]} className="text-xs">
                            {PRIORITY_LABELS[ticket.priority]}
                          </Badge>
                          {ticket.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.assignee}
                            </span>
                          )}
                          {ticket.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(ticket.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(ticket);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ticket.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Neues Ticket">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Kunde</label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
            >
              <option value="">Kunde auswählen</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Projekt (optional)</label>
            <select
              value={formData.projectId || ""}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value || undefined })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
            >
              <option value="">Kein Projekt</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Betreff</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
              >
                <option value="offen">Offen</option>
                <option value="in_bearbeitung">In Bearbeitung</option>
                <option value="wartend">Wartend</option>
                <option value="geloest">Gelöst</option>
                <option value="geschlossen">Geschlossen</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priorität</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
              >
                <option value="hoch">Hoch</option>
                <option value="mittel">Mittel</option>
                <option value="niedrig">Niedrig</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Typ</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="support">Support</option>
                <option value="frage">Frage</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Zuständig</label>
            <Input
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Fälligkeitsdatum</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate}>Erstellen</Button>
          </div>
        </div>
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Ticket bearbeiten">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Kunde</label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Projekt (optional)</label>
            <select
              value={formData.projectId || ""}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value || undefined })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
            >
              <option value="">Kein Projekt</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Betreff</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
              >
                <option value="offen">Offen</option>
                <option value="in_bearbeitung">In Bearbeitung</option>
                <option value="wartend">Wartend</option>
                <option value="geloest">Gelöst</option>
                <option value="geschlossen">Geschlossen</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priorität</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
              >
                <option value="hoch">Hoch</option>
                <option value="mittel">Mittel</option>
                <option value="niedrig">Niedrig</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Typ</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 mt-1"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="support">Support</option>
                <option value="frage">Frage</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Zuständig</label>
            <Input
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Fälligkeitsdatum</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="mt-1"
            />
          </div>
          {formData.status === "geloest" && (
            <div>
              <label className="text-sm font-medium">Lösung</label>
              <textarea
                value={formData.resolution}
                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 mt-1"
                placeholder="Beschreiben Sie die Lösung..."
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditModalOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdate}>Speichern</Button>
          </div>
        </div>
      </Modal>

      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Ticket-Details">
        {selectedTicket && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedTicket.subject}</h3>
                <p className="text-sm text-muted-foreground">
                  {getCustomerName(selectedTicket.customerId)}
                  {selectedTicket.projectId && ` · ${getProjectName(selectedTicket.projectId)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge tone={STATUS_TONE[selectedTicket.status]}>
                  {STATUS_LABELS[selectedTicket.status]}
                </Badge>
                <Badge tone={PRIORITY_TONE[selectedTicket.priority]}>
                  {PRIORITY_LABELS[selectedTicket.priority]}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Typ</p>
                <p className="font-medium">{TYPE_LABELS[selectedTicket.type]}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Zuständig</p>
                <p className="font-medium">{selectedTicket.assignee || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fälligkeitsdatum</p>
                <p className="font-medium">{selectedTicket.dueDate ? formatDate(selectedTicket.dueDate) : "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Erstellt am</p>
                <p className="font-medium">{formatDate(selectedTicket.createdAt)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Beschreibung</p>
              <p className="text-sm whitespace-pre-wrap">{selectedTicket.description || "-"}</p>
            </div>
            {selectedTicket.resolution && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Lösung</p>
                <p className="text-sm whitespace-pre-wrap bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                  {selectedTicket.resolution}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                Schließen
              </Button>
              <Button onClick={() => {
                setDetailModalOpen(false);
                openEdit(selectedTicket);
              }}>
                Bearbeiten
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
