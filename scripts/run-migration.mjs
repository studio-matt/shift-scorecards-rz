// Run the migration via API
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000'

async function runMigration() {
  console.log(`Calling migration API at ${BASE_URL}/api/admin/migrate-responses...`)
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/migrate-responses`, {
      method: 'POST',
    })
    
    const result = await response.json()
    console.log('Migration result:', JSON.stringify(result, null, 2))
    
    if (!response.ok) {
      console.error('Migration failed with status:', response.status)
      process.exit(1)
    }
    
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Failed to call migration API:', error)
    process.exit(1)
  }
}

runMigration()
