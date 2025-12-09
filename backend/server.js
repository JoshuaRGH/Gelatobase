const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

// Create / open SQLite database
const db = new sqlite3.Database('./icecream.db');

db.run(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop TEXT,
    flavor TEXT,
    date TEXT,
    notes TEXT,
    person TEXT,
    timestamp TEXT
  )
`);

// Get all entries
app.get('/entries', (req, res) => {
  db.all("SELECT * FROM entries ORDER BY timestamp DESC", [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add new entry
app.post('/entries', (req, res) => {
  const { shop, flavor, date, rating, notes, person } = req.body;
  const timestamp = new Date().toISOString();
  
  db.run(
  `INSERT INTO entries (shop, flavor, date, notes, person, timestamp)
   VALUES (?, ?, ?, ?, ?, ?)`,
  [shop, flavor, date, notes, person, timestamp],
  function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      id: this.lastID, 
      shop, 
      flavor, 
      date, 
      notes, 
      person, 
      timestamp 
    });
  }
 );
});

// Delete entry
app.delete('/entries/:id', (req, res) => {
  db.run("DELETE FROM entries WHERE id = ?", req.params.id, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ deleted: this.changes });
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📁 Database: icecream.db`);
});