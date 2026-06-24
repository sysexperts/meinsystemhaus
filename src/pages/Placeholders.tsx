import { Ticket, Mail, Receipt } from "lucide-react";
import { PagePlaceholder } from "@/components/common/PagePlaceholder";

export function Tickets() {
  return (
    <PagePlaceholder
      icon={Ticket}
      title="Ticketsystem"
      description="Support-Anfragen erfassen, zuweisen und nachverfolgen. Dieser Bereich wird in einer späteren Ausbaustufe umgesetzt."
    />
  );
}

export function MailPage() {
  return (
    <PagePlaceholder
      icon={Mail}
      title="E-Mail-Integration"
      description="Kundenkommunikation direkt aus der Anwendung. Anbindung an Postfächer folgt in einer späteren Ausbaustufe."
    />
  );
}

export function Invoices() {
  return (
    <PagePlaceholder
      icon={Receipt}
      title="Rechnungswesen"
      description="Angebote, Rechnungen und Mahnwesen. Dieser Bereich wird in einer späteren Ausbaustufe umgesetzt."
    />
  );
}
