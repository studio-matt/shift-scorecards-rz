import type {
  User,
  Organization,
  ScorecardTemplate,
  ScorecardQuestion,
  TopPerformer,
  DepartmentPerformance,
  WeeklyTrend,
  QuestionResult,
} from "./types"

export const KNOWN_DEPARTMENTS = [
  "Engineering",
  "Sales",
  "Marketing",
  "Operations",
  "HR",
  "Finance",
  "Product",
  "Customer Success",
  "Legal",
  "IT",
  "Design",
  "Executive",
  "Web",
  "Grounds",
  "Deliveries",
  "Logistics",
  "Accounting",
  "R&D",
  "Quality Assurance",
  "Procurement",
  "Facilities",
  "Communications",
  "Training",
  "Administration",
]

export const mockOrganization: Organization = {
  id: "org-1",
  name: "Acme Corp",
  departments: [
    "Engineering",
    "Sales",
    "Marketing",
    "Operations",
    "HR",
    "Product",
  ],
  createdAt: "2024-01-15",
  website: "https://www.acmecorp.com",
  contactEmail: "admin@acmecorp.com",
  industry: "Technology",
  memberCount: 42,
}

export const mockOrganizations: Organization[] = [
  mockOrganization,
  {
    id: "org-2",
    name: "Globex Industries",
    departments: ["Engineering", "Sales", "Marketing", "Finance", "Legal", "Web", "Deliveries"],
    createdAt: "2024-03-01",
    website: "https://www.globex.com",
    contactEmail: "info@globex.com",
    industry: "Consulting",
    memberCount: 68,
  },
  {
    id: "org-3",
    name: "Initech LLC",
    departments: ["IT", "Operations", "HR", "Customer Success", "Executive", "Grounds", "Facilities"],
    createdAt: "2024-06-10",
    website: "https://www.initech.com",
    contactEmail: "support@initech.com",
    industry: "Finance",
    memberCount: 35,
  },
  {
    id: "org-4",
    name: "Umbrella Group",
    departments: ["R&D", "Marketing", "Logistics", "Procurement", "Quality Assurance"],
    createdAt: "2024-09-20",
    website: "https://www.umbrellagroup.com",
    contactEmail: "hello@umbrellagroup.com",
    industry: "Healthcare",
    memberCount: 52,
  },
  {
    id: "org-5",
    name: "Stark Solutions",
    departments: ["Engineering", "Design", "Web", "Communications", "Training"],
    createdAt: "2025-01-05",
    website: "https://www.starksolutions.com",
    contactEmail: "team@starksolutions.com",
    industry: "Education",
    memberCount: 28,
  },
]

export const mockAdminUser: User = {
  id: "user-admin",
  email: "john.smith@company.com",
  firstName: "John",
  lastName: "Smith",
  role: "admin",
  department: "Product",
  jobTitle: "Product Manager",
  phone: "+1 (555) 123-4567",
  organizationId: "org-1",
  createdAt: "2024-01-01",
  lastLogin: "2025-01-27",
}

export const mockRegularUser: User = {
  id: "user-regular",
  email: "sarah.chen@company.com",
  firstName: "Sarah",
  lastName: "Chen",
  role: "user",
  department: "Engineering",
  jobTitle: "Software Engineer",
  phone: "+1 (555) 987-6543",
  organizationId: "org-1",
  createdAt: "2024-03-15",
  lastLogin: "2025-01-27",
}

export const mockQuestions: ScorecardQuestion[] = [
  {
    id: "q1",
    text: "On average, how many emails do you write per day?",
    type: "number",
    order: 1,
  },
  {
    id: "q2",
    text: "How much time do you save per week using AI to draft, reply to, or manage emails?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    order: 2,
  },
  {
    id: "q3",
    text: "Before AI, how many minutes did each email take to draft (on average)?",
    type: "number",
    order: 3,
  },
  {
    id: "q4",
    text: "After AI, how many minutes does each email take to draft (on average)?",
    type: "number",
    order: 4,
  },
  {
    id: "q5",
    text: "How many minutes do you spend editing AI-generated email drafts (on average)?",
    type: "number",
    order: 5,
  },
  {
    id: "q6",
    text: "On average, how many meetings do you attend each week?",
    type: "number",
    order: 6,
  },
  {
    id: "q7",
    text: "How much time do you save per week using AI to create meeting preparation & agendas?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    order: 7,
  },
  {
    id: "q8",
    text: "How much time do you save per week using AI to create meeting follow up?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    order: 8,
  },
  {
    id: "q9",
    text: "How much time do you save per week using AI to review documents, contracts, or reports?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    order: 9,
  },
  {
    id: "q10",
    text: "How much time do you save per week using AI to prepare documents and deliverables?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    order: 10,
  },
  {
    id: "q11",
    text: "How much time do you save per week using AI for research and data analysis?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    order: 11,
  },
  {
    id: "q12",
    text: "How much time do you save per week using AI to summarize long documents or communication threads?",
    type: "scale",
    scaleMin: 0,
    scaleMax: 10,
    order: 12,
  },
  {
    id: "q13",
    text: "What's your biggest AI win this month?",
    type: "text",
    order: 13,
  },
  {
    id: "q14",
    text: "What's your next AI goal?",
    type: "text",
    order: 14,
  },
]

export const mockTemplate: ScorecardTemplate = {
  id: "tmpl-1",
  name: "AI Productivity Scorecard",
  description:
    "Complete the questionnaire to track your AI productivity gains over time",
  questions: mockQuestions,
  createdBy: "user-admin",
  createdAt: "2025-01-01",
}

export const mockTopPerformers: TopPerformer[] = [
  {
    id: "1",
    name: "Sarah Chen",
    department: "Engineering",
    avgScore: 9.2,
    streak: 15,
  },
  {
    id: "2",
    name: "Mike Rodriguez",
    department: "Sales",
    avgScore: 9.0,
    streak: 12,
  },
  {
    id: "3",
    name: "Emma Thompson",
    department: "Marketing",
    avgScore: 8.8,
    streak: 10,
  },
  {
    id: "4",
    name: "David Park",
    department: "Operations",
    avgScore: 8.6,
    streak: 8,
  },
  {
    id: "5",
    name: "Lisa Williams",
    department: "HR",
    avgScore: 8.5,
    streak: 9,
  },
]

export const mockDepartmentPerformance: DepartmentPerformance[] = [
  { department: "Engineering", avgScore: 8.7, participants: 24, trend: 0.5 },
  { department: "Sales", avgScore: 8.4, participants: 18, trend: 0.3 },
  { department: "Marketing", avgScore: 8.1, participants: 15, trend: 0.2 },
  { department: "Operations", avgScore: 7.9, participants: 12, trend: 0.4 },
  { department: "HR", avgScore: 8.0, participants: 8, trend: 0.6 },
  { department: "Product", avgScore: 8.3, participants: 10, trend: 0.3 },
]

export const mockWeeklyTrends: WeeklyTrend[] = [
  { week: "Week 1", score: 7.2 },
  { week: "Week 2", score: 7.5 },
  { week: "Week 3", score: 7.8 },
  { week: "Week 4", score: 7.6 },
  { week: "Week 5", score: 8.0 },
  { week: "Week 6", score: 8.2 },
  { week: "Week 7", score: 8.1 },
  { week: "Week 8", score: 8.4 },
  { week: "Week 9", score: 8.3 },
  { week: "Week 10", score: 8.5 },
  { week: "Week 11", score: 8.6 },
  { week: "Week 12", score: 8.4 },
]

export const mockQuestionResults: QuestionResult[] = [
  {
    question: "How effective were your meetings this week?",
    score: 8.3,
    change: 0.5,
  },
  {
    question: "How manageable was your email volume?",
    score: 8.5,
    change: 0.8,
  },
  {
    question: "Rate your document workflow efficiency",
    score: 7.8,
    change: 0.3,
  },
  {
    question: "How satisfied are you with team collaboration?",
    score: 8.6,
    change: 0.4,
  },
]

export const mockMostImproved = [
  {
    name: "Alex Johnson",
    department: "Engineering",
    improvement: 1.8,
    from: 6.2,
    to: 8.0,
  },
  {
    name: "Rachel Green",
    department: "Sales",
    improvement: 1.5,
    from: 6.8,
    to: 8.3,
  },
  {
    name: "Tom Wilson",
    department: "Operations",
    improvement: 1.2,
    from: 7.0,
    to: 8.2,
  },
]

export const mockRecentScorecards = [
  { name: "Weekly Check-in #12", date: "Jan 20, 2025", score: 8.4 },
  { name: "Weekly Check-in #11", date: "Jan 13, 2025", score: 8.1 },
  { name: "Weekly Check-in #10", date: "Jan 6, 2025", score: 7.9 },
]

export const mockGoals = [
  { text: "Complete project proposal", status: "completed" as const },
  { text: "Review team feedback", status: "completed" as const },
  { text: "Attend training session", status: "completed" as const },
  { text: "Update documentation", status: "completed" as const },
  { text: "Schedule 1-on-1s", status: "completed" as const },
  { text: "Finalize Q1 roadmap", status: "in-progress" as const },
  { text: "Client presentation prep", status: "not-started" as const },
]

export const mockInvitedUsers = [
  {
    email: "alice@company.com",
    name: "Alice Brown",
    status: "accepted" as const,
  },
  {
    email: "bob@company.com",
    name: "Bob Martinez",
    status: "pending" as const,
  },
  {
    email: "carol@company.com",
    name: "Carol Davis",
    status: "accepted" as const,
  },
  {
    email: "dan@company.com",
    name: "Dan Lee",
    status: "pending" as const,
  },
]

export const mockPastScorecards = [
  {
    id: "sc-1",
    weekOf: "2025-01-20",
    completedAt: "2025-01-24",
    score: 8.4,
    answers: {
      q1: 25,
      q2: 8,
      q3: 5,
      q4: 2,
      q5: 1,
      q6: 12,
      q7: 7,
      q8: 8,
      q9: 9,
      q10: 7,
      q11: 8,
      q12: 9,
      q13: "Used AI to automate weekly reporting, saving 3 hours.",
      q14: "Explore AI-powered code review tools.",
    },
  },
  {
    id: "sc-2",
    weekOf: "2025-01-13",
    completedAt: "2025-01-17",
    score: 8.1,
    answers: {
      q1: 22,
      q2: 7,
      q3: 6,
      q4: 3,
      q5: 2,
      q6: 10,
      q7: 6,
      q8: 7,
      q9: 8,
      q10: 7,
      q11: 7,
      q12: 8,
      q13: "Set up AI meeting summaries for all standups.",
      q14: "Integrate AI into document review pipeline.",
    },
  },
  {
    id: "sc-3",
    weekOf: "2025-01-06",
    completedAt: "2025-01-10",
    score: 7.9,
    answers: {
      q1: 20,
      q2: 6,
      q3: 6,
      q4: 3,
      q5: 2,
      q6: 11,
      q7: 5,
      q8: 6,
      q9: 7,
      q10: 6,
      q11: 7,
      q12: 7,
      q13: "Drafted client proposals 2x faster with AI.",
      q14: "Learn prompt engineering best practices.",
    },
  },
  {
    id: "sc-4",
    weekOf: "2024-12-30",
    completedAt: "2025-01-03",
    score: 7.6,
    answers: {
      q1: 18,
      q2: 5,
      q3: 7,
      q4: 4,
      q5: 3,
      q6: 9,
      q7: 5,
      q8: 5,
      q9: 6,
      q10: 6,
      q11: 6,
      q12: 6,
      q13: "Started using AI for email triage and prioritization.",
      q14: "Automate more repetitive tasks with AI workflows.",
    },
  },
  {
    id: "sc-5",
    weekOf: "2024-12-23",
    completedAt: "2024-12-27",
    score: 7.2,
    answers: {
      q1: 15,
      q2: 4,
      q3: 7,
      q4: 5,
      q5: 3,
      q6: 8,
      q7: 4,
      q8: 4,
      q9: 5,
      q10: 5,
      q11: 5,
      q12: 5,
      q13: "First week using AI tools consistently.",
      q14: "Get comfortable with AI writing assistants.",
    },
  },
]

export const mockSavedTemplates = [
  { id: "t1", name: "Weekly Check-in", questions: 5, author: "Admin User" },
  { id: "t2", name: "Monthly Review", questions: 8, author: "Admin User" },
  {
    id: "t3",
    name: "AI Productivity Scorecard",
    questions: 14,
    author: "Admin User",
  },
]

export const mockAllUsers = [
  {
    id: "u1",
    name: "Sarah Johnson",
    department: "Product Team",
    selected: true,
  },
  {
    id: "u2",
    name: "Michael Chen",
    department: "Engineering",
    selected: true,
  },
  { id: "u3", name: "Emily Davis", department: "Marketing", selected: false },
  {
    id: "u4",
    name: "David Wilson",
    department: "Product Team",
    selected: false,
  },
  {
    id: "u5",
    name: "Lisa Anderson",
    department: "Engineering",
    selected: true,
  },
]
