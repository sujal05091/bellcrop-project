const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

const connectMongo = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed (audit logging will be unavailable):', err.message);
    isConnected = false;
  }
};

const isMongoConnected = () => isConnected;

module.exports = { connectMongo, isMongoConnected };
