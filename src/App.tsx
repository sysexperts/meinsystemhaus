import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Leads } from "@/pages/Leads";
import { Projects } from "@/pages/Projects";
import { Customers } from "@/pages/Customers";
import { Settings } from "@/pages/Settings";
import { Tickets, MailPage, Invoices } from "@/pages/Placeholders";
import { Login } from "@/pages/Login";
import { useAuth } from "@/context/AuthContext";

function App() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Lade…
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/mail" element={<MailPage />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
