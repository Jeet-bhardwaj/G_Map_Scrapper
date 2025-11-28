// Test MongoDB connection endpoint
import dbConnect from '../../lib/dbConnect';

export default async function handler(req, res) {
  try {
    res.setHeader('Content-Type', 'application/json');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return res.status(500).json({
        success: false,
        message: 'MONGODB_URI environment variable is not set',
        note: 'Make sure .env.local exists and contains MONGODB_URI'
      });
    }

    // Show connection string preview (masked)
    const uriPreview = mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    const hostnameMatch = mongoUri.match(/@([^/]+)/);
    const hostname = hostnameMatch ? hostnameMatch[1] : 'unknown';

    // Try to connect
    try {
      await dbConnect();
      return res.status(200).json({
        success: true,
        message: 'MongoDB connection successful!',
        hostname: hostname,
        connectionStringPreview: uriPreview,
        note: 'Database connection is working correctly'
      });
    } catch (dbError) {
      return res.status(500).json({
        success: false,
        message: 'MongoDB connection failed',
        error: dbError.message,
        hostname: hostname,
        connectionStringPreview: uriPreview,
        troubleshooting: [
          '1. Verify the hostname is correct in MongoDB Atlas',
          '2. Check if your IP address is whitelisted in Network Access',
          '3. Ensure the cluster is running',
          '4. Verify username and password are correct',
          '5. Check your internet connection'
        ]
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  }
}

