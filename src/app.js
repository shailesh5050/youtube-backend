import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.static('public'));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

//Route Declarations
import userRoute from './routes/user.routes.js';
app.use('/api/v1/user', userRoute);

export { app };
