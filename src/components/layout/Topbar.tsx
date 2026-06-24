import { useEffect, useRef, useState } from "react";
import { Search, Bell, Moon, Sun, Plus, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  const initials = user.displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-muted"
        aria-label="Benutzermenü"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials || "?"}
        </span>
        <span className="hidden text-sm font-medium text-foreground sm:block">
          {user.displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-card p-1 shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">
              {user.displayName}
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {user.role} · @{user.username}
            </p>
          </div>
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar({ title }: { title: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Suchen..."
            className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Button size="sm" className="hidden sm:inline-flex">
          <Plus className="h-4 w-4" />
          Neu
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Benachrichtigungen"
          className="relative"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Theme wechseln"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>

        <div className="ml-1 border-l border-border pl-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
