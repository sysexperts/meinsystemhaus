import type {
  AppApi,
  LeadInput,
  LeadStage,
  CustomerInput,
  NewUserInput,
  Credentials,
  ProjectInput,
  ActivityInput,
  TicketInput,
  CampaignInput,
} from "@/shared/types";

// Basis-URL der REST-API. Im Dev-Modus leitet Vite "/api" per Proxy an den
// Backend-Server weiter, in Produktion liefert derselbe Server das Frontend
// aus -> relativer Pfad funktioniert in beiden Faellen.
const BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? (data as { error: string }).error
        : `Anfrage fehlgeschlagen (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

function get<T>(path: string) {
  return request<T>(path, { method: "GET" });
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function del<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

// Implementierung der gleichen Schnittstelle wie zuvor das Electron-Preload.
// Dadurch funktionieren alle Seiten unveraendert ueber window.api.*
export const api: AppApi = {
  leads: {
    list: () => get("/leads"),
    create: (input: LeadInput) => post("/leads", input),
    update: (id: string, input: Partial<LeadInput>) =>
      patch(`/leads/${id}`, input),
    move: (id: string, stage: LeadStage) =>
      post(`/leads/${id}/move`, { stage }),
    remove: (id: string) => del<void>(`/leads/${id}`),
  },
  customers: {
    list: () => get("/customers"),
    create: (input: CustomerInput) => post("/customers", input),
    update: (id: string, input: Partial<CustomerInput>) =>
      patch(`/customers/${id}`, input),
    remove: (id: string) => del<void>(`/customers/${id}`),
  },
  auth: {
    needsSetup: () => get("/auth/needs-setup"),
    setup: (input: NewUserInput) => post("/auth/setup", input),
    login: (credentials: Credentials) => post("/auth/login", credentials),
  },
  users: {
    list: () => get("/users"),
    create: (input: NewUserInput) => post("/users", input),
    remove: (id: string) => del<void>(`/users/${id}`),
  },
  projects: {
    list: () => get("/projects"),
    get: (id: string) => get(`/projects/${id}`),
    create: (input: ProjectInput) => post("/projects", input),
    update: (id: string, input: Partial<ProjectInput>) =>
      patch(`/projects/${id}`, input),
    remove: (id: string) => del<void>(`/projects/${id}`),
    listByCustomer: (customerId: string) =>
      get(`/projects/by-customer/${customerId}`),
  },
  activities: {
    list: (leadId: string) => get(`/activities/${leadId}`),
    create: (input: ActivityInput) => post("/activities", input),
    remove: (id: string) => del<void>(`/activities/${id}`),
  },
  tickets: {
    list: () => get("/tickets"),
    get: (id: string) => get(`/tickets/${id}`),
    create: (input: TicketInput) => post("/tickets", input),
    update: (id: string, input: Partial<TicketInput>) =>
      patch(`/tickets/${id}`, input),
    remove: (id: string) => del<void>(`/tickets/${id}`),
    listByCustomer: (customerId: string) =>
      get(`/tickets/customer/${customerId}`),
    listByProject: (projectId: string) =>
      get(`/tickets/project/${projectId}`),
  },
  campaigns: {
    list: () => get("/campaigns"),
    create: (input: CampaignInput) => post("/campaigns", input),
    update: (id: string, input: Partial<CampaignInput>) =>
      patch(`/campaigns/${id}`, input),
    remove: (id: string) => del<void>(`/campaigns/${id}`),
  },
};
