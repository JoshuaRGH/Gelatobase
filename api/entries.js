import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.POSTGRES_URL);
    
    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        shop TEXT NOT NULL,
        flavor TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        person TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Get all entries
    const result = await sql`
      SELECT id, shop, flavor, date, notes, person, 
             TO_CHAR(timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as timestamp
      FROM entries 
      ORDER BY timestamp DESC
    `;
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching entries:', error);
    return res.status(500).json({ error: error.message });
  }
}