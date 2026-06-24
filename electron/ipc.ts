import { ipcMain } from "electron";
import * as db from "./db";
import type {
  LeadInput,
  LeadStage,
  CustomerInput,
  NewUserInput,
  Credentials,
  ProjectInput,
  ActivityInput,
} from "../src/shared/types";

export function registerIpcHandlers() {
  // ----- Leads -----
  ipcMain.handle("leads:list", () => db.listLeads());
  ipcMain.handle("leads:create", (_e, input: LeadInput) =>
    db.createLead(input),
  );
  ipcMain.handle("leads:update", (_e, id: string, input: Partial<LeadInput>) =>
    db.updateLead(id, input),
  );
  ipcMain.handle("leads:move", (_e, id: string, stage: LeadStage) =>
    db.moveLead(id, stage),
  );
  ipcMain.handle("leads:remove", (_e, id: string) => db.deleteLead(id));

  // ----- Customers -----
  ipcMain.handle("customers:list", () => db.listCustomers());
  ipcMain.handle("customers:create", (_e, input: CustomerInput) =>
    db.createCustomer(input),
  );
  ipcMain.handle(
    "customers:update",
    (_e, id: string, input: Partial<CustomerInput>) =>
      db.updateCustomer(id, input),
  );
  ipcMain.handle("customers:remove", (_e, id: string) =>
    db.deleteCustomer(id),
  );

  // ----- Auth -----
  ipcMain.handle("auth:needsSetup", () => db.countUsers() === 0);
  ipcMain.handle("auth:setup", (_e, input: NewUserInput) =>
    db.setupFirstUser(input),
  );
  ipcMain.handle("auth:login", (_e, credentials: Credentials) =>
    db.authenticate(credentials),
  );

  // ----- Users -----
  ipcMain.handle("users:list", () => db.listUsers());
  ipcMain.handle("users:create", (_e, input: NewUserInput) =>
    db.createUser(input),
  );
  ipcMain.handle("users:remove", (_e, id: string) => db.deleteUser(id));

  // ----- Projects -----
  ipcMain.handle("projects:list", () => db.listProjects());
  ipcMain.handle("projects:get", (_e, id: string) => db.getProject(id));
  ipcMain.handle("projects:create", (_e, input: ProjectInput) =>
    db.createProject(input),
  );
  ipcMain.handle(
    "projects:update",
    (_e, id: string, input: Partial<ProjectInput>) =>
      db.updateProject(id, input),
  );
  ipcMain.handle("projects:remove", (_e, id: string) => db.deleteProject(id));
  ipcMain.handle("projects:listByCustomer", (_e, customerId: string) =>
    db.listProjectsByCustomer(customerId),
  );

  // ----- Activities -----
  ipcMain.handle("activities:list", (_e, leadId: string) =>
    db.listActivities(leadId),
  );
  ipcMain.handle("activities:create", (_e, input: ActivityInput) =>
    db.createActivity(input),
  );
  ipcMain.handle("activities:remove", (_e, id: string) =>
    db.deleteActivity(id),
  );
}
