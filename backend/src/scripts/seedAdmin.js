import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@devproof.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'DevProof@Admin2025!';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devproof';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    } else {
      await User.create({
        email: ADMIN_EMAIL,
        passwordHash: ADMIN_PASSWORD, // pre-save hook hashes it
        fullName: 'DevProof Admin',
        role: 'admin'
      });
      console.log(`Admin user created: ${ADMIN_EMAIL}`);
    }

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
