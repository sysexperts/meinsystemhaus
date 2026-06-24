import { useState, useEffect } from "react";
import { Plus, Calendar, Trash2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, Field } from "@/components/ui/Modal";
import type { Project, ProjectStatus, Customer } from "@/shared/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const statusTone: Record<
  ProjectStatus,
  "primary" | "success" | "warning" | "muted"
> = {
  planung: "muted",
  in_arbeit: "primary",
  wartend: "warning",
  abgeschlossen: "success",
};

const statusLabels: Record<ProjectStatus, string> = {
  planung: "Planung",
  in_arbeit: "In Arbeit",
  wartend: "Wartend",
  abgeschlossen: "Abgeschlossen",
};

const filters: { id: ProjectStatus | "alle"; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "in_arbeit", label: "In Arbeit" },
  { id: "planung", label: "Planung" },
  { id: "wartend", label: "Wartend" },
  { id: "abgeschlossen", label: "Abgeschlossen" },
];

export function Projects() {
  const [filter, setFilter] = useState<ProjectStatus | "alle">("alle");
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    customerId: "",
    name: "",
    description: "",
    status: "planung" as ProjectStatus,
    budget: 0,
    startDate: "",
    endDate: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [projectsData, customersData] = await Promise.all([
      window.api.projects.list(),
      window.api.customers.list(),
    ]);
    setProjects(projectsData);
    setCustomers(customersData);
  }

  const visible = projects.filter(
    (p) => filter === "alle" || p.status === filter,
  );

  async function handleCreate() {
    await window.api.projects.create(formData);
    setIsModalOpen(false);
    resetForm();
    loadData();
  }

  async function handleUpdate() {
    if (!editingProject) return;
    await window.api.projects.update(editingProject.id, formData);
    setIsModalOpen(false);
    setEditingProject(null);
    resetForm();
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Projekt wirklich löschen?")) return;
    await window.api.projects.remove(id);
    loadData();
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setFormData({
      customerId: project.customerId,
      name: project.name,
      description: project.description,
      status: project.status,
      budget: project.budget,
      startDate: project.startDate,
      endDate: project.endDate,
      notes: project.notes,
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setFormData({
      customerId: "",
      name: "",
      description: "",
      status: "planung",
      budget: 0,
      startDate: "",
      endDate: "",
      notes: "",
    });
    setEditingProject(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Neues Projekt
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((p) => (
          <ProjectCard key={p.id} project={p} customers={customers} onEdit={openEditModal} onDelete={handleDelete} />
        ))}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingProject ? "Projekt bearbeiten" : "Neues Projekt"}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (editingProject) handleUpdate();
            else handleCreate();
          }}
          className="space-y-4"
        >
        <Field label="Kunde *">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
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
          <input
            type="text"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </Field>
        <Field label="Beschreibung">
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Budget (€)">
          <input
            type="number"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
          />
        </Field>
        <Field label="Startdatum">
          <input
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </Field>
        <Field label="Enddatum">
          <input
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </Field>
        <Field label="Notizen">
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsModalOpen(false);
              resetForm();
            }}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={!formData.customerId || !formData.name.trim()}>
            {editingProject ? "Speichern" : "Erstellen"}
          </Button>
        </div>
        </form>
      </Modal>
    </div>
  );
}

function ProjectCard({ project: p, customers, onEdit, onDelete }: { project: Project; customers: Customer[]; onEdit: (p: Project) => void; onDelete: (id: string) => void }) {
  function getCustomerName(customerId: string): string {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "Unbekannt";
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{getCustomerName(p.customerId)}</p>
          </div>
          <Badge tone={statusTone[p.status]} className="capitalize">
            {statusLabels[p.status]}
          </Badge>
        </div>

        {p.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {p.endDate ? formatDate(p.endDate) : "Kein Datum"}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(p.budget)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => onEdit(p)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(p.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
