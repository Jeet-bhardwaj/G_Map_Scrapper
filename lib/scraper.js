import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

export async function scrapeGoogleMaps(keyword, location, minRating = 0, maxResults = 50) {
  // Use headless mode in production, non-headless in development
  const isHeadless = process.env.NODE_ENV === 'production' || process.env.PUPPETEER_HEADLESS === 'true';
  
  // Check if user wants to use Chrome profile (default: true for development, false for production)
  const useChromeProfile = process.env.USE_CHROME_PROFILE !== 'false' && process.env.NODE_ENV !== 'production';
  
  let launchOptions = {
    headless: isHeadless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--metrics-recording-only',
      '--mute-audio',
      '--safebrowsing-disable-auto-update',
      '--enable-automation',
    ]
  };
  
  let browser;
  
  // Try to use Chrome profile first, fallback to guest mode if it fails
  if (useChromeProfile) {
    try {
      // IMPORTANT: First check if Chrome is running
      const { execSync } = require('child_process');
      try {
        if (platform === 'win32') {
          const chromeProcesses = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH', { encoding: 'utf-8' });
          if (chromeProcesses.includes('chrome.exe')) {
            console.warn(`[Scraper] ⚠️  Chrome is currently running!`);
            console.warn(`[Scraper] ⚠️  Please close Chrome first, then try again.`);
            console.warn(`[Scraper] 💡 Quick fix: Run this command: Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force`);
            throw new Error('Chrome is running - profile is locked');
          }
        }
      } catch (checkError) {
        console.log(`[Scraper] Could not check Chrome processes: ${checkError.message}`);
      }
      
      // Get Chrome user data directory based on OS
      let userDataDir;
      const platform = os.platform();
      
      if (platform === 'win32') {
        // Windows - Default Chrome profile location
        userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
      } else if (platform === 'darwin') {
        // macOS
        userDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome');
      } else {
        // Linux
        userDataDir = path.join(os.homedir(), '.config', 'google-chrome');
      }
      
      // Use custom profile name if specified, otherwise use Default
      const profileName = process.env.CHROME_PROFILE_NAME || 'Default';
      
      console.log(`[Scraper] Attempting to use Chrome profile: ${profileName}`);
      console.log(`[Scraper] Profile directory: ${userDataDir}`);
      
      const profileOptions = { ...launchOptions };
      profileOptions.userDataDir = userDataDir;
      profileOptions.args = [...launchOptions.args, `--profile-directory=${profileName}`];
      
      // Try launching with profile
      browser = await puppeteer.launch(profileOptions);
      console.log(`[Scraper] ✅ Successfully launched with Chrome profile`);
    } catch (error) {
      console.warn(`[Scraper] ⚠️  Could not use Chrome profile: ${error.message}`);
      console.warn(`[Scraper] ⚠️  Falling back to guest mode...`);
      console.warn(`[Scraper] 💡 Tip: Close ALL Chrome windows and try again for better results`);
      
      // Fallback to guest mode
      browser = null;
    }
  }
  
  // If profile launch failed or not requested, use guest mode
  if (!browser) {
    console.log(`[Scraper] Using guest mode (no Chrome profile)`);
    browser = await puppeteer.launch(launchOptions);
  }

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

    // Extraction Logic with Enhanced Phone Detection
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
          
          // ENHANCED PHONE EXTRACTION - Multiple Advanced Methods
          let phone = '';
          
          // Method 0: Look for phone in aria-label attributes (most reliable)
          const phoneAriaElements = item.querySelectorAll('[aria-label*="Phone"], [aria-label*="phone"], [data-tooltip*="Phone"], [data-tooltip*="phone"]');
          phoneAriaElements.forEach(el => {
            if (!phone) {
              const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('data-tooltip') || '';
              const phoneMatch = ariaLabel.match(/(\+?\d[\d\s\-\(\)\.]{8,})/);
              if (phoneMatch) {
                phone = phoneMatch[1].trim();
              }
            }
          });
          
          // Method 1: Look for phone number buttons/links and their containers
          if (!phone) {
            const phoneButton = item.querySelector('button[data-item-id*="phone"], button[data-item-id*="Phone"], a[href^="tel:"], a[data-value*="tel"]');
            if (phoneButton) {
              const phoneHref = phoneButton.getAttribute('href');
              if (phoneHref && phoneHref.startsWith('tel:')) {
                phone = phoneHref.replace('tel:', '').replace(/\s+/g, ' ').trim();
              } else {
                // Check button text and nearby elements
                const buttonText = phoneButton.innerText || phoneButton.textContent || '';
                const phoneMatch = buttonText.match(/(\+?\d[\d\s\-\(\)\.]{8,})/);
                if (phoneMatch) {
                  phone = phoneMatch[1].trim();
                }
              }
            }
          }
          
          // Method 2: Look for phone-related buttons and their parent containers
          if (!phone) {
            const phoneButtons = item.querySelectorAll('[aria-label*="phone"], [aria-label*="Phone"], [data-item-id*="phone"], button[jsaction*="phone"]');
            phoneButtons.forEach(btn => {
              if (!phone) {
                // Check parent elements for phone number
                let parent = btn.parentElement;
                let depth = 0;
                while (parent && depth < 5) {
                  const parentText = parent.innerText || parent.textContent || '';
                  const phoneMatch = parentText.match(/(\+?\d{1,4}[\s\-]?)?\(?\d{2,4}\)?[\s\.\-]?\d{3,4}[\s\.\-]?\d{4}/);
                  if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10) {
                    phone = phoneMatch[0].trim();
                    break;
                  }
                  parent = parent.parentElement;
                  depth++;
                }
              }
            });
          }
          
          // Method 3: Enhanced regex patterns with priority for complete phone numbers
          if (!phone) {
            // Comprehensive phone patterns (sorted by priority)
            const phonePatterns = [
              // International formats with country code
              /\+\d{1,4}[\s\-]?\(?\d{2,4}\)?[\s\.\-]?\d{3,4}[\s\.\-]?\d{4}/g,
              // Indian format: +91 XXXXX XXXXX or +91-XXXXX-XXXXX
              /\+91[\s\-]?[6-9]\d{4}[\s\-]?\d{5}/g,
              // US format: (XXX) XXX-XXXX or XXX-XXX-XXXX
              /\(?\d{3}\)?[\s\.\-]?\d{3}[\s\.\-]?\d{4}/g,
              // Indian mobile without country code: 6-9 followed by 9 digits
              /[6-9]\d{9}(?!\d)/g,
              // General format with spaces/dashes
              /\d{3,4}[\s\.\-]\d{3,4}[\s\.\-]\d{4}/g,
              // Compact 10 digit number
              /\d{10}(?!\d)/g,
            ];
            
            for (const pattern of phonePatterns) {
              const matches = text.match(pattern);
              if (matches && matches.length > 0) {
                // Filter out false positives
                for (const match of matches) {
                  const cleanMatch = match.replace(/\D/g, '');
                  // Validate: should be 10+ digits, not a rating, not in parentheses (reviews)
                  if (cleanMatch.length >= 10 && 
                      !match.match(/^[0-5]\.\d/) && 
                      !text.includes(`(${cleanMatch})`) &&
                      !text.match(new RegExp(`\\(${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`))) {
                    phone = match.trim();
                    break;
                  }
                }
                if (phone) break;
              }
            }
          }
          
          // Method 4: Deep scan of all text nodes for phone numbers
          if (!phone) {
            const allTextDivs = item.querySelectorAll('div, span, a, button');
            for (const el of allTextDivs) {
              if (!phone) {
                const elText = el.textContent || '';
                // Skip if element is too long (likely not just a phone number)
                if (elText.length > 50) continue;
                
                const phoneMatch = elText.match(/(\+?\d{1,4}[\s\-]?)?\(?\d{2,4}\)?[\s\.\-]?\d{3,4}[\s\.\-]?\d{4}/);
                if (phoneMatch) {
                  const cleanNum = phoneMatch[0].replace(/\D/g, '');
                  if (cleanNum.length >= 10 && cleanNum.length <= 15) {
                    phone = phoneMatch[0].trim();
                    break;
                  }
                }
              }
            }
          }
          
          // Method 5: Check for specific Google Maps phone number containers
          if (!phone) {
            const phoneContainers = item.querySelectorAll('[class*="phone"], [class*="Phone"], [class*="contact"], [class*="Contact"]');
            phoneContainers.forEach(container => {
              if (!phone) {
                const containerText = container.textContent || '';
                const phoneMatch = containerText.match(/(\+?\d{1,4}[\s\-]?)?\(?\d{2,4}\)?[\s\.\-]?\d{3,4}[\s\.\-]?\d{4}/);
                if (phoneMatch) {
                  const cleanNum = phoneMatch[0].replace(/\D/g, '');
                  if (cleanNum.length >= 10) {
                    phone = phoneMatch[0].trim();
                  }
                }
              }
            });
          }
          
          // Clean up and format phone number
          if (phone) {
            phone = phone.replace(/\s+/g, ' ').trim();
            // Standardize Indian numbers
            const cleanDigits = phone.replace(/\D/g, '');
            if (cleanDigits.length === 10 && cleanDigits.match(/^[6-9]/)) {
              phone = `+91 ${cleanDigits.substring(0, 5)} ${cleanDigits.substring(5)}`;
            } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
              const mobile = cleanDigits.substring(2);
              phone = `+91 ${mobile.substring(0, 5)} ${mobile.substring(5)}`;
            }
          }
          
          // Extract address (usually after name and before phone/rating)
          let address = '';
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Skip if it's rating, reviews, phone number, or common non-address text
            if (!line.match(/^[0-5]\.[0-9]$/) && 
                !line.match(/^\([0-9,]+\)$/) && 
                !line.match(/(\+91[\s.\-]?)?[6-9]\d{9}/) &&
                !line.match(/(\+?\d{1,3}[\s.\-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{4}/) &&
                line !== name &&
                line.length > 5 &&
                !line.toLowerCase().includes('website') &&
                !line.toLowerCase().includes('directions')) {
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
              phone: phone.trim() || 'N/A',
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

