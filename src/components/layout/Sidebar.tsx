import { NavLink } from "react-router-dom";
import { Server } from "lucide-react";
import { navItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const primary = navItems.filter((i) => i.section === "primary");
  const secondary = navItems.filter((i) => i.section === "secondary");

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Server className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">MeinSystemhaus</p>
          <p className="text-xs text-muted-foreground">Business Suite</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <NavSection items={primary} />
        <div>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Verwaltung
          </p>
          <NavSection items={secondary} />
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-semibold">
            MS
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-foreground">Max Sommer</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ items }: { items: typeof navItems }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <item.icon className="h-[18px] w-[18px]" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
