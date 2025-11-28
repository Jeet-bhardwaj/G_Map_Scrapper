import { useState } from 'react';
import { CSVLink } from "react-csv";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [formData, setFormData] = useState({ keyword: '', location: '' });

  const handleScrape = async () => {
    setLoading(true);
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    setLeads(data.data || []);
    setLoading(false);
  };

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">KTYM Lead Generator</h1>
      
      <div className="flex gap-4 mb-8">
        <input 
          placeholder="Business Type (e.g. Gym, Dentist)" 
          className="border p-2 rounded w-full"
          onChange={(e) => setFormData({...formData, keyword: e.target.value})}
        />
        <input 
          placeholder="Location (e.g. Patna, Bihar)" 
          className="border p-2 rounded w-full"
          onChange={(e) => setFormData({...formData, location: e.target.value})}
        />
        <button 
          onClick={handleScrape}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Scraping...' : 'Find Leads'}
        </button>
      </div>

      {leads.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Results ({leads.length})</h2>
            <CSVLink data={leads} filename={"leads.csv"} className="bg-green-500 text-white px-4 py-2 rounded">
              Download CSV
            </CSVLink>
          </div>
          
          <div className="border rounded overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Rating</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{lead.name}</td>
                    <td className="p-3 text-sm">{lead.address}</td>
                    <td className="p-3">{lead.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}