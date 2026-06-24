import { Moon, Sun, Monitor, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { UserManagement } from "@/components/settings/UserManagement";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [emailSettings, setEmailSettings] = useState({
    enabled: false,
    imapHost: "",
    imapPort: "993",
    imapUser: "",
    imapPassword: "",
    checkInterval: "5",
    autoCreateTickets: true,
  });

  const options = [
    { id: "light" as const, label: "Hell", icon: Sun },
    { id: "dark" as const, label: "Dunkel", icon: Moon },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Erscheinungsbild</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Wähle das Farbschema der Anwendung.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => setTheme(o.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                  theme === o.id
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-muted",
                )}
              >
                <o.icon className="h-5 w-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <UserManagement />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-Mail-Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Konfigurieren Sie eingehende E-Mails, die automatisch als Tickets erstellt werden.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">E-Mail-Integration aktivieren</label>
              <input
                type="checkbox"
                checked={emailSettings.enabled}
                onChange={(e) => setEmailSettings({ ...emailSettings, enabled: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            {emailSettings.enabled && (
              <>
                <div>
                  <label className="text-sm font-medium">IMAP-Server</label>
                  <Input
                    placeholder="imap.example.com"
                    value={emailSettings.imapHost}
                    onChange={(e) => setEmailSettings({ ...emailSettings, imapHost: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">IMAP-Port</label>
                  <Input
                    placeholder="993"
                    value={emailSettings.imapPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, imapPort: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Benutzername</label>
                  <Input
                    placeholder="user@example.com"
                    value={emailSettings.imapUser}
                    onChange={(e) => setEmailSettings({ ...emailSettings, imapUser: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Passwort</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={emailSettings.imapPassword}
                    onChange={(e) => setEmailSettings({ ...emailSettings, imapPassword: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Prüfintervall (Minuten)</label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={emailSettings.checkInterval}
                    onChange={(e) => setEmailSettings({ ...emailSettings, checkInterval: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Automatisch Tickets erstellen</label>
                  <input
                    type="checkbox"
                    checked={emailSettings.autoCreateTickets}
                    onChange={(e) => setEmailSettings({ ...emailSettings, autoCreateTickets: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                <Button className="w-full">Einstellungen speichern</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datenablage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Alle Daten werden lokal gespeichert – keine Cloud-Verbindung.
          </p>
          <p>
            Speicherort:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
              ./daten/meinsystemhaus.db
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
