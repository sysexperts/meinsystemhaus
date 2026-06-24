import type { LeadInput, CustomerInput } from "../../src/shared/types";

export const seedLeads: LeadInput[] = [
  { company: "Bäckerei Köhler GmbH", contact: "Anna Köhler", email: "a.koehler@beispiel.de", phone: "0421 110011", value: 4800, stage: "neu", source: "empfehlung", rating: "warm", owner: "MS", followUpDate: "", probability: 30, competitor: "", notes: "" },
  { company: "Steuerkanzlei Brandt", contact: "Tobias Brandt", email: "brandt@beispiel.de", phone: "089 220022", value: 12500, stage: "neu", source: "website", rating: "hot", owner: "MS", followUpDate: "", probability: 60, competitor: "", notes: "" },
  { company: "Autohaus Vogt", contact: "Sandra Vogt", email: "vogt@beispiel.de", phone: "0711 330033", value: 8900, stage: "kontaktiert", source: "messe", rating: "warm", owner: "JK", followUpDate: "", probability: 40, competitor: "", notes: "" },
  { company: "Praxis Dr. Lehmann", contact: "Dr. Lehmann", email: "praxis@beispiel.de", phone: "0221 440044", value: 6200, stage: "kontaktiert", source: "kaltakquise", rating: "cold", owner: "MS", followUpDate: "", probability: 20, competitor: "", notes: "" },
  { company: "Logistik Weber KG", contact: "Frank Weber", email: "weber@beispiel.de", phone: "040 550055", value: 21000, stage: "angebot", source: "empfehlung", rating: "hot", owner: "JK", followUpDate: "", probability: 70, competitor: "IT-Service Plus", notes: "" },
  { company: "Hotel Seeblick", contact: "Maria Funk", email: "funk@beispiel.de", phone: "07531 660066", value: 15400, stage: "angebot", source: "website", rating: "warm", owner: "MS", followUpDate: "", probability: 50, competitor: "", notes: "" },
  { company: "Schreinerei Holzwerk", contact: "Peter Holz", email: "holz@beispiel.de", phone: "0531 770077", value: 7300, stage: "verhandlung", source: "messe", rating: "hot", owner: "JK", followUpDate: "", probability: 80, competitor: "TechComp", notes: "" },
  { company: "Apotheke am Markt", contact: "Julia Stein", email: "stein@beispiel.de", phone: "0911 880088", value: 9800, stage: "gewonnen", source: "empfehlung", rating: "hot", owner: "MS", followUpDate: "", probability: 100, competitor: "", notes: "" },
];

export const seedCustomers: CustomerInput[] = [
  { name: "Logistik Weber KG", contact: "Frank Weber", email: "weber@beispiel.de", phone: "040 550055", street: "Hafenstr. 12", zip: "20457", city: "Hamburg", notes: "", status: "aktiv" },
  { name: "Steuerkanzlei Brandt", contact: "Tobias Brandt", email: "brandt@beispiel.de", phone: "089 220022", street: "Leopoldstr. 5", zip: "80802", city: "München", notes: "", status: "aktiv" },
  { name: "Praxis Dr. Lehmann", contact: "Dr. Lehmann", email: "praxis@beispiel.de", phone: "0221 440044", street: "Ringstr. 8", zip: "50667", city: "Köln", notes: "", status: "aktiv" },
  { name: "Autohaus Vogt", contact: "Sandra Vogt", email: "vogt@beispiel.de", phone: "0711 330033", street: "Industrieweg 3", zip: "70565", city: "Stuttgart", notes: "", status: "aktiv" },
  { name: "Hotel Seeblick", contact: "Maria Funk", email: "funk@beispiel.de", phone: "07531 660066", street: "Seepromenade 1", zip: "78462", city: "Konstanz", notes: "", status: "aktiv" },
  { name: "Bäckerei Köhler GmbH", contact: "Anna Köhler", email: "a.koehler@beispiel.de", phone: "0421 110011", street: "Marktplatz 4", zip: "28195", city: "Bremen", notes: "", status: "interessent" },
];
