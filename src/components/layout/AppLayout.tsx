import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { navItems } from "@/config/navigation";

export function AppLayout() {
  const location = useLocation();
  const current = navItems.find((i) =>
    i.to === "/" ? location.pathname === "/" : location.pathname.startsWith(i.to),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={current?.label ?? "MeinSystemhaus"} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
