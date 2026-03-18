// Run seed endpoint to populate database with March 2026 dates
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000'

async function runSeed() {
  console.log(`Calling seed endpoint at ${BASE_URL}/api/seed?force=true`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/seed?force=true`, {
      method: 'POST',
    })
    
    const data = await response.json()
    console.log('Seed result:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error running seed:', error.message)
  }
}

runSeed()
