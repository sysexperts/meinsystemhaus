import { useState } from "react";
import { Building2, Lock, User as UserIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

export function Login() {
  const { needsSetup, login, setup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsSetup) {
      if (password !== confirm) {
        setError("Die Passwörter stimmen nicht überein");
        return;
      }
      setBusy(true);
      const err = await setup({ displayName, username, password });
      setBusy(false);
      if (err) setError(err);
    } else {
      setBusy(true);
      const err = await login({ username, password });
      setBusy(false);
      if (err) setError(err);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">MeinSystemhaus</h1>
            <p className="text-sm text-muted-foreground">
              {needsSetup
                ? "Erstes Konto einrichten"
                : "Bitte melde dich an"}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          {needsSetup && (
            <Field label="Anzeigename">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="z. B. Max Mustermann"
                autoFocus
              />
            </Field>
          )}

          <Field label="Benutzername">
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="benutzername"
                className="pl-9"
                autoFocus={!needsSetup}
                autoComplete="username"
              />
            </div>
          </Field>

          <Field label="Passwort">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                autoComplete={needsSetup ? "new-password" : "current-password"}
              />
            </div>
          </Field>

          {needsSetup && (
            <Field label="Passwort bestätigen">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
            </Field>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full justify-center" disabled={busy}>
            {busy
              ? "Bitte warten…"
              : needsSetup
                ? "Konto erstellen & anmelden"
                : "Anmelden"}
          </Button>
        </form>
      </div>
    </div>
  );
}
