import { Router, type Request, type Response } from "express";
import * as db from "../electron/db";
import type {
  LeadInput,
  LeadStage,
  CustomerInput,
  NewUserInput,
  Credentials,
  ProjectInput,
  ActivityInput,
} from "../src/shared/types";

// Kleiner Wrapper: faengt Fehler aus der Datenschicht ab und gibt sie als
// JSON mit Status 400 zurueck, statt den Server abstuerzen zu lassen.
function handle<T>(res: Response, fn: () => T) {
  try {
    const result = fn();
    res.json(result ?? { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    res.status(400).json({ error: message });
  }
}

export function createApiRouter(): Router {
  const router = Router();

  // ----- Leads -----
  router.get("/leads", (_req: Request, res: Response) =>
    handle(res, () => db.listLeads()),
  );
  router.post("/leads", (req: Request, res: Response) =>
    handle(res, () => db.createLead(req.body as LeadInput)),
  );
  router.patch("/leads/:id", (req: Request, res: Response) =>
    handle(res, () => db.updateLead(req.params.id, req.body as Partial<LeadInput>)),
  );
  router.post("/leads/:id/move", (req: Request, res: Response) =>
    handle(res, () => db.moveLead(req.params.id, (req.body as { stage: LeadStage }).stage)),
  );
  router.delete("/leads/:id", (req: Request, res: Response) =>
    handle(res, () => db.deleteLead(req.params.id)),
  );

  // ----- Customers -----
  router.get("/customers", (_req: Request, res: Response) =>
    handle(res, () => db.listCustomers()),
  );
  router.post("/customers", (req: Request, res: Response) =>
    handle(res, () => db.createCustomer(req.body as CustomerInput)),
  );
  router.patch("/customers/:id", (req: Request, res: Response) =>
    handle(res, () => db.updateCustomer(req.params.id, req.body as Partial<CustomerInput>)),
  );
  router.delete("/customers/:id", (req: Request, res: Response) =>
    handle(res, () => db.deleteCustomer(req.params.id)),
  );

  // ----- Auth -----
  router.get("/auth/needs-setup", (_req: Request, res: Response) =>
    handle(res, () => db.countUsers() === 0),
  );
  router.post("/auth/setup", (req: Request, res: Response) =>
    handle(res, () => db.setupFirstUser(req.body as NewUserInput)),
  );
  router.post("/auth/login", (req: Request, res: Response) =>
    handle(res, () => db.authenticate(req.body as Credentials)),
  );

  // ----- Users -----
  router.get("/users", (_req: Request, res: Response) =>
    handle(res, () => db.listUsers()),
  );
  router.post("/users", (req: Request, res: Response) =>
    handle(res, () => db.createUser(req.body as NewUserInput)),
  );
  router.delete("/users/:id", (req: Request, res: Response) =>
    handle(res, () => db.deleteUser(req.params.id)),
  );

  // ----- Projects -----
  router.get("/projects", (_req: Request, res: Response) =>
    handle(res, () => db.listProjects()),
  );
  router.get("/projects/by-customer/:customerId", (req: Request, res: Response) =>
    handle(res, () => db.listProjectsByCustomer(req.params.customerId)),
  );
  router.get("/projects/:id", (req: Request, res: Response) =>
    handle(res, () => db.getProject(req.params.id)),
  );
  router.post("/projects", (req: Request, res: Response) =>
    handle(res, () => db.createProject(req.body as ProjectInput)),
  );
  router.patch("/projects/:id", (req: Request, res: Response) =>
    handle(res, () => db.updateProject(req.params.id, req.body as Partial<ProjectInput>)),
  );
  router.delete("/projects/:id", (req: Request, res: Response) =>
    handle(res, () => db.deleteProject(req.params.id)),
  );

  // ----- Activities -----
  router.get("/activities/:leadId", (req: Request, res: Response) =>
    handle(res, () => db.listActivities(req.params.leadId)),
  );
  router.post("/activities", (req: Request, res: Response) =>
    handle(res, () => db.createActivity(req.body as ActivityInput)),
  );
  router.delete("/activities/:id", (req: Request, res: Response) =>
    handle(res, () => db.deleteActivity(req.params.id)),
  );

  return router;
}
