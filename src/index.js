import dotenv from 'dotenv';
import connectDB from './db/index.js';
import express from 'express';

dotenv.config({
  path: './env',
});

const app = express();

app.use(express.json());

connectDB()
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch(error => {
    console.log('Failed to connect to MongoDB');
    console.log(error.message);
  });
