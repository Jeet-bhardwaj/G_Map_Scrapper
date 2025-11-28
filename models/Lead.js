import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  website: String,
  rating: String,
  reviews: String,
  keyword: String,
  location: String,
  googleMapsLink: { type: String, unique: true },
  scrapedAt: { type: Date, default: Date.now },
});

// Prevent model overwrite error in dev mode
export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

