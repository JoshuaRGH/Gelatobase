import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.POSTGRES_URL);
  
  // GET all entries
  if (req.method === 'GET') {
    try {
      const result = await sql`
        SELECT id, shop, flavor, date, notes, person,
               TO_CHAR(timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as timestamp
        FROM entries
        ORDER BY timestamp DESC
      `;
      return res.status(200).json(result);
    } catch (error) {
      console.error('GET Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // POST new entry
  if (req.method === 'POST') {
    try {
      const { shop, flavor, date, notes, person } = req.body;
      
      if (!shop || !flavor || !date || !person) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const result = await sql`
        INSERT INTO entries (shop, flavor, date, notes, person)
        VALUES (${shop}, ${flavor.trim()}, ${date}, ${notes || ''}, ${person})
        RETURNING id, shop, flavor, date, notes, person,
                  TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as timestamp
      `;
      
      return res.status(201).json(result[0]);
    } catch (error) {
      console.error('POST Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // DELETE entry by ID (using query parameter ?id=123)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing entry ID' });
      }
      
      const result = await sql`
        DELETE FROM entries 
        WHERE id = ${parseInt(id)}
        RETURNING id
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      
      return res.status(200).json({ deleted: true, id: parseInt(id) });
    } catch (error) {
      console.error('DELETE Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}