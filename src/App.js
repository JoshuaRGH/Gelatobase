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
      
      // Fallback to mock data
      const mockData = [
        { id: 1, flavor: "Chocolate", shop: "Joelato", person: "Demo", date: "2024-01-15", timestamp: new Date().toISOString(), notes: "Sample entry" },
        { id: 2, flavor: "Vanilla", shop: "Mary's Milk Bar", person: "Demo", date: "2024-01-14", timestamp: new Date().toISOString(), notes: "Another sample" }
      ];
      setEntries(mockData);
      
      // Fallback to localStorage
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

  // Add new flavour field
  const addFlavourField = () => {
    setFormData({
      ...formData,
      flavours: [...formData.flavours, '']
    });
  };

  // Remove flavour field
  const removeFlavourField = (index) => {
    const newFlavours = [...formData.flavours];
    newFlavours.splice(index, 1);
    setFormData({
      ...formData,
      flavours: newFlavours
    });
  };

  // Update specific flavour
  const updateFlavour = (index, value) => {
    const newFlavours = [...formData.flavours];
    newFlavours[index] = value;
    setFormData({
      ...formData,
      flavours: newFlavours
    });
  };

  const handleSubmit = async () => {
    // Filter out empty flavours
    const nonEmptyFlavours = formData.flavours.filter(flavour => flavour.trim() !== '');
    
    if (nonEmptyFlavours.length === 0 || !formData.person) {
      setError('Please fill in at least one flavour and your name');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Save each flavour to PostgreSQL via Vercel API
      const savedEntries = [];
      for (const flavour of nonEmptyFlavours) {
        const entryToSave = {
          shop: formData.shop,
          flavor: flavour.trim(), // Note: API expects 'flavor' (American spelling)
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
      
      // Update UI with all saved entries
      const updatedEntries = [...savedEntries, ...entries];
      setEntries(updatedEntries);
      
      // Keep local backup
      try {
        if (window.storage) {
          await window.storage.set('ice-cream-entries', JSON.stringify(updatedEntries));
        }
      } catch (storageError) {
        console.log('Could not save to local storage:', storageError);
      }
      
      // Reset form
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
      
      // Fallback to local storage
      const localEntries = nonEmptyFlavours.map((flavour, index) => ({
        shop: formData.shop,
        flavor: flavour.trim(),
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
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/entries/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const updatedEntries = entries.filter(e => e.id !== id);
      setEntries(updatedEntries);
      
      // Update local backup
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
      
      // Fallback to local delete
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

  // Group entries by date for better display
  const groupedEntries = filteredEntries.reduce((groups, entry) => {
    const date = entry.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {});

  // Sort dates descending
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b) - new Date(a));

  // Get today's entries count
  const today = new Date().toISOString().split('T')[0];
  const todaysEntries = entries.filter(e => e.date === today).length;

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
      `}</style>

      <div className="p-4 scanline">
        {/* Status Bar */}
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

        {/* Header */}
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

        {/* Stats Bar */}
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
          </div>
        </div>

        {/* Menu */}
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
              onClick={loadEntries}
              className="px-3 py-1 text-green-400 hover:text-white hover:bg-green-900 border border-green-700"
              disabled={isLoading}
            >
              [R]EFRESH
            </button>
          </div>
        </div>

        {/* New Entry Form */}
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

              {/* Multiple Flavours Section */}
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

        {/* Entries List - Grouped by Date */}
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
                  
                  {/* Group entries by shop within this date */}
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
                                {entry.flavor} {/* API returns 'flavor' not 'flavour' */}
                                <button
                                  onClick={() => deleteEntry(entry.id)}
                                  className="ml-2 text-red-400 hover:text-red-300 text-xs"
                                  title="Delete this flavour"
                                >
                                  [x]
                                </button>
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

        {/* Command Prompt */}
        <div className="mt-6 text-green-400">
          <div className="flex items-center">
            <span>GELATO BASE&gt;</span>
            <span className="blink ml-1">█</span>
          </div>
        </div>

        {/* Simple Footer */}
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

export default IceCreamTracker;