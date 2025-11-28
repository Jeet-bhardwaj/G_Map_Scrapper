// Simple test endpoint to verify API routes are working
export default async function handler(req, res) {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      success: true,
      message: 'API test endpoint is working!',
      timestamp: new Date().toISOString(),
      method: req.method
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  }
}

