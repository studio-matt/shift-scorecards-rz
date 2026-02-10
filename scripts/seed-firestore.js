import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_FPvDabLJFkD_fecfKQJw8YFptLEIxgQ",
  authDomain: "shift-fe6e9.firebaseapp.com",
  projectId: "shift-fe6e9",
  storageBucket: "shift-fe6e9.appspot.com",
  messagingSenderId: "160061885682",
  appId: "1:160061885682:web:d01a65e90002974936146b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const now = Timestamp.now();

// ─── Organizations ────────────────────────────────────────────────────
const organizations = [
  {
    id: "org-1",
    name: "Acme Corp",
    departments: ["Engineering", "Sales", "Marketing", "Operations", "HR", "Product"],
    website: "https://www.acmecorp.com",
    contactEmail: "admin@acmecorp.com",
    industry: "Technology",
    memberCount: 42,
  },
  {
    id: "org-2",
    name: "Globex Industries",
    departments: ["Engineering", "Sales", "Marketing", "Finance", "Legal", "Web", "Deliveries"],
    website: "https://www.globex.com",
    contactEmail: "info@globex.com",
    industry: "Consulting",
    memberCount: 68,
  },
  {
    id: "org-3",
    name: "Initech LLC",
    departments: ["IT", "Operations", "HR", "Customer Success", "Executive", "Grounds", "Facilities"],
    website: "https://www.initech.com",
    contactEmail: "support@initech.com",
    industry: "Finance",
    memberCount: 35,
  },
];

// ─── Templates ────────────────────────────────────────────────────────
const templates = [
  {
    id: "tmpl-1",
    name: "AI Productivity Scorecard",
    description: "Weekly assessment of AI tool adoption and productivity impact across your team.",
    status: "active",
    questions: [
      { id: "q1", text: "How many hours did you use AI tools this week?", type: "number", order: 1 },
      { id: "q2", text: "Rate the quality of AI-generated outputs (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 2 },
      { id: "q3", text: "How many tasks did you complete without AI?", type: "number", order: 3 },
      { id: "q4", text: "How many tasks were fully automated by AI?", type: "number", order: 4 },
      { id: "q5", text: "How many AI tools did you use this week?", type: "number", order: 5 },
      { id: "q6", text: "Estimated hours saved by using AI tools", type: "number", order: 6 },
      { id: "q7", text: "Rate AI's impact on your decision-making (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 7 },
      { id: "q8", text: "Rate AI's impact on collaboration (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 8 },
      { id: "q9", text: "Rate your overall AI confidence (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 9 },
      { id: "q10", text: "Rate AI's impact on work quality (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 10 },
      { id: "q11", text: "Rate AI's impact on creativity (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 11 },
      { id: "q12", text: "Overall AI productivity score (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 12 },
      { id: "q13", text: "Describe your biggest AI win this week", type: "text", order: 13 },
      { id: "q14", text: "What AI goal are you setting for next week?", type: "text", order: 14 },
    ],
    createdBy: "system",
  },
  {
    id: "tmpl-2",
    name: "Team Wellness Check",
    description: "Monthly wellness and engagement survey for team morale tracking.",
    status: "draft",
    questions: [
      { id: "tw1", text: "Rate your overall job satisfaction (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 1 },
      { id: "tw2", text: "Rate your work-life balance (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 2 },
      { id: "tw3", text: "Rate team communication (1-10)", type: "scale", scaleMin: 1, scaleMax: 10, order: 3 },
      { id: "tw4", text: "What would improve your work experience?", type: "text", order: 4 },
    ],
    createdBy: "system",
  },
];

// ─── Seed Function ────────────────────────────────────────────────────
async function seed() {
  console.log("Checking if Firestore already has data...");
  const orgSnap = await getDocs(collection(db, "organizations"));
  if (!orgSnap.empty) {
    console.log(`Firestore already has ${orgSnap.size} organizations. Skipping seed to avoid duplicates.`);
    console.log("If you want to re-seed, delete the collections in Firebase Console first.");
    return;
  }

  console.log("Seeding organizations...");
  for (const org of organizations) {
    const { id, ...data } = org;
    await setDoc(doc(db, "organizations", id), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  Created org: ${org.name}`);
  }

  console.log("Seeding templates...");
  for (const tmpl of templates) {
    const { id, ...data } = tmpl;
    await setDoc(doc(db, "templates", id), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  Created template: ${tmpl.name}`);
  }

  console.log("Seed complete! Your Firestore now has:");
  console.log(`  - ${organizations.length} organizations`);
  console.log(`  - ${templates.length} templates`);
  console.log("Sign in via the app to create your user profile automatically.");
}

seed().catch(console.error);
