import puppeteer from 'puppeteer';

export async function scrapeGoogleMaps(keyword, location, minRating = 0, maxResults = 50) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    const query = `${keyword} in ${location}`;
    console.log(`Navigating to Google Maps for: ${query}`);

    // Navigate to Google Maps
    await page.goto(
      `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
      {
        waitUntil: 'networkidle2',
        timeout: 60000
      }
    );

    // Wait for the results feed to appear
    const feedSelector = 'div[role="feed"]';
    try {
      await page.waitForSelector(feedSelector, { timeout: 15000 });
    } catch (e) {
      console.log("Could not find feed selector.");
      await browser.close();
      return [];
    }

    // Auto-scroll logic to load more results
    await page.evaluate(async (feedSelector) => {
      const wrapper = document.querySelector(feedSelector);
      if (!wrapper) return;
      
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 1000;
        let attempts = 0;
        const maxAttempts = 30;

        const timer = setInterval(() => {
          const scrollHeight = wrapper.scrollHeight;
          wrapper.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || attempts > maxAttempts) {
            clearInterval(timer);
            setTimeout(resolve, 2000); // Wait for final load
          }
          attempts++;
        }, 1500);
      });
    }, feedSelector);

    // Wait a bit more for content to load
    await page.waitForTimeout(2000);

    // Extraction Logic
    const leads = await page.evaluate((minRating) => {
      const items = Array.from(document.querySelectorAll('div[role="article"]'));
      const results = [];

      items.forEach(item => {
        try {
          const text = item.innerText;
          const lines = text.split('\n').filter(line => line.trim());
          
          const linkElement = item.querySelector('a[href*="maps/place"]');
          const link = linkElement ? linkElement.href : '';
          
          // Extract name
          const name = item.getAttribute('aria-label') || lines[0] || 'Unknown';
          
          // Extract rating
          const ratingMatch = text.match(/([0-5]\.[0-9])/);
          const rating = ratingMatch ? ratingMatch[1] : 'N/A';
          
          // Extract reviews count
          const reviewsMatch = text.match(/\(([0-9,]+)\)/);
          const reviews = reviewsMatch ? reviewsMatch[1] : '0';
          
          // Extract phone
          const phoneMatch = text.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
          const phone = phoneMatch ? phoneMatch[0] : '';
          
          // Extract address (usually after name and before phone/rating)
          let address = '';
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].match(/^[0-5]\.[0-9]$/) && 
                !lines[i].match(/\([0-9,]+\)/) && 
                !lines[i].match(/\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/) &&
                lines[i].length > 5) {
              address = lines[i];
              break;
            }
          }

          // Filter by minimum rating if specified
          const ratingNum = parseFloat(rating);
          if (minRating > 0 && (isNaN(ratingNum) || ratingNum < minRating)) {
            return;
          }

          if (name && name !== 'Unknown') {
            results.push({
              name: name.trim(),
              address: address.trim(),
              phone: phone.trim(),
              rating: rating,
              reviews: reviews,
              website: '', // Requires deeper navigation
              googleMapsLink: link
            });
          }
        } catch (err) {
          console.error('Error extracting item:', err);
        }
      });

      return results;
    }, minRating);

    await browser.close();
    
    // Limit results
    return leads.slice(0, maxResults);
  } catch (error) {
    console.error("Scraping error:", error);
    await browser.close();
    return [];
  }
}

