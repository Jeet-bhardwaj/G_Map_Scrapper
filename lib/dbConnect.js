import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // Check for MONGODB_URI inside the function (not at module level)
  // This ensures Next.js has loaded .env.local
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local. Make sure to restart the Next.js server after creating/modifying .env.local');
  }

  // Log connection attempt (masked for security)
  const uriPreview = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log('[DB] Attempting to connect to MongoDB...', uriPreview);

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('[DB] Successfully connected to MongoDB');
      return mongoose;
    }).catch((error) => {
      console.error('[DB] MongoDB connection error:', error.message);
      console.error('[DB] Connection string preview:', uriPreview);
      
      // Provide helpful error messages
      if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv')) {
        throw new Error(`DNS lookup failed for MongoDB cluster. Please verify:
1. The cluster hostname in your connection string is correct
2. Your internet connection is working
3. The MongoDB Atlas cluster is running
4. Your IP address is whitelisted in MongoDB Atlas Network Access
Connection string preview: ${uriPreview}`);
      }
      
      if (error.message.includes('authentication failed')) {
        throw new Error(`MongoDB authentication failed. Please verify:
1. The username and password in your connection string are correct
2. The database user exists in MongoDB Atlas
Connection string preview: ${uriPreview}`);
      }
      
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;

