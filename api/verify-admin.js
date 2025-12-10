export default async function handler(req, res) {
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Password is required' 
      });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable not set');
      return res.status(500).json({ 
        valid: false, 
        error: 'Admin authentication not configured' 
      });
    }

    // Simple comparison (consider using bcrypt for hashed passwords in production)
    const isValid = password === adminPassword;
    
    if (isValid) {
      return res.status(200).json({ 
        valid: true,
        message: 'Authentication successful'
      });
    } else {
      return res.status(401).json({ 
        valid: false,
        error: 'Invalid password' 
      });
    }
    
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(500).json({ 
      valid: false, 
      error: 'Internal server error' 
    });
  }
}