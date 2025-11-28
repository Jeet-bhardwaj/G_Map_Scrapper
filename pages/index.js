import React, { useState } from 'react';
import { Download, Search, Database, MapPin, Loader2, AlertCircle, Building2, Phone, Globe, Star, Filter } from 'lucide-react';

export default function LeadScraperDashboard() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [maxResults, setMaxResults] = useState('50');
  const [isScraping, setIsScraping] = useState(false);
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [ratingFilter, setRatingFilter] = useState('0');

  // Helper to add logs to the UI
  const addLog = (message) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message }]);
  };

  // Filter leads by rating
  const applyRatingFilter = (leadsToFilter, minRatingValue) => {
    if (!minRatingValue || minRatingValue === '0') {
      return leadsToFilter;
    }
    return leadsToFilter.filter(lead => {
      const rating = parseFloat(lead.rating);
      return !isNaN(rating) && rating >= parseFloat(minRatingValue);
    });
  };

  // Update filtered leads when rating filter or leads change
  React.useEffect(() => {
    const filtered = applyRatingFilter(leads, ratingFilter);
    setFilteredLeads(filtered);
  }, [leads, ratingFilter]);

  // Test API connection on component mount
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          addLog('✓ API server connection successful');
        } else {
          addLog('⚠ API server responded with error');
        }
      } catch (err) {
        addLog('✗ Cannot connect to API server. Make sure the server is running.');
        setError('Server connection failed. Please run "npm run dev" in the terminal.');
      }
    };
    testConnection();
  }, []);

  // Custom CSV Download Function
  const downloadCSV = () => {
    const dataToExport = filteredLeads.length > 0 ? filteredLeads : leads;
    if (dataToExport.length === 0) return;

    const headers = ['Name', 'Address', 'Phone', 'Rating', 'Reviews', 'Website', 'Google Maps Link', 'Keyword', 'Location', 'Scraped At'];
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(row => [
        `"${(row.name || '').replace(/"/g, '""')}"`,
        `"${(row.address || '').replace(/"/g, '""')}"`,
        `"${(row.phone || '').replace(/"/g, '""')}"`,
        `"${(row.rating || '').replace(/"/g, '""')}"`,
        `"${(row.reviews || '').replace(/"/g, '""')}"`,
        `"${(row.website || '').replace(/"/g, '""')}"`,
        `"${(row.googleMapsLink || '').replace(/"/g, '""')}"`,
        `"${(row.keyword || '').replace(/"/g, '""')}"`,
        `"${(row.location || '').replace(/"/g, '""')}"`,
        `"${(row.scrapedAt ? new Date(row.scrapedAt).toLocaleString() : '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads-${keyword || 'all'}-${location || 'all'}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleStartScrape = async (e) => {
    e.preventDefault();
    if (!keyword || !location) {
      setError('Please enter both keyword and location');
      return;
    }

    setIsScraping(true);
    setError('');
    setLeads([]);
    setFilteredLeads([]);
    setLogs([]);

    addLog(`Initializing scraper for "${keyword}" in "${location}"...`);
    addLog(`Minimum rating filter: ${minRating || 'None'}`);
    addLog(`Max results: ${maxResults}`);
    addLog(`Please wait. This process opens a browser on the server.`);

    try {
      // Create an AbortController for timeout (5 minutes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        addLog('Request timeout: Scraping is taking too long...');
      }, 300000); // 5 minutes

      addLog('Sending request to API server...');
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          keyword, 
          location, 
          minRating: parseFloat(minRating) || 0,
          maxResults: parseInt(maxResults) || 50
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      addLog(`Received response with status: ${response.status}`);

      // Get response text first to see what we actually received
      const responseText = await response.text();
      
      // Log first part of response for debugging
      if (responseText.length > 0) {
        console.log('Raw API response (first 500 chars):', responseText.substring(0, 500));
      } else {
        console.warn('API returned empty response');
        throw new Error('Server returned empty response. Check server logs.');
      }
      
      // Check if response looks like HTML (error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON. This usually means an error page.');
        addLog('Server returned an error page (HTML). Check server terminal for errors.');
        throw new Error('Server returned an error page. This usually indicates a server-side error. Check the terminal running "npm run dev".');
      }
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON. Full response:', responseText);
        addLog(`Server returned invalid JSON. Status: ${response.status}`);
        addLog('Check browser console (F12) for full error details.');
        throw new Error(`Server returned invalid JSON. Status: ${response.status}. Response preview: ${responseText.substring(0, 200)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch data');
      }

      if (data.success) {
        setLeads(data.data || []);
        addLog(`Success! Found ${data.count} leads.`);
        addLog(`Saved ${data.newlySaved} new unique leads to MongoDB.`);
        addLog(`Filtering by minimum rating: ${minRating || 'None'}`);
      } else {
        setError(data.message);
        addLog(`Error: ${data.message}`);
      }

    } catch (err) {
      console.error('Fetch error:', err);

      // More detailed error handling
      if (err.name === 'AbortError') {
        setError('⚠️ TIMEOUT ERROR: The scraping process took too long (5+ minutes). Try reducing max results or check your internet connection.');
        addLog('Error: Request timed out after 5 minutes');
        addLog('Tip: Try reducing the "Max Results" to a smaller number (e.g., 20-30)');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('Failed to parse URL')) {
        setError('⚠️ CONNECTION ERROR: Could not reach the API server. Please ensure: 1) Server is running (npm run dev), 2) You are accessing http://localhost:3001, 3) No firewall is blocking the connection.');
        addLog(`Error: ${err.message}`);
        addLog('Tip: Check the terminal where you ran "npm run dev" for any errors.');
      } else if (err.message.includes('JSON') || err.message.includes('parse') || err.message.includes('invalid')) {
        setError(`⚠️ RESPONSE ERROR: ${err.message}. Check the terminal/server logs for detailed error information.`);
        addLog(`Error: ${err.message}`);
        addLog('Tip: Open the browser console (F12) and check for more details. Also check the terminal running "npm run dev".');
      } else {
        setError(err.message || 'Something went wrong. Check the browser console for details.');
        addLog(`Critical Error: ${err.message}`);
      }
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-2">
              <Database className="w-8 h-8" />
              KTYM Lead Generation Engine
            </h1>
            <p className="text-slate-500 mt-1">Powerful Google Maps Scraper for Local Business Leads</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">System Ready</span>
          </div>
        </header>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* INPUT FORM */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-slate-400" />
              Search Parameters
            </h2>
            
            <form onSubmit={handleStartScrape} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Type / Keyword</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. Real Estate, Dentist, Gym"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="e.g. Patna, Bihar"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Rating Filter</label>
                <div className="relative">
                  <Star className="absolute left-3 top-3 w-5 h-5 text-yellow-400" />
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="0">No Filter</option>
                    <option value="3.0">3.0+ Stars</option>
                    <option value="3.5">3.5+ Stars</option>
                    <option value="4.0">4.0+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Results</label>
                <input 
                  type="number"
                  value={maxResults}
                  onChange={(e) => setMaxResults(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="50"
                  min="1"
                  max="200"
                />
              </div>

              <button 
                type="submit"
                disabled={isScraping}
                className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                  isScraping 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {isScraping ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Search className="w-5 h-5" /> Start Extraction
                  </span>
                )}
              </button>
            </form>

            {/* LIVE LOGS */}
            <div className="mt-6 bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 h-48 overflow-y-auto custom-scrollbar">
              <div className="text-slate-500 border-b border-slate-800 pb-2 mb-2">Server Logs</div>
              {logs.length === 0 && <span className="text-slate-600">Waiting for input...</span>}
              {logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  <span className="text-slate-500">[{log.time}]</span> {log.message}
                </div>
              ))}
              {isScraping && (
                <div className="mt-2 text-blue-400 animate-pulse">... Backend is scraping Google Maps ...</div>
              )}
            </div>
            
            {error && (
               <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                 <AlertCircle className="w-4 h-4 mt-0.5" />
                 {error}
               </div>
            )}
          </div>

          {/* RESULTS TABLE */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden min-h-[500px]">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Scraped Results
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredLeads.length > 0 ? filteredLeads.length : leads.length} businesses found
                  {filteredLeads.length !== leads.length && ` (${leads.length} total, ${filteredLeads.length} after filter)`}
                </p>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Rating Filter */}
                {leads.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="0">All Ratings</option>
                      <option value="3.0">3.0+ Stars</option>
                      <option value="3.5">3.5+ Stars</option>
                      <option value="4.0">4.0+ Stars</option>
                      <option value="4.5">4.5+ Stars</option>
                    </select>
                  </div>
                )}
                
                {/* Download Button */}
                {(filteredLeads.length > 0 || leads.length > 0) && (
                  <button
                    onClick={downloadCSV}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0 relative">
              {(filteredLeads.length === 0 && leads.length === 0) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 opacity-50" />
                  </div>
                  <p>No data yet. Start a new extraction to see real results.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Business Name</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating & Reviews</th>
                      <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Website</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(filteredLeads.length > 0 ? filteredLeads : leads).map((lead, index) => (
                      <tr key={index} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="p-4">
                          <div className="font-medium text-slate-900">{lead.name}</div>
                          {lead.googleMapsLink && (
                            <a 
                              href={lead.googleMapsLink} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View on Maps
                            </a>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-slate-600 flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> 
                            <span>{lead.address || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-3 h-3" /> 
                            <span>{lead.phone || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                              Number(lead.rating) >= 4.0 ? 'bg-green-100 text-green-700' : 
                              Number(lead.rating) >= 3.0 ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              <Star className="w-3 h-3 fill-current" />
                              {lead.rating || 'N/A'}
                            </span>
                            <span className="text-xs text-slate-400">({lead.reviews || 0} reviews)</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {lead.website ? (
                            <a 
                              href={lead.website} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              <Globe className="w-3 h-3" /> Visit
                            </a>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <AlertCircle className="w-3 h-3" /> N/A
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

