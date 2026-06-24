import { DatabaseSync } from "node:sqlite";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type {
  Lead,
  LeadInput,
  LeadStage,
  Customer,
  CustomerInput,
  User,
  NewUserInput,
  Credentials,
  AuthResult,
  Project,
  ProjectInput,
  Activity,
  ActivityInput,
  Campaign,
  CampaignInput,
} from "../../src/shared/types";
import { seedLeads, seedCustomers } from "./seed";

let db: DatabaseSync;

export function initDatabase(dbPath: string) {
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  createSchema();
  migrate();
  seedIfEmpty();
}

// Leichte Migrationen fuer bestehende Datenbanken: fehlende Spalten ergaenzen.
function migrate() {
  const cols = db
    .prepare("PRAGMA table_info(leads)")
    .all() as unknown as { name: string }[];
  const hasCampaignId = cols.some((c) => c.name === "campaignId");
  if (!hasCampaignId) {
    db.exec("ALTER TABLE leads ADD COLUMN campaignId TEXT NOT NULL DEFAULT ''");
  }
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      contact TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      value REAL NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'neu',
      source TEXT NOT NULL DEFAULT 'sonstige',
      rating TEXT NOT NULL DEFAULT 'cold',
      owner TEXT NOT NULL DEFAULT '',
      followUpDate TEXT NOT NULL DEFAULT '',
      probability INTEGER NOT NULL DEFAULT 0,
      competitor TEXT NOT NULL DEFAULT '',
      campaignId TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'sonstige',
      status TEXT NOT NULL DEFAULT 'geplant',
      budget REAL NOT NULL DEFAULT 0,
      startDate TEXT NOT NULL DEFAULT '',
      endDate TEXT NOT NULL DEFAULT '',
      goal TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      street TEXT NOT NULL DEFAULT '',
      zip TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'interessent',
      industry TEXT NOT NULL DEFAULT 'sonstige',
      website TEXT NOT NULL DEFAULT '',
      customerSince TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      ltv REAL NOT NULL DEFAULT 0,
      healthScore INTEGER NOT NULL DEFAULT 50,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      displayName TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'mitarbeiter',
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planung',
      budget REAL NOT NULL DEFAULT 0,
      startDate TEXT NOT NULL DEFAULT '',
      endDate TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      leadId TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'note',
      subject TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      outcome TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE
    );
  `);
}

function seedIfEmpty() {
  const leadCount = (
    db.prepare("SELECT COUNT(*) AS c FROM leads").get() as { c: number }
  ).c;
  if (leadCount === 0) {
    for (const lead of seedLeads) createLead(lead);
  }

  const customerCount = (
    db.prepare("SELECT COUNT(*) AS c FROM customers").get() as { c: number }
  ).c;
  if (customerCount === 0) {
    for (const customer of seedCustomers) createCustomer(customer);
  }

  const campaignCount = (
    db.prepare("SELECT COUNT(*) AS c FROM campaigns").get() as { c: number }
  ).c;
  if (campaignCount === 0) {
    const demo: CampaignInput[] = [
      { name: "Website Relaunch & SEO", channel: "website", status: "aktiv", budget: 4000, startDate: "", endDate: "", goal: "Mehr Inbound-Leads", notes: "" },
      { name: "IT-Messe Frühjahr", channel: "messe", status: "abgeschlossen", budget: 6500, startDate: "", endDate: "", goal: "Neukundenkontakte", notes: "" },
      { name: "LinkedIn Outreach", channel: "linkedin", status: "aktiv", budget: 1500, startDate: "", endDate: "", goal: "Entscheider ansprechen", notes: "" },
    ];
    const created = demo.map((c) => createCampaign(c));
    // Bestehende Leads anhand ihrer Quelle einer passenden Kampagne zuordnen.
    const byChannel = new Map(created.map((c) => [c.channel, c.id]));
    for (const lead of listLeads()) {
      const campaignId = byChannel.get(lead.source as CampaignChannel);
      if (campaignId) updateLead(lead.id, { campaignId });
    }
  }
}

function now() {
  return new Date().toISOString();
}

// ---------- Leads ----------

export function listLeads(): Lead[] {
  return db
    .prepare("SELECT * FROM leads ORDER BY updatedAt DESC")
    .all() as unknown as Lead[];
}

export function getLead(id: string): Lead {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as
    unknown as Lead | undefined;
  if (!lead) throw new Error(`Lead ${id} nicht gefunden`);
  return lead;
}

export function createLead(input: LeadInput): Lead {
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO leads
      (id, company, contact, email, phone, value, stage, source, rating, owner, followUpDate, probability, competitor, campaignId, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.company,
    input.contact ?? "",
    input.email ?? "",
    input.phone ?? "",
    input.value ?? 0,
    input.stage ?? "neu",
    input.source ?? "sonstige",
    input.rating ?? "cold",
    input.owner ?? "",
    input.followUpDate ?? "",
    input.probability ?? 0,
    input.competitor ?? "",
    input.campaignId ?? "",
    input.notes ?? "",
    ts,
    ts,
  );
  return getLead(id);
}

export function updateLead(id: string, input: Partial<LeadInput>): Lead {
  const current = getLead(id);
  const merged = { ...current, ...input };
  db.prepare(
    `UPDATE leads SET
      company = ?, contact = ?, email = ?, phone = ?, value = ?,
      stage = ?, source = ?, rating = ?, owner = ?, followUpDate = ?,
      probability = ?, competitor = ?, campaignId = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
  ).run(
    merged.company,
    merged.contact,
    merged.email,
    merged.phone,
    merged.value,
    merged.stage,
    merged.source,
    merged.rating,
    merged.owner,
    merged.followUpDate,
    merged.probability,
    merged.competitor,
    merged.campaignId ?? "",
    merged.notes,
    now(),
    id,
  );
  return getLead(id);
}

export function moveLead(id: string, stage: LeadStage): Lead {
  return updateLead(id, { stage });
}

export function deleteLead(id: string): void {
  db.prepare("DELETE FROM leads WHERE id = ?").run(id);
}

// ---------- Customers ----------

export function listCustomers(): Customer[] {
  return db
    .prepare("SELECT * FROM customers ORDER BY name ASC")
    .all() as unknown as Customer[];
}

export function getCustomer(id: string): Customer {
  const customer = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(id) as unknown as Customer | undefined;
  if (!customer) throw new Error(`Kunde ${id} nicht gefunden`);
  return customer;
}

export function createCustomer(input: CustomerInput): Customer {
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO customers
      (id, name, contact, email, phone, street, zip, city, notes, status, industry, website, customerSince, tags, ltv, healthScore, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.contact ?? "",
    input.email ?? "",
    input.phone ?? "",
    input.street ?? "",
    input.zip ?? "",
    input.city ?? "",
    input.notes ?? "",
    input.status ?? "interessent",
    input.industry ?? "sonstige",
    input.website ?? "",
    input.customerSince ?? ts.split('T')[0],
    input.tags ?? "",
    input.ltv ?? 0,
    input.healthScore ?? 50,
    ts,
    ts,
  );
  return getCustomer(id);
}

export function updateCustomer(
  id: string,
  input: Partial<CustomerInput>,
): Customer {
  const current = getCustomer(id);
  const merged = { ...current, ...input };
  db.prepare(
    `UPDATE customers SET
      name = ?, contact = ?, email = ?, phone = ?, street = ?,
      zip = ?, city = ?, notes = ?, status = ?, industry = ?, website = ?,
      customerSince = ?, tags = ?, ltv = ?, healthScore = ?, updatedAt = ?
     WHERE id = ?`,
  ).run(
    merged.name,
    merged.contact,
    merged.email,
    merged.phone,
    merged.street,
    merged.zip,
    merged.city,
    merged.notes,
    merged.status,
    merged.industry ?? "sonstige",
    merged.website ?? "",
    merged.customerSince ?? "",
    merged.tags ?? "",
    merged.ltv ?? 0,
    merged.healthScore ?? 50,
    now(),
    id,
  );
  return getCustomer(id);
}

export function deleteCustomer(id: string): void {
  db.prepare("DELETE FROM customers WHERE id = ?").run(id);
}

// ---------- Users / Auth ----------

interface UserRow extends User {
  passwordHash: string;
}

// Passwort -> "salt:hash" (scrypt). Salt zufaellig pro Benutzer.
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, 64);
  if (candidate.length !== hashBuffer.length) return false;
  return timingSafeEqual(candidate, hashBuffer);
}

function toPublicUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export function countUsers(): number {
  return (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number })
    .c;
}

export function listUsers(): User[] {
  return db
    .prepare(
      "SELECT id, username, displayName, role, createdAt FROM users ORDER BY createdAt ASC",
    )
    .all() as unknown as User[];
}

export function createUser(input: NewUserInput): User {
  const username = input.username.trim();
  if (!username) throw new Error("Benutzername darf nicht leer sein");
  if (!input.password || input.password.length < 4) {
    throw new Error("Passwort muss mindestens 4 Zeichen haben");
  }
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) throw new Error("Benutzername ist bereits vergeben");

  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, username, displayName, role, passwordHash, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    username,
    input.displayName?.trim() || username,
    input.role ?? "mitarbeiter",
    hashPassword(input.password),
    now(),
  );
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    unknown as UserRow;
  return toPublicUser(row);
}

export function deleteUser(id: string): void {
  if (countUsers() <= 1) {
    throw new Error("Der letzte Benutzer kann nicht gelöscht werden");
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function authenticate(credentials: Credentials): AuthResult {
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(credentials.username.trim()) as unknown as UserRow | undefined;
  if (!row) return { ok: false, error: "Benutzer nicht gefunden" };
  if (!verifyPassword(credentials.password, row.passwordHash)) {
    return { ok: false, error: "Falsches Passwort" };
  }
  return { ok: true, user: toPublicUser(row) };
}

// Erstes Konto beim Einrichten: immer als Admin.
export function setupFirstUser(input: NewUserInput): AuthResult {
  if (countUsers() > 0) {
    return { ok: false, error: "Es existiert bereits ein Benutzer" };
  }
  const user = createUser({ ...input, role: "admin" });
  return { ok: true, user };
}

// ---------- Projects ----------

export function listProjects(): Project[] {
  return db
    .prepare("SELECT * FROM projects ORDER BY updatedAt DESC")
    .all() as unknown as Project[];
}

export function getProject(id: string): Project {
  const project = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(id) as unknown as Project | undefined;
  if (!project) throw new Error(`Projekt ${id} nicht gefunden`);
  return project;
}

export function createProject(input: ProjectInput): Project {
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO projects
      (id, customerId, name, description, status, budget, startDate, endDate, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.customerId,
    input.name,
    input.description ?? "",
    input.status ?? "planung",
    input.budget ?? 0,
    input.startDate ?? "",
    input.endDate ?? "",
    input.notes ?? "",
    ts,
    ts,
  );
  return getProject(id);
}

export function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Project {
  const current = getProject(id);
  const merged = { ...current, ...input };
  db.prepare(
    `UPDATE projects SET
      customerId = ?, name = ?, description = ?, status = ?,
      budget = ?, startDate = ?, endDate = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
  ).run(
    merged.customerId,
    merged.name,
    merged.description,
    merged.status,
    merged.budget,
    merged.startDate,
    merged.endDate,
    merged.notes,
    now(),
    id,
  );
  return getProject(id);
}

export function deleteProject(id: string): void {
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
}

export function listProjectsByCustomer(customerId: string): Project[] {
  return db
    .prepare("SELECT * FROM projects WHERE customerId = ? ORDER BY updatedAt DESC")
    .all(customerId) as unknown as Project[];
}

// ---------- Activities ----------

export function listActivities(leadId: string): Activity[] {
  return db
    .prepare("SELECT * FROM activities WHERE leadId = ? ORDER BY date DESC")
    .all(leadId) as unknown as Activity[];
}

export function createActivity(input: ActivityInput): Activity {
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO activities
      (id, leadId, type, subject, description, date, duration, outcome, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.leadId,
    input.type ?? "note",
    input.subject,
    input.description ?? "",
    input.date,
    input.duration ?? 0,
    input.outcome ?? "",
    ts,
  );
  return db
    .prepare("SELECT * FROM activities WHERE id = ?")
    .get(id) as unknown as Activity;
}

export function deleteActivity(id: string): void {
  db.prepare("DELETE FROM activities WHERE id = ?").run(id);
}

// ---------- Campaigns ----------

export function listCampaigns(): Campaign[] {
  return db
    .prepare("SELECT * FROM campaigns ORDER BY updatedAt DESC")
    .all() as unknown as Campaign[];
}

function getCampaign(id: string): Campaign {
  const c = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as
    unknown as Campaign | undefined;
  if (!c) throw new Error(`Kampagne ${id} nicht gefunden`);
  return c;
}

export function createCampaign(input: CampaignInput): Campaign {
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO campaigns
      (id, name, channel, status, budget, startDate, endDate, goal, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.channel ?? "sonstige",
    input.status ?? "geplant",
    input.budget ?? 0,
    input.startDate ?? "",
    input.endDate ?? "",
    input.goal ?? "",
    input.notes ?? "",
    ts,
    ts,
  );
  return getCampaign(id);
}

export function updateCampaign(
  id: string,
  input: Partial<CampaignInput>,
): Campaign {
  const merged = { ...getCampaign(id), ...input };
  db.prepare(
    `UPDATE campaigns SET
      name = ?, channel = ?, status = ?, budget = ?, startDate = ?,
      endDate = ?, goal = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
  ).run(
    merged.name,
    merged.channel,
    merged.status,
    merged.budget,
    merged.startDate,
    merged.endDate,
    merged.goal,
    merged.notes,
    now(),
    id,
  );
  return getCampaign(id);
}

export function deleteCampaign(id: string): void {
  // Verknuepfte Leads loesen (nicht loeschen), dann Kampagne entfernen.
  db.prepare("UPDATE leads SET campaignId = '' WHERE campaignId = ?").run(id);
  db.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
}
