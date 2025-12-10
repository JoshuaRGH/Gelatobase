import React, { useState, useEffect } from 'react';

const IceCreamTracker = () => {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    shop: 'Joelato',
    flavours: [''],
    date: new Date().toISOString().split('T')[0],
    notes: '',
    person: ''
  });
  const [filter, setFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    loadEntries();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/entries');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Error loading entries:', error);
      setError('Could not connect to database. Using mock data.');
      
      const mockData = [
        { id: 1, flavour: "Chocolate", shop: "Joelato", person: "Demo", date: "2024-01-15", timestamp: new Date().toISOString(), notes: "Sample entry" },
        { id: 2, flavour: "Vanilla", shop: "Mary's Milk Bar", person: "Demo", date: "2024-01-14", timestamp: new Date().toISOString(), notes: "Another sample" }
      ];
      setEntries(mockData);
      
      try {
        const result = await window.storage?.get('ice-cream-entries');
        if (result) {
          setEntries(JSON.parse(result.value));
        }
      } catch (localError) {
        console.log('No existing entries found');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setIsAdmin(true);
        setShowAdminPrompt(false);
        setAdminPassword('');
      } else {
        setError('Incorrect admin password');
        setAdminPassword('');
      }
    } catch (error) {
      console.error('Error verifying admin:', error);
      setError('Could not verify admin password');
      setAdminPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
  };

  const addFlavourField = () => {
    setFormData({
      ...formData,
      flavours: [...formData.flavours, '']
    });
  };

  const removeFlavourField = (index) => {
    const newFlavours = [...formData.flavours];
    newFlavours.splice(index, 1);
    setFormData({
      ...formData,
      flavours: newFlavours
    });
  };

  const updateFlavour = (index, value) => {
    const newFlavours = [...formData.flavours];
    newFlavours[index] = value;
    setFormData({
      ...formData,
      flavours: newFlavours
    });
  };

  const handleSubmit = async () => {
    const nonEmptyFlavours = formData.flavours.filter(flavour => flavour.trim() !== '');
    
    if (nonEmptyFlavours.length === 0 || !formData.person) {
      setError('Please fill in at least one flavour and your name');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const savedEntries = [];
      for (const flavour of nonEmptyFlavours) {
        const entryToSave = {
          shop: formData.shop,
          flavour: flavour.trim(),
          date: formData.date,
          notes: formData.notes,
          person: formData.person
        };
        
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entryToSave),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const savedEntry = await response.json();
        savedEntries.push(savedEntry);
      }
      
      const updatedEntries = [...savedEntries, ...entries];
      setEntries(updatedEntries);
      
      try {
        if (window.storage) {
          await window.storage.set('ice-cream-entries', JSON.stringify(updatedEntries));
        }
      } catch (storageError) {
        console.log('Could not save to local storage:', storageError);
      }
      
      setFormData({
        shop: 'Joelato',
        flavours: [''],
        date: new Date().toISOString().split('T')[0],
        notes: '',
        person: ''
      });
      setShowForm(false);
      
    } catch (error) {
      console.error('Error saving entries:', error);
      setError('Failed to save to database. Saving locally.');
      
      const localEntries = nonEmptyFlavours.map((flavour, index) => ({
        shop: formData.shop,
        flavour: flavour.trim(),
        date: formData.date,
        notes: formData.notes,
        person: formData.person,
        id: Date.now() + index,
        timestamp: new Date().toISOString()
      }));
      
      const updatedEntries = [...localEntries, ...entries];
      setEntries(updatedEntries);
      
      try {
        if (window.storage) {
          await window.storage.set('ice-cream-entries', JSON.stringify(updatedEntries));
        }
      } catch (storageError) {
        console.log('Could not save to local storage:', storageError);
      }
      
      setShowForm(false);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!isAdmin) {
      setError('Admin access required to delete entries');
      setShowAdminPrompt(true);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/entries?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedEntries = entries.filter(e => e.id !== id);
      setEntries(updatedEntries);
      
      try {
        if (window.storage) {
          await window.storage.set('ice-cream-entries', JSON.stringify(updatedEntries));
        }
      } catch (storageError) {
        console.log('Could not update local storage:', storageError);
      }
      
    } catch (error) {
      console.error('Error deleting entry:', error);
      setError('Failed to delete from database. Deleting locally.');
      
      const updatedEntries = entries.filter(e => e.id !== id);
      setEntries(updatedEntries);
      
      try {
        if (window.storage) {
          await window.storage.set('ice-cream-entries', JSON.stringify(updatedEntries));
        }
      } catch (storageError) {
        console.log('Could not update local storage:', storageError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    if (filter === 'all') return true;
    return e.shop === filter;
  });

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const groupedEntries = filteredEntries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b) - new Date(a));

  const today = new Date().toISOString().split('T')[0];
  const todaysEntries = entries.filter(e => e.date === today).length;

  // Enhanced Statistics Calculation
  const calculateStats = () => {
    if (entries.length === 0) return null;

    // Shop breakdown
    const shopCounts = entries.reduce((acc, entry) => {
      acc[entry.shop] = (acc[entry.shop] || 0) + 1;
      return acc;
    }, {});

    // Person breakdown
    const personCounts = entries.reduce((acc, entry) => {
      acc[entry.person] = (acc[entry.person] || 0) + 1;
      return acc;
    }, {});

    // Flavour analysis
    const flavourCounts = entries.reduce((acc, entry) => {
      const flavour = entry.flavour.toLowerCase().trim();
      acc[flavour] = (acc[flavour] || 0) + 1;
      return acc;
    }, {});

    // Get top 10 flavours
    const topFlavours = Object.entries(flavourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Most popular shop
    const shopEntries = Object.entries(shopCounts);
    const mostPopularShop = shopEntries.sort((a, b) => b[1] - a[1])[0];

    // Most active taster
    const personEntries = Object.entries(personCounts);
    const mostActiveTaster = personEntries.sort((a, b) => b[1] - a[1])[0];

    // Visits analysis (group by date and person)
    const visitsMap = entries.reduce((acc, entry) => {
      const key = `${entry.date}-${entry.person}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});

    const visitStats = Object.values(visitsMap).map(visit => visit.length);
    const avgFlavoursPerVisit = (visitStats.reduce((a, b) => a + b, 0) / visitStats.length).toFixed(1);

    // Date range analysis
    const dates = entries.map(e => new Date(e.date)).sort((a, b) => a - b);
    const firstVisit = dates[0];
    const lastVisit = dates[dates.length - 1];
    const daysBetween = Math.max(1, Math.floor((lastVisit - firstVisit) / (1000 * 60 * 60 * 24)));

    // Shop comparison
    const joelatoCount = shopCounts['Joelato'] || 0;
    const marysCount = shopCounts["Mary's Milk Bar"] || 0;
    const shopRatio = joelatoCount > 0 ? (marysCount / joelatoCount).toFixed(2) : 'N/A';

    // Flavour variety by shop
    const flavoursByShop = entries.reduce((acc, entry) => {
      if (!acc[entry.shop]) acc[entry.shop] = new Set();
      acc[entry.shop].add(entry.flavour.toLowerCase().trim());
      return acc;
    }, {});

    // Monthly trends
    const monthlyCounts = entries.reduce((acc, entry) => {
      const date = new Date(entry.date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      acc[monthYear] = (acc[monthYear] || 0) + 1;
      return acc;
    }, {});

    // Last 7 days activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentEntries = entries.filter(e => new Date(e.date) >= sevenDaysAgo);
    const recentCount = recentEntries.length;

    // Person preferences (which flavours each person likes most)
    const personFlavours = entries.reduce((acc, entry) => {
      if (!acc[entry.person]) acc[entry.person] = {};
      const flavour = entry.flavour.toLowerCase().trim();
      acc[entry.person][flavour] = (acc[entry.person][flavour] || 0) + 1;
      return acc;
    }, {});

    // Find each person's favorite flavour
    const personFavorites = Object.entries(personFlavours).map(([person, flavours]) => {
      const favorite = Object.entries(flavours).sort((a, b) => b[1] - a[1])[0];
      return { person, favorite: favorite ? favorite[0] : 'None', count: favorite ? favorite[1] : 0 };
    });

    return {
      // Basic stats
      totalFlavours: entries.length,
      uniqueFlavours: new Set(entries.map(e => e.flavour.toLowerCase().trim())).size,
      totalVisits: Object.keys(visitsMap).length,
      
      // Shop stats
      shopCounts,
      mostPopularShop,
      joelatoCount,
      marysCount,
      shopRatio,
      shopComparison: { Joelato: joelatoCount, Marys: marysCount },
      
      // Person stats
      personCounts,
      mostActiveTaster,
      personFavorites,
      
      // Flavour stats
      flavourCounts,
      topFlavours,
      mostCommonFlavour: topFlavours[0] || ['None', 0],
      
      // Visit stats
      avgFlavoursPerVisit,
      maxFlavoursPerVisit: Math.max(...visitStats),
      minFlavoursPerVisit: Math.min(...visitStats),
      medianFlavoursPerVisit: visitStats.sort((a, b) => a - b)[Math.floor(visitStats.length / 2)] || 0,
      
      // Time stats
      firstVisit: firstVisit.toLocaleDateString(),
      lastVisit: lastVisit.toLocaleDateString(),
      daysBetween,
      flavoursPerDay: (entries.length / daysBetween).toFixed(2),
      
      // Advanced stats
      flavoursByShop: Object.fromEntries(
        Object.entries(flavoursByShop).map(([shop, flavours]) => [shop, flavours.size])
      ),
      monthlyCounts,
      recentActivity: recentCount,
      recentPercentage: ((recentCount / entries.length) * 100).toFixed(1),
      
      // For graphs
      shopData: Object.entries(shopCounts),
      topFlavoursData: topFlavours,
      monthlyData: Object.entries(monthlyCounts).slice(-6), // Last 6 months
      personData: Object.entries(personCounts).slice(0, 5), // Top 5 people
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-black text-cyan-400 p-0 m-0" style={{fontFamily: "'Courier New', monospace", fontSize: '16px', lineHeight: '1.2'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        .dos-input {
          background: black;
          color: #00ff00;
          border: 1px solid #008800;
          outline: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 16px;
          padding: 2px 4px;
        }
        .dos-input:focus {
          border-color: #00ff00;
          box-shadow: 0 0 5px #00ff00;
        }
        .dos-input::placeholder {
          color: #008800;
        }
        .dos-select {
          background: black;
          color: #00ff00;
          border: 1px solid #008800;
          outline: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 16px;
          padding: 2px 4px;
        }
        .dos-textarea {
          background: black;
          color: #00ff00;
          border: 1px solid #008800;
          outline: none;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 16px;
          padding: 4px;
          resize: vertical;
          min-height: 60px;
        }
        .blink {
          animation: blink 1s infinite;
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .scanline {
          position: relative;
          overflow: hidden;
        }
        .scanline::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(to bottom, transparent, rgba(0, 255, 0, 0.2), transparent);
          animation: scan 3s linear infinite;
          z-index: 1000;
          pointer-events: none;
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .flavour-tag {
          display: inline-block;
          background: #004400;
          color: #00ff00;
          padding: 2px 8px;
          margin: 2px;
          border-radius: 3px;
          border: 1px solid #008800;
        }
        
        /* TRON/ARCADE STYLES */
        .tron-glow {
          box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff;
        }
        .tron-border {
          border: 1px solid #00ffff;
          box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.3);
        }
        .tron-text {
          text-shadow: 0 0 5px #00ffff;
          color: #00ffff;
        }
        .arcade-text {
          text-shadow: 0 0 5px #ff00ff;
          color: #ff00ff;
        }
        .laser-blue { color: #00aaff; }
        .laser-pink { color: #ff00ff; }
        .laser-green { color: #00ff00; }
        .laser-orange { color: #ff9900; }
        .laser-cyan { color: #00ffff; }
        
        /* Graph styles */
        .bar-graph {
          display: flex;
          align-items: flex-end;
          height: 100px;
          padding: 10px 0;
          border-bottom: 1px solid #00ffff;
          background: rgba(0, 0, 0, 0.5);
        }
        .bar {
          flex: 1;
          margin: 0 2px;
          position: relative;
          transition: height 0.3s ease;
        }
        .bar-value {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #00ffff;
          background: rgba(0, 0, 0, 0.8);
          padding: 0 4px;
          border-radius: 2px;
          white-space: nowrap;
        }
        .bar-label {
          position: absolute;
          bottom: -25px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #00ff00;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          height: 20px;
          background: rgba(0, 0, 0, 0.8);
          padding: 2px;
        }
        
        /* Sparkline */
        .sparkline {
          height: 40px;
          position: relative;
          border-bottom: 1px solid #ff00ff;
          background: rgba(0, 0, 0, 0.3);
          margin: 10px 0;
        }
        .sparkline-point {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #ff00ff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        .sparkline-line {
          position: absolute;
          background: linear-gradient(to right, #ff00ff00, #ff00ff, #ff00ff00);
          height: 2px;
          z-index: 1;
        }
        
        /* Data grid */
        .data-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin: 15px 0;
        }
        .data-cell {
          border: 1px solid #00ffff;
          padding: 8px;
          background: rgba(0, 255, 255, 0.05);
          border-radius: 4px;
        }
        .data-label {
          color: #00ff00;
          font-size: 12px;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .data-value {
          color: #00ffff;
          font-size: 18px;
          font-weight: bold;
          text-shadow: 0 0 5px #00ffff;
        }
        
        /* Pulsing animations */
        @keyframes pulse-blue {
          0%, 100% { 
            box-shadow: 0 0 5px #00aaff, inset 0 0 5px rgba(0, 170, 255, 0.3); 
          }
          50% { 
            box-shadow: 0 0 15px #00aaff, 0 0 25px #00aaff, inset 0 0 10px rgba(0, 170, 255, 0.5); 
          }
        }
        @keyframes pulse-pink {
          0%, 100% { 
            box-shadow: 0 0 5px #ff00ff, inset 0 0 5px rgba(255, 0, 255, 0.3); 
          }
          50% { 
            box-shadow: 0 0 15px #ff00ff, 0 0 25px #ff00ff, inset 0 0 10px rgba(255, 0, 255, 0.5); 
          }
        }
        @keyframes pulse-cyan {
          0%, 100% { 
            box-shadow: 0 0 5px #00ffff, inset 0 0 5px rgba(0, 255, 255, 0.3); 
          }
          50% { 
            box-shadow: 0 0 15px #00ffff, 0 0 25px #00ffff, inset 0 0 10px rgba(0, 255, 255, 0.5); 
          }
        }
        .pulse-blue {
          animation: pulse-blue 2s infinite;
        }
        .pulse-pink {
          animation: pulse-pink 2s infinite;
        }
        .pulse-cyan {
          animation: pulse-cyan 2s infinite;
        }
      `}</style>

      <div className="p-4 scanline">
        {error && (
          <div className="mb-3 p-2 bg-red-900 text-red-300 border border-red-700">
            <div className="flex justify-between">
              <span>⚠️ {error}</span>
              <button onClick={() => setError('')} className="text-red-400">[X]</button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="mb-3 p-2 bg-blue-900 text-blue-300 border border-blue-700">
            <div className="flex items-center gap-2">
              <span className="animate-pulse">⏳</span>
              <span>Processing...</span>
            </div>
          </div>
        )}

        {/* Admin Login Prompt */}
        {showAdminPrompt && !isAdmin && (
          <div className="mb-3 p-4 bg-yellow-900 border border-yellow-400">
            <div className="text-yellow-300 mb-3">
              ═══ ADMIN AUTHENTICATION REQUIRED ═══
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">PASSWORD:</span>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="dos-input flex-1"
                placeholder="Enter admin password"
                autoFocus
              />
              <button
                onClick={handleAdminLogin}
                className="px-4 py-1 text-black bg-green-400 hover:bg-green-500 border border-green-700"
              >
                [ENTER]
              </button>
              <button
                onClick={() => setShowAdminPrompt(false)}
                className="px-4 py-1 text-black bg-red-400 hover:bg-red-500 border border-red-700"
              >
                [CANCEL]
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="text-yellow-400">
            ╔════════════════════════════════════════════════════════════════════════════╗
          </div>
          <div className="text-yellow-400 flex justify-between">
            <span>║  GELATO BASE v2.0 (Vercel PostgreSQL)</span>
            <span> {formatTime(currentTime)} ║</span>
          </div>
          <div className="text-yellow-400">
            ╚════════════════════════════════════════════════════════════════════════════╝
          </div>
        </div>

        <div className="mb-4 text-green-400">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-cyan-400">TOTAL:</span> {entries.length} flavours
            </div>
            <div>
              <span className="text-cyan-400">TODAY:</span> {todaysEntries} flavours
            </div>
            <div>
              <span className="text-cyan-400">DATES:</span> {sortedDates.length}
            </div>
            <div>
              <span className="text-cyan-400">FILTER:</span> {filter.toUpperCase()}
            </div>
            <div>
              <span className="text-cyan-400">DB:</span> PostgreSQL
            </div>
            {isAdmin && (
              <div>
                <span className="text-yellow-400">MODE:</span> <span className="text-yellow-300">ADMIN</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-white mb-2">
            GELATO BASE MENU
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-3 py-1 ${showForm ? 'bg-cyan-400 text-black' : 'text-cyan-400 hover:text-white hover:bg-cyan-900'} border border-cyan-700`}
              disabled={isLoading}
            >
              [N]EW FLAVOURS
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 ${filter === 'all' ? 'bg-cyan-400 text-black' : 'text-cyan-400 hover:text-white hover:bg-cyan-900'} border border-cyan-700`}
              disabled={isLoading}
            >
              [A]LL
            </button>
            <button
              onClick={() => setFilter('Joelato')}
              className={`px-3 py-1 ${filter === 'Joelato' ? 'bg-cyan-400 text-black' : 'text-cyan-400 hover:text-white hover:bg-cyan-900'} border border-cyan-700`}
              disabled={isLoading}
            >
              [J]OELATO
            </button>
            <button
              onClick={() => setFilter("Mary's Milk Bar")}
              className={`px-3 py-1 ${filter === "Mary's Milk Bar" ? 'bg-cyan-400 text-black' : 'text-cyan-400 hover:text-white hover:bg-cyan-900'} border border-cyan-700`}
              disabled={isLoading}
            >
              [M]ARYS
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className={`px-3 py-1 ${showStats ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black' : 'text-magenta-400 hover:text-white hover:bg-magenta-900'} border border-magenta-700`}
              disabled={isLoading}
            >
              [#]ANALYTICS
            </button>
            {isAdmin ? (
              <button
                onClick={handleAdminLogout}
                className="px-3 py-1 text-yellow-400 hover:text-white hover:bg-yellow-900 border border-yellow-700"
              >
                [L]OGOUT ADMIN
              </button>
            ) : (
              <button
                onClick={() => setShowAdminPrompt(true)}
                className="px-3 py-1 text-yellow-400 hover:text-white hover:bg-yellow-900 border border-yellow-700"
              >
                [A]DMIN LOGIN
              </button>
            )}
            <button
              onClick={loadEntries}
              className="px-3 py-1 text-green-400 hover:text-white hover:bg-green-900 border border-green-700"
              disabled={isLoading}
            >
              [R]EFRESH
            </button>
          </div>
        </div>

        {/* Enhanced Statistics Panel */}
        {showStats && stats && (
          <div className="border border-magenta-400 p-4 mb-4 bg-gray-900 tron-border">
            <div className="arcade-text mb-3 text-center text-lg">
              ═══ GELATO ANALYTICS SUITE v1.0 ═══
            </div>
            
            <div className="data-grid mb-6">
              <div className="data-cell pulse-blue">
                <div className="data-label">TOTAL FLAVOURS</div>
                <div className="data-value laser-blue">{stats.totalFlavours}</div>
              </div>
              <div className="data-cell">
                <div className="data-label">UNIQUE FLAVOURS</div>
                <div className="data-value laser-green">{stats.uniqueFlavours}</div>
              </div>
              <div className="data-cell pulse-pink">
                <div className="data-label">TOTAL VISITS</div>
                <div className="data-value laser-pink">{stats.totalVisits}</div>
              </div>
              <div className="data-cell">
                <div className="data-label">FLAVOURS/DAY</div>
                <div className="data-value laser-orange">{stats.flavoursPerDay}</div>
              </div>
            </div>

            {/* Shop Comparison Bar Chart */}
            <div className="mb-6">
              <div className="text-yellow-400 mb-3 flex items-center justify-between">
                <span>SHOP COMPARISON:</span>
                <span className="text-sm">
                  JOELATO: {stats.joelatoCount} • MARY'S: {stats.marysCount}
                </span>
              </div>
              <div className="bar-graph">
                {stats.shopData.map(([shop, count]) => {
                  const maxCount = Math.max(stats.joelatoCount, stats.marysCount);
                  const height = maxCount > 0 ? (count / maxCount) * 80 : 0;
                  const color = shop === 'Joelato' ? '#00aaff' : '#ff00ff';
                  
                  return (
                    <div key={shop} className="bar" style={{ 
                      height: `${height}px`,
                      background: `linear-gradient(to top, ${color}20, ${color}cc)`,
                      border: `1px solid ${color}`
                    }}>
                      <div className="bar-value">{count}</div>
                      <div className="bar-label">{shop.substring(0, 3)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center text-xs text-cyan-400 mt-2">
                {stats.mostPopularShop[0]} leads by {stats.mostPopularShop[1]} flavours
              </div>
            </div>

            {/* Top Flavours Display */}
            <div className="mb-6">
              <div className="text-yellow-400 mb-3">TOP FLAVOURS:</div>
              <div className="grid grid-cols-2 gap-4">
                {stats.topFlavours.slice(0, 8).map(([flavour, count], index) => {
                  const percentage = ((count / stats.totalFlavours) * 100).toFixed(1);
                  const width = Math.min(100, percentage * 2);
                  
                  return (
                    <div key={flavour} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="laser-green truncate max-w-[120px]">
                          {flavour.charAt(0).toUpperCase() + flavour.slice(1)}
                        </span>
                        <span className="laser-blue">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-800">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${width}%` }}
                        ></div>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        {percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity Sparkline */}
            {stats.monthlyData.length > 1 && (
              <div className="mb-6">
                <div className="text-yellow-400 mb-3">RECENT ACTIVITY:</div>
                <div className="sparkline">
                  {stats.monthlyData.map(([month, count], index) => {
                    const values = stats.monthlyData.map(([_, c]) => c);
                    const max = Math.max(...values);
                    const x = (index / (stats.monthlyData.length - 1)) * 100;
                    const y = 100 - (count / max) * 100;
                    
                    return (
                      <React.Fragment key={month}>
                        <div 
                          className="sparkline-point"
                          style={{ left: `${x}%`, top: `${y}%` }}
                        ></div>
                        {index > 0 && (
                          <div 
                            className="sparkline-line"
                            style={{
                              left: `${(index - 1) / (stats.monthlyData.length - 1) * 100}%`,
                              width: `${100 / (stats.monthlyData.length - 1)}%`,
                              top: `${y}%`,
                              transform: 'translateY(-50%)'
                            }}
                          ></div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{stats.monthlyData[0]?.[0]}</span>
                  <span>{stats.monthlyData[stats.monthlyData.length - 1]?.[0]}</span>
                </div>
              </div>
            )}

            {/* Taster Leaderboard */}
            <div className="mb-6">
              <div className="text-yellow-400 mb-3">TASTER LEADERBOARD:</div>
              <div className="space-y-2">
                {stats.personData.map(([person, count], index) => {
                  const isChampion = index === 0;
                  const percentage = ((count / stats.totalFlavours) * 100).toFixed(1);
                  const favorite = stats.personFavorites.find(p => p.person === person);
                  
                  return (
                    <div 
                      key={person} 
                      className={`flex items-center justify-between p-2 ${isChampion ? 'border border-yellow-400 bg-yellow-900/20' : 'border border-gray-700'}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 flex items-center justify-center ${isChampion ? 'bg-yellow-500 text-black' : 'bg-gray-700'} text-xs`}>
                          {index + 1}
                        </div>
                        <span className={isChampion ? 'text-yellow-300' : 'laser-green'}>
                          {person}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="laser-blue">{count} flavours</span>
                        <span className="text-sm text-gray-400">{percentage}%</span>
                        {favorite && favorite.favorite !== 'None' && (
                          <span className="text-xs text-cyan-400">
                            Fav: {favorite.favorite}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-cyan-700 p-3">
                <div className="text-xs text-gray-400 mb-1">MOST REPEATED</div>
                <div className="laser-green text-sm">
                  {stats.mostCommonFlavour[0].charAt(0).toUpperCase() + stats.mostCommonFlavour[0].slice(1)}
                </div>
                <div className="text-xs laser-blue">{stats.mostCommonFlavour[1]} times</div>
              </div>
              
              <div className="border border-purple-700 p-3">
                <div className="text-xs text-gray-400 mb-1">AVG FLAVOURS/VISIT</div>
                <div className="laser-pink text-lg">{stats.avgFlavoursPerVisit}</div>
                <div className="text-xs text-gray-400">
                  Range: {stats.minFlavoursPerVisit}-{stats.maxFlavoursPerVisit}
                </div>
              </div>
              
              <div className="border border-green-700 p-3">
                <div className="text-xs text-gray-400 mb-1">ACTIVITY (7D)</div>
                <div className="laser-green text-lg">{stats.recentActivity}</div>
                <div className="text-xs text-gray-400">
                  {stats.recentPercentage}% of total
                </div>
              </div>
              
              <div className="border border-blue-700 p-3">
                <div className="text-xs text-gray-400 mb-1">SHOP RATIO</div>
                <div className="laser-blue text-lg">
                  {stats.shopRatio !== 'N/A' ? `1:${stats.shopRatio}` : 'N/A'}
                </div>
                <div className="text-xs text-gray-400">
                  Joelato : Mary's
                </div>
              </div>
            </div>

            {/* Time Analysis */}
            <div className="mb-4">
              <div className="text-yellow-400 mb-2">TIME ANALYSIS:</div>
              <div className="text-sm space-y-1 text-green-400">
                <div>Tracking period........: {stats.daysBetween} days</div>
                <div>Date range.............: {stats.firstVisit} to {stats.lastVisit}</div>
                <div>Flavours per day........: {stats.flavoursPerDay}</div>
                <div>Unique shops visited...: {Object.keys(stats.shopCounts).length}</div>
                <div>Unique tasters.........: {Object.keys(stats.personCounts).length}</div>
              </div>
            </div>

            {/* Close button */}
            <div className="mt-6 pt-4 border-t border-magenta-700 text-center">
              <button
                onClick={() => setShowStats(false)}
                className="px-6 py-2 text-black bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 border border-cyan-700 font-bold"
              >
                [CLOSE ANALYTICS]
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="border border-cyan-400 p-4 mb-4 bg-gray-900">
            <div className="text-yellow-400 mb-3">
              ═══ ADD NEW FLAVOURS ═══
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-green-400 w-32">SHOP:</span>
                <select
                  value={formData.shop}
                  onChange={(e) => setFormData({...formData, shop: e.target.value})}
                  className="dos-select flex-1"
                  disabled={isLoading}
                >
                  <option value="Joelato">JOELATO</option>
                  <option value="Mary's Milk Bar">MARYS MILK BAR</option>
                  <option value="Other">OTHER</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-green-400 w-32">NAME:</span>
                <input
                  type="text"
                  value={formData.person}
                  onChange={(e) => setFormData({...formData, person: e.target.value})}
                  className="dos-input flex-1"
                  placeholder="YOUR NAME"
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-green-400 w-32">DATE:</span>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="dos-input"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-green-400">FLAVOURS:</span>
                  <button
                    type="button"
                    onClick={addFlavourField}
                    className="text-cyan-400 hover:text-white px-2 py-1 border border-cyan-700"
                    disabled={isLoading}
                  >
                    [+ ADD FLAVOUR]
                  </button>
                </div>
                
                {formData.flavours.map((flavour, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-cyan-400 w-8">{index + 1}.</span>
                    <input
                      type="text"
                      value={flavour}
                      onChange={(e) => updateFlavour(index, e.target.value)}
                      className="dos-input flex-1"
                      placeholder={`FLAVOUR ${index + 1}`}
                      disabled={isLoading}
                    />
                    {formData.flavours.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFlavourField(index)}
                        className="text-red-400 hover:text-red-300 px-2 border border-red-700"
                        disabled={isLoading}
                      >
                        [X]
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <span className="text-green-400 w-32 pt-2">NOTES:</span>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="dos-textarea flex-1"
                  placeholder="OPTIONAL NOTES"
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 text-black bg-green-400 hover:bg-green-500 border border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || formData.flavours.filter(f => f.trim() !== '').length === 0 || !formData.person}
                >
                  {isLoading ? '[S]AVING...' : '[S]AVE FLAVOURS'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 text-black bg-red-400 hover:bg-red-500 border border-red-700 disabled:opacity-50"
                  disabled={isLoading}
                >
                  [C]ANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="text-white mb-2">
            RECORDED FLAVOURS
          </div>
          
          {sortedDates.length === 0 ? (
            <div className="text-red-400 ml-4">
              No flavours recorded yet.
              <br />
              <br />
              <button 
                onClick={() => setShowForm(true)}
                className="text-cyan-400 hover:text-white underline"
              >
                Click "NEW FLAVOURS" to add your first flavours
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map(date => (
                <div key={date} className="border border-cyan-400 p-3 bg-gray-900">
                  <div className="text-yellow-400 mb-3">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
                  </div>
                  
                  {Array.from(new Set(groupedEntries[date].map(e => e.shop))).map(shop => {
                    const shopEntries = groupedEntries[date].filter(e => e.shop === shop);
                    const people = Array.from(new Set(shopEntries.map(e => e.person)));
                    
                    return (
                      <div key={shop} className="mb-4 ml-4">
                        <div className="text-green-400 mb-2">
                          <span className="text-yellow-400 mr-2">{shop}</span>
                          <span className="text-cyan-400">
                            • tasted by {people.join(', ')}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {shopEntries.map(entry => (
                            <div key={entry.id} className="relative group">
                              <div className="flavour-tag">
                                {entry.flavour}
                                {isAdmin && (
                                  <button
                                    onClick={() => deleteEntry(entry.id)}
                                    className="ml-2 text-red-400 hover:text-red-300 text-xs"
                                    title="Delete this flavour (admin only)"
                                  >
                                    [x]
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {shopEntries[0]?.notes && (
                          <div className="text-cyan-400 mt-2">
                            <span className="text-green-400">Notes:</span> {shopEntries[0].notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-green-400">
          <div className="flex items-center">
            <span>GELATO BASE&gt;</span>
            <span className="blink ml-1">█</span>
          </div>
        </div>

        <div className="mt-6 pt-2 border-t border-cyan-700 text-sm text-gray-400">
          <div className="flex justify-between">
            <div>
              {sortedDates.length > 0 ? (
                <span>Last update: {new Date(entries[0]?.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              ) : (
                <span>Database empty</span>
              )}
            </div>
            <div>
              {isLoading ? (
                <span className="text-yellow-400">Syncing...</span>
              ) : (
                <span className="text-green-400">PostgreSQL Active</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IceCreamTracker;ma