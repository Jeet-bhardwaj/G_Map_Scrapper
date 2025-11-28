// Test endpoint to check if environment variables are loaded
export default async function handler(req, res) {
  try {
    res.setHeader('Content-Type', 'application/json');
    
    const mongoUri = process.env.MONGODB_URI;
    const hasMongoUri = !!mongoUri;
    const mongoUriPreview = mongoUri 
      ? `${mongoUri.substring(0, 30)}...${mongoUri.substring(mongoUri.length - 20)}` 
      : 'NOT FOUND';
    
    res.status(200).json({
      success: true,
      message: 'Environment check',
      hasMongoUri: hasMongoUri,
      mongoUriPreview: mongoUriPreview,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('MONGO') || key.includes('DB')),
      nodeEnv: process.env.NODE_ENV,
      note: hasMongoUri 
        ? 'MONGODB_URI is loaded! Restart the server if you just updated .env.local'
        : 'MONGODB_URI is NOT loaded. Make sure .env.local exists in the project root and restart the server.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  }
}

