import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { shop, flavor, date, notes, person } = req.body;

    if (!shop || !flavor || !date || !person) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = neon(process.env.POSTGRES_URL);

    const result = await sql`
      INSERT INTO entries (shop, flavor, date, notes, person)
      VALUES (${shop}, ${flavor.trim()}, ${date}, ${notes || ''}, ${person})
      RETURNING id, shop, flavor, date, notes, person,
                TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as timestamp
    `;

    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating entry:', error);
    return res.status(500).json({ error: error.message });
  }
}