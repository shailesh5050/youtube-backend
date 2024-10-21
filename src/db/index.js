import mongoose from 'mongoose';

//IIFE async function for connecting to DB
const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/youtube`);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.log('Failed to connect to MongoDB');
    console.log(error.message);
  }
};
export default connectDB;
