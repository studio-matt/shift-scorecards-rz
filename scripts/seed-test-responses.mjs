/**
 * Seed Test Responses Script
 * 
 * This script creates test scorecard responses for all users in the system
 * for the existing scorecard template.
 * 
 * Usage: node scripts/seed-test-responses.mjs
 * 
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON file,
 * OR run from a Firebase-authenticated environment.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase project config
const FIREBASE_PROJECT_ID = 'shift-fe6e9';

// Initialize Firebase Admin
let app;
if (getApps().length === 0) {
  // Try to initialize with default credentials (works in GCP or with GOOGLE_APPLICATION_CREDENTIALS)
  try {
    app = initializeApp({
      projectId: FIREBASE_PROJECT_ID,
    });
  } catch (e) {
    console.error('Failed to initialize Firebase Admin. Make sure you have proper credentials set up.');
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS env var to point to your service account JSON file.');
    process.exit(1);
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  TEMPLATES: 'templates',
  SCHEDULES: 'schedules',
  RESPONSES: 'responses',
};

// Helper to generate random scale value (1-10)
function randomScale(min = 1, max = 10) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to generate random text response
function randomTextResponse() {
  const responses = [
    "Used AI to automate data entry tasks, saving significant time on weekly reports.",
    "Implemented AI-powered code suggestions which reduced debugging time.",
    "Leveraged ChatGPT for drafting customer communications.",
    "Used AI tools for meeting summaries and action item extraction.",
    "Automated repetitive Excel formulas using AI assistance.",
    "AI helped with research and documentation tasks.",
    "Used Copilot for code generation on routine tasks.",
    "AI-assisted email drafting improved response quality.",
    "Implemented AI for data analysis and visualization.",
    "Used AI for brainstorming and ideation sessions.",
    "Automated scheduling tasks with AI integration.",
    "AI helped optimize workflow processes.",
    "Used machine learning for predictive analytics.",
    "Implemented AI chatbot for internal queries.",
    "AI-powered search improved document retrieval.",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Helper to get the Monday of the current week
function getCurrentWeekOf() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// Generate answers based on template questions
function generateAnswers(questions) {
  const answers = {};
  
  for (const question of questions) {
    switch (question.type) {
      case 'scale':
      case 'confidence':
        // Scale questions (1-10 or custom range)
        const min = question.scaleMin ?? 1;
        const max = question.scaleMax ?? 10;
        answers[question.id] = randomScale(min, max);
        break;
        
      case 'number':
        // Number questions - random hours saved (1-40)
        answers[question.id] = randomScale(1, 40);
        break;
        
      case 'text':
        // Text questions
        answers[question.id] = randomTextResponse();
        break;
        
      case 'multichoice':
        // Pick a random option
        if (question.options && question.options.length > 0) {
          const randomIndex = Math.floor(Math.random() * question.options.length);
          answers[question.id] = question.options[randomIndex].value;
        }
        break;
        
      default:
        // Default to scale for unknown types
        answers[question.id] = randomScale(1, 10);
    }
  }
  
  return answers;
}

async function main() {
  console.log('🚀 Starting seed script...\n');

  try {
    // 1. Get all templates
    console.log('📋 Fetching templates...');
    const templatesSnapshot = await db.collection(COLLECTIONS.TEMPLATES).get();
    const templates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`   Found ${templates.length} template(s)`);

    if (templates.length === 0) {
      console.error('❌ No templates found in the system. Please create a scorecard template first.');
      process.exit(1);
    }

    // Use the first template (the only one that exists)
    const template = templates[0];
    console.log(`   Using template: "${template.name}" (${template.id})`);
    console.log(`   Questions: ${template.questions?.length || 0}`);

    // 2. Get active release (if any)
    console.log('\n📅 Fetching active release...');
    const schedulesSnapshot = await db.collection(COLLECTIONS.SCHEDULES).get();
    const schedules = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const activeRelease = schedules.find(s => s.status === 'active');
    
    if (activeRelease) {
      console.log(`   Found active release: ${activeRelease.id}`);
    } else {
      console.log('   No active release found (responses will be created without a releaseId)');
    }

    // 3. Get all users
    console.log('\n👥 Fetching users...');
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`   Found ${users.length} user(s)`);

    if (users.length === 0) {
      console.error('❌ No users found in the system.');
      process.exit(1);
    }

    // 4. Get existing responses to avoid duplicates
    console.log('\n🔍 Checking for existing responses...');
    const responsesSnapshot = await db.collection(COLLECTIONS.RESPONSES)
      .where('templateId', '==', template.id)
      .get();
    const existingResponses = responsesSnapshot.docs.map(doc => doc.data());
    const usersWithResponses = new Set(existingResponses.map(r => r.userId));
    console.log(`   Found ${existingResponses.length} existing response(s)`);

    // 5. Create responses for users who don't have one
    const weekOf = getCurrentWeekOf();
    console.log(`\n📝 Creating test responses for week of ${weekOf}...`);
    
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Skip if user already has a response
      if (usersWithResponses.has(user.id)) {
        console.log(`   ⏭️  Skipping ${user.firstName} ${user.lastName} (already has response)`);
        skipped++;
        continue;
      }

      // Generate random answers
      const answers = generateAnswers(template.questions || []);
      
      // Create response document
      const response = {
        templateId: template.id,
        releaseId: activeRelease?.id || null,
        userId: user.id,
        organizationId: user.organizationId,
        answers,
        completedAt: new Date().toISOString(),
        weekOf,
        createdAt: new Date().toISOString(),
      };

      await db.collection(COLLECTIONS.RESPONSES).add(response);
      console.log(`   ✅ Created response for ${user.firstName} ${user.lastName}`);
      created++;
    }

    console.log(`\n🎉 Done!`);
    console.log(`   Created: ${created} response(s)`);
    console.log(`   Skipped: ${skipped} user(s) (already had responses)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

main();
