// Simple test script to verify API endpoint
const testAPI = async () => {
  try {
    console.log('Testing /api/health endpoint...');
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);

    console.log('\nTesting /api/scrape endpoint...');
    const scrapeResponse = await fetch('http://localhost:3001/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyword: 'test',
        location: 'test'
      })
    });

    const responseText = await scrapeResponse.text();
    console.log('Response status:', scrapeResponse.status);
    console.log('Response headers:', Object.fromEntries(scrapeResponse.headers));
    console.log('Response body (first 500 chars):', responseText.substring(0, 500));
    
    try {
      const scrapeData = JSON.parse(responseText);
      console.log('Parsed JSON:', scrapeData);
    } catch (e) {
      console.error('Failed to parse as JSON:', e.message);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Note: This requires Node.js 18+ with fetch support, or use node-fetch
if (typeof fetch !== 'undefined') {
  testAPI();
} else {
  console.log('This script requires Node.js 18+ or a fetch polyfill');
  console.log('Run: node --experimental-fetch test-api.js');
}

