import puppeteer from 'puppeteer';
import path from 'path';
import os from 'os';

export async function scrapeGoogleMaps(keyword, location, minRating = 0, maxResults = 50) {
  // Use headless mode in production, non-headless in development
  const isHeadless = process.env.NODE_ENV === 'production' || process.env.PUPPETEER_HEADLESS === 'true';
  
  // Check if user wants to use browser profile (default: true for development, false for production)
  const useBrowserProfile = process.env.USE_CHROME_PROFILE !== 'false' && process.env.NODE_ENV !== 'production';
  
  // Get platform info early
  const platform = os.platform();
  
  // Detect Brave executable path
  let executablePath;
  if (platform === 'win32') {
    // Windows Brave locations
    const bravePaths = [
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ];
    executablePath = bravePaths.find(p => {
      const fs = require('fs');
      return fs.existsSync(p);
    });
  } else if (platform === 'darwin') {
    // macOS
    executablePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
  } else {
    // Linux
    executablePath = '/usr/bin/brave-browser';
  }
  
  if (executablePath) {
    console.log(`[Scraper] 🦁 Using Brave Browser: ${executablePath}`);
  } else {
    console.log(`[Scraper] ⚠️  Brave not found, will use default Chromium`);
  }
  
  let launchOptions = {
    headless: isHeadless ? 'new' : false,
    executablePath: executablePath, // Use Brave if found
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
  
  // Try to use Brave profile first, fallback to guest mode if it fails
  if (useBrowserProfile) {
    try {
      // IMPORTANT: First check if Brave is running
      const { execSync } = require('child_process');
      try {
        if (platform === 'win32') {
          const braveProcesses = execSync('tasklist /FI "IMAGENAME eq brave.exe" /NH', { encoding: 'utf-8' });
          if (braveProcesses.includes('brave.exe')) {
            console.warn(`[Scraper] ⚠️  Brave Browser is currently running!`);
            console.warn(`[Scraper] ⚠️  Please close Brave first, then try again.`);
            console.warn(`[Scraper] 💡 Quick fix: Run this command: Get-Process brave -ErrorAction SilentlyContinue | Stop-Process -Force`);
            throw new Error('Brave is running - profile is locked');
          }
        }
      } catch (checkError) {
        console.log(`[Scraper] Could not check Brave processes: ${checkError.message}`);
      }
      
      // Get Brave user data directory based on OS
      let userDataDir;
      
      if (platform === 'win32') {
        // Windows - Brave profile location
        userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data');
      } else if (platform === 'darwin') {
        // macOS
        userDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser');
      } else {
        // Linux
        userDataDir = path.join(os.homedir(), '.config', 'BraveSoftware', 'Brave-Browser');
      }
      
      // Use custom profile name if specified, otherwise use Default
      const profileName = process.env.CHROME_PROFILE_NAME || 'Default';
      
      console.log(`[Scraper] 🦁 Attempting to use Brave profile: ${profileName}`);
      console.log(`[Scraper] Profile directory: ${userDataDir}`);
      
      const profileOptions = { ...launchOptions };
      profileOptions.userDataDir = userDataDir;
      profileOptions.args = [...launchOptions.args, `--profile-directory=${profileName}`];
      
      // Try launching with profile
      browser = await puppeteer.launch(profileOptions);
      console.log(`[Scraper] ✅ Successfully launched with Brave profile`);
    } catch (error) {
      console.warn(`[Scraper] ⚠️  Could not use Brave profile: ${error.message}`);
      console.warn(`[Scraper] ⚠️  Falling back to guest mode...`);
      console.warn(`[Scraper] 💡 Tip: Close ALL Brave windows and try again for better results`);
      
      // Fallback to guest mode
      browser = null;
    }
  }
  
  // If profile launch failed or not requested, use guest mode
  if (!browser) {
    console.log(`[Scraper] Using guest mode (no Brave profile)`);
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

    console.log('[Scraper] 📞 Extracting business information with phone numbers...');
    console.log('[Scraper] 💡 Clicking into each listing to get contact details...');

    // Get all business links first
    const businessLinks = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[role="article"]'));
      const links = [];
      
      items.forEach(item => {
        const linkElement = item.querySelector('a[href*="maps/place"]');
        const name = item.getAttribute('aria-label');
        if (linkElement && name) {
          links.push({
            url: linkElement.href,
            name: name
          });
        }
      });
      
      return links;
    });

    console.log(`[Scraper] Found ${businessLinks.length} businesses. Extracting details...`);

    const leads = [];
    let processedCount = 0;
    
    // Process each business (limit to maxResults)
    for (const business of businessLinks.slice(0, maxResults)) {
      try {
        processedCount++;
        console.log(`[Scraper] [${processedCount}/${Math.min(businessLinks.length, maxResults)}] Processing: ${business.name}`);
        
        // Click the business listing to open details panel
        await page.evaluate((url) => {
          const links = Array.from(document.querySelectorAll('a[href*="maps/place"]'));
          const targetLink = links.find(link => link.href === url);
          if (targetLink) {
            targetLink.click();
          }
        }, business.url);
        
        // Wait for detail panel to load
        await page.waitForTimeout(2000);
        
        // Extract detailed information from the side panel
        const businessDetails = await page.evaluate(() => {
          const details = {
            name: '',
            address: '',
            phone: '',
            website: '',
            rating: 'N/A',
            reviews: '0'
          };
          
          // Get name from the detail panel
          const nameElement = document.querySelector('h1.DUwDvf, h1.fontHeadlineLarge');
          if (nameElement) {
            details.name = nameElement.innerText.trim();
          }
          
          // Get phone number - MULTIPLE METHODS
          // Method 1: Phone button with aria-label
          let phoneButton = document.querySelector('button[data-item-id*="phone"], button[aria-label*="hone"], button[data-tooltip*="hone"]');
          if (phoneButton) {
            const ariaLabel = phoneButton.getAttribute('aria-label') || '';
            const dataTooltip = phoneButton.getAttribute('data-tooltip') || '';
            const buttonText = phoneButton.innerText || '';
            
            // Extract from aria-label or tooltip
            const phoneMatch = (ariaLabel + ' ' + dataTooltip + ' ' + buttonText).match(/(\+?\d[\d\s\-\(\)\.]{8,})/);
            if (phoneMatch) {
              details.phone = phoneMatch[1].trim();
            }
          }
          
          // Method 2: Search for phone in all buttons
          if (!details.phone) {
            const allButtons = Array.from(document.querySelectorAll('button'));
            for (const btn of allButtons) {
              const btnText = btn.getAttribute('aria-label') || btn.innerText || '';
              const phoneMatch = btnText.match(/(\+?\d{1,4}[\s\-]?)?\(?\d{2,4}\)?[\s\.\-]?\d{3,4}[\s\.\-]?\d{4}/);
              if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10) {
                details.phone = phoneMatch[0].trim();
                break;
              }
            }
          }
          
          // Method 3: Search in all text content
          if (!details.phone) {
            const phoneElements = document.querySelectorAll('[data-item-id*="phone"], [class*="phone"], [class*="Phone"]');
            for (const el of phoneElements) {
              const text = el.innerText || el.textContent || '';
              const phoneMatch = text.match(/(\+?\d{1,4}[\s\-]?)?\(?\d{2,4}\)?[\s\.\-]?\d{3,4}[\s\.\-]?\d{4}/);
              if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10) {
                details.phone = phoneMatch[0].trim();
                break;
              }
            }
          }
          
          // Method 4: Click the phone button to reveal number
          if (!details.phone) {
            const phoneRevealButtons = document.querySelectorAll('button[jsaction*="phone"]');
            phoneRevealButtons.forEach(btn => btn.click());
          }
          
          // Get address
          const addressButton = document.querySelector('button[data-item-id="address"]');
          if (addressButton) {
            const addressText = addressButton.getAttribute('aria-label') || addressButton.innerText || '';
            // Remove "Address: " prefix if present
            details.address = addressText.replace(/^Address:\s*/i, '').trim();
          }
          
          // Get website
          const websiteLink = document.querySelector('a[data-item-id="authority"]');
          if (websiteLink) {
            details.website = websiteLink.href;
          }
          
          // Get rating
          const ratingElement = document.querySelector('div.F7nice span[aria-hidden="true"]');
          if (ratingElement) {
            details.rating = ratingElement.innerText.trim();
          }
          
          // Get reviews count
          const reviewsElement = document.querySelector('div.F7nice span[aria-label*="reviews"]');
          if (reviewsElement) {
            const reviewMatch = reviewsElement.getAttribute('aria-label').match(/([0-9,]+)/);
            if (reviewMatch) {
              details.reviews = reviewMatch[1];
            }
          }
          
          return details;
        });
        
        // Use the extracted details or fallback to business name from list
        const lead = {
          name: businessDetails.name || business.name,
          address: businessDetails.address || 'N/A',
          phone: businessDetails.phone || 'N/A',
          website: businessDetails.website || '',
          rating: businessDetails.rating,
          reviews: businessDetails.reviews,
          googleMapsLink: business.url
        };
        
        // Filter by minimum rating if specified
        const ratingNum = parseFloat(lead.rating);
        if (minRating > 0 && (isNaN(ratingNum) || ratingNum < minRating)) {
          console.log(`[Scraper]   ⏭️  Skipped (rating ${lead.rating} < ${minRating})`);
          continue;
        }
        
        leads.push(lead);
        console.log(`[Scraper]   ✅ ${lead.name}`);
        console.log(`[Scraper]      📞 Phone: ${lead.phone}`);
        console.log(`[Scraper]      ⭐ Rating: ${lead.rating} (${lead.reviews} reviews)`);
        
        // Don't process more than maxResults
        if (leads.length >= maxResults) {
          console.log(`[Scraper] Reached maximum results limit: ${maxResults}`);
          break;
        }
        
      } catch (error) {
        console.error(`[Scraper] Error processing ${business.name}:`, error.message);
        continue;
      }
    }

    console.log(`[Scraper] 🎉 Extraction complete! Found ${leads.length} businesses with details.`);

    await browser.close();
    return leads;
    
  } catch (error) {
    console.error("Scraping error:", error);
    await browser.close();
    return [];
  }
}

