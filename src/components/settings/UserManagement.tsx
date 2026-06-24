import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Shield, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import type { User, UserRole } from "@/shared/types";

const emptyForm = {
  displayName: "",
  username: "",
  password: "",
  role: "mitarbeiter" as UserRole,
};

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setUsers(await window.api.users.list());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await window.api.users.create(form);
      setModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Diesen Benutzer wirklich löschen?")) return;
    try {
      await window.api.users.remove(id);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Benutzer</CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Benutzer
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="group flex items-center justify-between rounded-md border border-border px-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {u.role === "admin" ? (
                  <Shield className="h-4 w-4" />
                ) : (
                  <UserIcon className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {u.displayName}
                  {u.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (du)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={u.role === "admin" ? "primary" : "muted"}>
                {u.role}
              </Badge>
              {isAdmin && u.id !== currentUser?.id && (
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  aria-label="Benutzer löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {!isAdmin && (
          <p className="text-xs text-muted-foreground">
            Nur Administratoren können Benutzer verwalten.
          </p>
        )}
      </CardContent>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Neuen Benutzer anlegen"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Anzeigename">
            <Input
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              placeholder="z. B. Erika Musterfrau"
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Benutzername *">
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </Field>
            <Field label="Rolle">
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as UserRole })
                }
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="mitarbeiter">Mitarbeiter</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </div>
          <Field label="Passwort *">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="mindestens 4 Zeichen"
              autoComplete="new-password"
            />
          </Field>

          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Speichern…" : "Anlegen"}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
