import { contextBridge, ipcRenderer } from "electron";
import type {
  AppApi,
  LeadInput,
  LeadStage,
  CustomerInput,
  NewUserInput,
  Credentials,
  ProjectInput,
  ActivityInput,
} from "../src/shared/types";

// Sichere Bruecke zwischen Renderer und Main-Prozess.
// Der Renderer ruft z. B. window.api.leads.list() auf -> geht per IPC
// zum Main-Prozess, der die SQLite-Datenbank bedient.
const api: AppApi = {
  leads: {
    list: () => ipcRenderer.invoke("leads:list"),
    create: (input: LeadInput) => ipcRenderer.invoke("leads:create", input),
    update: (id: string, input: Partial<LeadInput>) =>
      ipcRenderer.invoke("leads:update", id, input),
    move: (id: string, stage: LeadStage) =>
      ipcRenderer.invoke("leads:move", id, stage),
    remove: (id: string) => ipcRenderer.invoke("leads:remove", id),
  },
  customers: {
    list: () => ipcRenderer.invoke("customers:list"),
    create: (input: CustomerInput) =>
      ipcRenderer.invoke("customers:create", input),
    update: (id: string, input: Partial<CustomerInput>) =>
      ipcRenderer.invoke("customers:update", id, input),
    remove: (id: string) => ipcRenderer.invoke("customers:remove", id),
  },
  auth: {
    needsSetup: () => ipcRenderer.invoke("auth:needsSetup"),
    setup: (input: NewUserInput) => ipcRenderer.invoke("auth:setup", input),
    login: (credentials: Credentials) =>
      ipcRenderer.invoke("auth:login", credentials),
  },
  users: {
    list: () => ipcRenderer.invoke("users:list"),
    create: (input: NewUserInput) => ipcRenderer.invoke("users:create", input),
    remove: (id: string) => ipcRenderer.invoke("users:remove", id),
  },
  projects: {
    list: () => ipcRenderer.invoke("projects:list"),
    get: (id: string) => ipcRenderer.invoke("projects:get", id),
    create: (input: ProjectInput) => ipcRenderer.invoke("projects:create", input),
    update: (id: string, input: Partial<ProjectInput>) =>
      ipcRenderer.invoke("projects:update", id, input),
    remove: (id: string) => ipcRenderer.invoke("projects:remove", id),
    listByCustomer: (customerId: string) =>
      ipcRenderer.invoke("projects:listByCustomer", customerId),
  },
  activities: {
    list: (leadId: string) => ipcRenderer.invoke("activities:list", leadId),
    create: (input: ActivityInput) => ipcRenderer.invoke("activities:create", input),
    remove: (id: string) => ipcRenderer.invoke("activities:remove", id),
  },
};

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("appInfo", {
  platform: process.platform,
});
