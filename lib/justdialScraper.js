import puppeteer from 'puppeteer';

export async function searchJustDial(businessName, location, page) {
  try {
    console.log(`[JustDial] Searching: ${businessName} in ${location}`);
    
    // Navigate to JustDial search
    const query = `${businessName} ${location}`;
    const justdialUrl = `https://www.justdial.com/search?q=${encodeURIComponent(query)}`;
    
    await page.goto(justdialUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for results to load
    await page.waitForTimeout(3000);
    
    // Extract information from first matching result
    const justdialData = await page.evaluate((searchName) => {
      const data = {
        phone: '',
        alternatePhone: '',
        email: '',
        website: '',
        timings: '',
        categories: '',
        yearEstablished: ''
      };
      
      // Try to find the first result card
      const firstResult = document.querySelector('.resultbox_info, .store-details, .result-box');
      
      if (!firstResult) return data;
      
      // Extract all phone numbers
      const phoneElements = firstResult.querySelectorAll('[class*="phone"], [class*="contact"], .mobilesv, .telnowpr, a[href^="tel:"]');
      const phones = new Set();
      
      phoneElements.forEach(el => {
        const text = el.textContent || el.getAttribute('href') || '';
        const phoneMatch = text.match(/(\+?\d{1,4}[\s\-]?)?\(?\d{2,4}\)?[\s\.\-]?\d{3,4}[\s\.\-]?\d{4}/);
        if (phoneMatch) {
          const cleanPhone = phoneMatch[0].replace(/\s+/g, ' ').trim();
          if (cleanPhone.replace(/\D/g, '').length >= 10) {
            phones.add(cleanPhone);
          }
        }
      });
      
      const phoneArray = Array.from(phones);
      if (phoneArray.length > 0) {
        data.phone = phoneArray[0];
        if (phoneArray.length > 1) {
          data.alternatePhone = phoneArray.slice(1).join(', ');
        }
      }
      
      // Extract email
      const emailElements = firstResult.querySelectorAll('[class*="email"], a[href^="mailto:"]');
      emailElements.forEach(el => {
        const emailMatch = (el.textContent || el.getAttribute('href') || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && !data.email) {
          data.email = emailMatch[0];
        }
      });
      
      // Extract website
      const websiteElement = firstResult.querySelector('[class*="website"], a[href*="http"]');
      if (websiteElement) {
        const href = websiteElement.getAttribute('href');
        if (href && !href.includes('justdial.com') && !href.includes('tel:') && !href.includes('mailto:')) {
          data.website = href;
        }
      }
      
      // Extract timings
      const timingElement = firstResult.querySelector('[class*="timing"], [class*="hours"], .time');
      if (timingElement) {
        data.timings = timingElement.textContent.trim();
      }
      
      // Extract categories/services
      const categoryElements = firstResult.querySelectorAll('[class*="category"], [class*="service"], .tags');
      const categories = [];
      categoryElements.forEach(el => {
        const text = el.textContent.trim();
        if (text && text.length < 100) {
          categories.push(text);
        }
      });
      if (categories.length > 0) {
        data.categories = categories.join(', ');
      }
      
      // Extract year established
      const yearMatch = firstResult.textContent.match(/(?:Since|Established|Est\.?)\s*:?\s*(\d{4})/i);
      if (yearMatch) {
        data.yearEstablished = yearMatch[1];
      }
      
      return data;
    }, businessName);
    
    console.log(`[JustDial]   📞 Found: ${justdialData.phone || 'No phone'}`);
    
    return justdialData;
    
  } catch (error) {
    console.error(`[JustDial] Error searching ${businessName}:`, error.message);
    return {
      phone: '',
      alternatePhone: '',
      email: '',
      website: '',
      timings: '',
      categories: '',
      yearEstablished: ''
    };
  }
}
