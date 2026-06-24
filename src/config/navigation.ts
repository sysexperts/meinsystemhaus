import {
  LayoutDashboard,
  Target,
  Megaphone,
  BarChart3,
  FolderKanban,
  Users,
  Ticket,
  Mail,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  section: "primary" | "secondary";
  badge?: string;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, section: "primary" },
  {
    label: "Kundengewinnung",
    to: "/leads",
    icon: Target,
    section: "primary",
  },
  {
    label: "Kampagnen",
    to: "/campaigns",
    icon: Megaphone,
    section: "primary",
  },
  {
    label: "Berichte",
    to: "/reports",
    icon: BarChart3,
    section: "primary",
  },
  {
    label: "Projekte",
    to: "/projects",
    icon: FolderKanban,
    section: "primary",
  },
  { label: "Kunden", to: "/customers", icon: Users, section: "primary" },
  { label: "Tickets", to: "/tickets", icon: Ticket, section: "secondary" },
  { label: "E-Mail", to: "/mail", icon: Mail, section: "secondary" },
  {
    label: "Rechnungswesen",
    to: "/invoices",
    icon: Receipt,
    section: "secondary",
  },
  {
    label: "Einstellungen",
    to: "/settings",
    icon: Settings,
    section: "secondary",
  },
];
