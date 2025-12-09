import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const { id } = req.query;
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.POSTGRES_URL);
    
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
    console.error('Error deleting entry:', error);
    return res.status(500).json({ error: error.message });
  }
}