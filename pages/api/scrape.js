import dbConnect from '../../lib/dbConnect';
import Lead from '../../models/Lead';
import { scrapeGoogleMaps } from '../../lib/scraper';

// Increase API route timeout for long-running scrapes
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 300, // 5 minutes for Vercel, but Next.js dev server doesn't have this limit
};

// Main handler function
async function handleRequest(req, res) {
  // Set JSON content type header immediately
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  // Set a timeout for the entire request (5 minutes)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        message: 'Request timeout. The scraping process took too long. Try reducing max results or check your internet connection.'
      });
    }
  }, 300000); // 5 minutes

  // Ensure we always return JSON
  const sendJSON = (status, data) => {
    clearTimeout(timeout);
    if (!res.headersSent) {
      try {
        res.status(status).json(data);
      } catch (err) {
        console.error('[API] Error sending JSON response:', err);
        if (!res.headersSent) {
          try {
            res.status(500).json({ 
              success: false,
              message: 'Failed to send response',
              error: err.message 
            });
          } catch (finalErr) {
            console.error('[API] Critical: Cannot send any response:', finalErr);
          }
        }
      }
    }
  };

  try {
    if (req.method !== 'POST') {
      return sendJSON(405, { message: 'Method Not Allowed' });
    }

    const { keyword, location, minRating = 0, maxResults = 50 } = req.body;

    if (!keyword || !location) {
      return sendJSON(400, { message: 'Keyword and location are required' });
    }

    console.log(`[API] Starting scrape for: ${keyword} in ${location}`);

    // Connect to database
    try {
      await dbConnect();
      console.log('[API] Database connected successfully');
    } catch (dbError) {
      console.error('[API] Database connection error:', dbError);
      return sendJSON(500, { 
        success: false,
        message: 'Database connection failed: ' + dbError.message,
        error: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
      });
    }
    
    // Run the scraper with timeout protection
    let leads = [];
    try {
      console.log('[API] Starting Puppeteer scraper...');
      console.log('[API] Parameters:', { keyword, location, minRating, maxResults });
      
      // Wrap scraper in a promise with timeout
      const scraperPromise = scrapeGoogleMaps(keyword, location, minRating, maxResults);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Scraper timeout after 4 minutes')), 240000)
      );
      
      leads = await Promise.race([scraperPromise, timeoutPromise]);
      console.log(`[API] Scraper returned ${leads?.length || 0} leads`);
    } catch (scraperError) {
      console.error('[API] Scraper error:', scraperError);
      console.error('[API] Error stack:', scraperError.stack);
      
      // Check if it's a Puppeteer launch error
      if (scraperError.message.includes('Could not find Chrome') || 
          scraperError.message.includes('Executable doesn\'t exist') ||
          scraperError.message.includes('No usable sandbox')) {
        return sendJSON(500, { 
          success: false,
          message: 'Puppeteer cannot find Chrome. Please install Chrome or Chromium.',
          error: 'Chrome/Chromium not found. Puppeteer needs Chrome to run.'
        });
      }
      
      return sendJSON(500, { 
        success: false,
        message: 'Scraping failed: ' + scraperError.message,
        error: process.env.NODE_ENV === 'development' ? scraperError.stack : undefined
      });
    }
    
    if (!leads || leads.length === 0) {
      return sendJSON(200, { 
        success: false, 
        message: 'No leads found. Try different keywords or location.' 
      });
    }

    // Save to DB (Avoid Duplicates)
    let savedCount = 0;
    const savedLeads = [];

    try {
      for (const lead of leads) {
        try {
          // Use Link as unique identifier
          const exists = await Lead.findOne({ googleMapsLink: lead.googleMapsLink });
          if (!exists && lead.name) {
            const newLead = await Lead.create({ ...lead, keyword, location });
            savedLeads.push(newLead);
            savedCount++;
          } else if (exists) {
            // Include existing leads in response but don't count as newly saved
            savedLeads.push(exists);
          }
        } catch (leadError) {
          // Skip individual lead errors but continue processing
          console.warn(`[API] Error saving lead ${lead.name}:`, leadError.message);
        }
      }
    } catch (dbSaveError) {
      console.error('[API] Database save error:', dbSaveError);
      // Still return the leads even if DB save failed
      return sendJSON(200, {
        success: true,
        count: leads.length,
        newlySaved: 0,
        data: leads,
        warning: 'Leads scraped but not saved to database: ' + dbSaveError.message
      });
    }

    return sendJSON(200, {
      success: true,
      count: leads.length,
      newlySaved: savedCount,
      data: savedLeads.length > 0 ? savedLeads : leads
    });
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    console.error('[API] Error stack:', error.stack);
    return sendJSON(500, { 
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Export handler with error wrapper to catch ALL errors including import errors
export default async function handler(req, res) {
  try {
    return await handleRequest(req, res);
  } catch (error) {
    // Catch any error that happens before or during handler execution
    console.error('[API] CRITICAL: Unhandled error in handler wrapper:', error);
    console.error('[API] Error stack:', error.stack);
    
    // Try to send JSON error response
    if (!res.headersSent) {
      try {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
          success: false,
          message: 'Critical server error: ' + (error.message || 'Unknown error'),
          error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          type: 'HandlerWrapperError'
        });
      } catch (sendError) {
        // If we can't send JSON, log it
        console.error('[API] CRITICAL: Cannot send error response:', sendError);
      }
    }
  }
}
