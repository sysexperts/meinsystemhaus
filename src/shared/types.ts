// Gemeinsame Domain-Typen fuer Renderer (UI) und Main-Prozess (DB/IPC).

export type LeadStage =
  | "neu"
  | "kontaktiert"
  | "angebot"
  | "verhandlung"
  | "gewonnen"
  | "verloren";

export type LeadRating = "hot" | "warm" | "cold";

export type LeadSource =
  | "website"
  | "empfehlung"
  | "messe"
  | "kaltakquise"
  | "linkedin"
  | "google_ads"
  | "sonstige";

export interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  value: number;
  stage: LeadStage;
  source: LeadSource;
  rating: LeadRating;
  owner: string;
  followUpDate: string;
  probability: number;
  competitor: string;
  campaignId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadInput = Omit<Lead, "id" | "createdAt" | "updatedAt">;

export type CampaignStatus = "geplant" | "aktiv" | "pausiert" | "abgeschlossen";

export type CampaignChannel =
  | "website"
  | "empfehlung"
  | "messe"
  | "kaltakquise"
  | "linkedin"
  | "google_ads"
  | "email"
  | "print"
  | "sonstige";

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  budget: number;
  startDate: string;
  endDate: string;
  goal: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignInput = Omit<Campaign, "id" | "createdAt" | "updatedAt">;

export type CustomerStatus = "aktiv" | "interessent" | "inaktiv";
export type CustomerIndustry = "it" | "handel" | "dienstleistung" | "produktion" | "sonstige";

export interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  notes: string;
  status: CustomerStatus;
  industry: CustomerIndustry;
  website: string;
  customerSince: string;
  tags: string;
  ltv: number;
  healthScore: number;
  taxNumber: string;
  vatId: string;
  bankName: string;
  bankIban: string;
  bankBic: string;
  paymentTerms: string;
  creditLimit: number;
  createdAt: string;
  updatedAt: string;
}

export type CustomerInput = Omit<Customer, "id" | "createdAt" | "updatedAt">;

export type ProjectStatus = "planung" | "in_arbeit" | "wartend" | "abgeschlossen";
export type ProjectPriority = "hoch" | "mittel" | "niedrig";

export interface Project {
  id: string;
  customerId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  budget: number;
  actualCost: number;
  progress: number;
  assignee: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;

export type ActivityType = "call" | "email" | "meeting" | "note";

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  subject: string;
  description: string;
  date: string;
  duration: number;
  outcome: string;
  createdAt: string;
}

export type ActivityInput = Omit<Activity, "id" | "createdAt">;

export type UserRole = "admin" | "mitarbeiter";

// Oeffentliche Benutzerdaten (NIE Passwort-Hash an den Renderer geben).
export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface NewUserInput {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface AuthResult {
  ok: boolean;
  user?: User;
  error?: string;
}

// Typ der ueber window.api bereitgestellten Schnittstelle.
export interface AppApi {
  leads: {
    list: () => Promise<Lead[]>;
    create: (input: LeadInput) => Promise<Lead>;
    update: (id: string, input: Partial<LeadInput>) => Promise<Lead>;
    move: (id: string, stage: LeadStage) => Promise<Lead>;
    remove: (id: string) => Promise<void>;
  };
  customers: {
    list: () => Promise<Customer[]>;
    create: (input: CustomerInput) => Promise<Customer>;
    update: (id: string, input: Partial<CustomerInput>) => Promise<Customer>;
    remove: (id: string) => Promise<void>;
  };
  auth: {
    needsSetup: () => Promise<boolean>;
    setup: (input: NewUserInput) => Promise<AuthResult>;
    login: (credentials: Credentials) => Promise<AuthResult>;
  };
  users: {
    list: () => Promise<User[]>;
    create: (input: NewUserInput) => Promise<User>;
    remove: (id: string) => Promise<void>;
  };
  projects: {
    list: () => Promise<Project[]>;
    get: (id: string) => Promise<Project>;
    create: (input: ProjectInput) => Promise<Project>;
    update: (id: string, input: Partial<ProjectInput>) => Promise<Project>;
    remove: (id: string) => Promise<void>;
    listByCustomer: (customerId: string) => Promise<Project[]>;
  };
  activities: {
    list: (leadId: string) => Promise<Activity[]>;
    create: (input: ActivityInput) => Promise<Activity>;
    remove: (id: string) => Promise<void>;
  };
  campaigns: {
    list: () => Promise<Campaign[]>;
    create: (input: CampaignInput) => Promise<Campaign>;
    update: (id: string, input: Partial<CampaignInput>) => Promise<Campaign>;
    remove: (id: string) => Promise<void>;
  };
}
