import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field } from "@/components/ui/Modal";
import type { Customer, CustomerInput, CustomerStatus } from "@/shared/types";

const STATUS_TONE: Record<CustomerStatus, "success" | "warning" | "muted"> = {
  aktiv: "success",
  interessent: "warning",
  inaktiv: "muted",
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
};

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CustomerInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await window.api.customers.list();
    setCustomers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.contact, c.city, c.email].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [customers, query]);

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

  async function handleDelete(id: string) {
    if (!window.confirm("Diesen Kunden wirklich löschen?")) return;
    await window.api.customers.remove(id);
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kunden suchen..."
            className="h-10 w-72 rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Kunde anlegen
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Firma</th>
                <th className="px-5 py-3 font-medium">Ansprechpartner</th>
                <th className="px-5 py-3 font-medium">Ort</th>
                <th className="px-5 py-3 font-medium">E-Mail</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="group border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-5 py-3 font-medium text-foreground">
                    {c.name}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {c.contact || "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {c.city || "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {c.email || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                      aria-label="Kunde löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
        onClose={() => setModalOpen(false)}
        title="Neuen Kunden anlegen"
      >
        <form onSubmit={handleCreate} className="space-y-4">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Speichern…" : "Kunde anlegen"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
