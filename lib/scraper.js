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
          
          // Improved phone extraction - multiple methods
          let phone = '';
          
          // Method 1: Look for phone number buttons/links
          const phoneButton = item.querySelector('button[data-item-id*="phone"], a[href^="tel:"]');
          if (phoneButton) {
            const phoneHref = phoneButton.getAttribute('href');
            if (phoneHref && phoneHref.startsWith('tel:')) {
              phone = phoneHref.replace('tel:', '').trim();
            } else {
              phone = phoneButton.innerText.trim();
            }
          }
          
          // Method 2: Look for phone icon and nearby text
          if (!phone) {
            const phoneIcons = item.querySelectorAll('span[aria-label*="phone"], span[aria-label*="Phone"], button[aria-label*="phone"], button[aria-label*="Phone"]');
            phoneIcons.forEach(icon => {
              const parent = icon.closest('div') || icon.parentElement;
              if (parent) {
                const parentText = parent.innerText || parent.textContent || '';
                // Look for phone patterns in parent text
                const phonePatterns = [
                  /(\+91[\s.\-]?)?[6-9]\d{9}/g, // Indian mobile: +91 or 6-9 followed by 9 digits
                  /(\+?\d{1,3}[\s.\-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{4}/g, // General format
                  /(\+91[\s.\-]?)?[0-9]{3}[\s.\-]?[0-9]{3}[\s.\-]?[0-9]{4}/g, // Indian format with spaces
                ];
                
                for (const pattern of phonePatterns) {
                  const matches = parentText.match(pattern);
                  if (matches && matches.length > 0) {
                    phone = matches[0].replace(/[\s.\-]/g, '').replace(/^\+91/, '').trim();
                    if (phone.length >= 10) {
                      // Format Indian number
                      if (phone.length === 10) {
                        phone = `+91 ${phone.substring(0, 5)} ${phone.substring(5)}`;
                      }
                      break;
                    }
                  }
                }
              }
            });
          }
          
          // Method 3: Enhanced regex patterns for phone numbers in text
          if (!phone) {
            const phonePatterns = [
              /(\+91[\s.\-]?)?[6-9]\d{9}/g, // Indian mobile numbers
              /(\+91[\s.\-]?)?[0-9]{3}[\s.\-]?[0-9]{3}[\s.\-]?[0-9]{4}/g, // Indian format
              /(\+?\d{1,3}[\s.\-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{4}/g, // International format
              /\d{10}/g, // 10 digit numbers (could be phone)
            ];
            
            for (const pattern of phonePatterns) {
              const matches = text.match(pattern);
              if (matches && matches.length > 0) {
                // Filter out false positives (ratings, reviews, etc.)
                for (const match of matches) {
                  const cleanMatch = match.replace(/[\s.\-()]/g, '');
                  // Check if it's likely a phone number (not a rating or review count)
                  if (cleanMatch.length >= 10 && 
                      !cleanMatch.match(/^[0-5]\./) && 
                      !text.includes(`(${cleanMatch})`) &&
                      !match.includes('(') && !match.includes(')')) {
                    phone = match.trim();
                    // Format Indian number if it's 10 digits
                    if (cleanMatch.length === 10 && cleanMatch.match(/^[6-9]/)) {
                      phone = `+91 ${cleanMatch.substring(0, 5)} ${cleanMatch.substring(5)}`;
                    }
                    break;
                  }
                }
                if (phone) break;
              }
            }
          }
          
          // Method 4: Look in specific lines that might contain phone
          if (!phone) {
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              // Skip if line is name, rating, or reviews
              if (line === name || line.match(/^[0-5]\.[0-9]$/) || line.match(/^\([0-9,]+\)$/)) {
                continue;
              }
              // Check if line contains phone-like patterns
              const phoneInLine = line.match(/(\+91[\s.\-]?)?[6-9]\d{9}|(\+?\d{1,3}[\s.\-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{4}/);
              if (phoneInLine) {
                phone = phoneInLine[0].trim();
                break;
              }
            }
          }
          
          // Clean up phone number
          if (phone) {
            phone = phone.replace(/\s+/g, ' ').trim();
          }
          
          // Extract address (usually after name and before phone/rating)
          let address = '';
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Skip if it's rating, reviews, or phone number
            if (!line.match(/^[0-5]\.[0-9]$/) && 
                !line.match(/^\([0-9,]+\)$/) && 
                !line.match(/(\+91[\s.\-]?)?[6-9]\d{9}/) &&
                !line.match(/(\+?\d{1,3}[\s.\-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{4}/) &&
                line !== name &&
                line.length > 5) {
              address = line;
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

