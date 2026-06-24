import { Moon, Sun, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { UserManagement } from "@/components/settings/UserManagement";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

export function Settings() {
  const { theme, setTheme } = useTheme();

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
