import express, { Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dontenv from 'dotenv';

dontenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

const port = 3000;

app.get('/', (_, res: Response) => {
  res.send('Check - Success');
});

import userRouter from './routes/user.route';
import authRouter from './routes/auth.route';
import gameRouter from './routes/game.route';
import dailyTournamentRouter from './routes/dailyTour.route';
import soloRouter from './routes/solo.route';
import instantRouter from './routes/instant.route';
import { errorHandler } from './middlewares/error.middleware';
import adminRoute from './routes/admin/admin.route';
import rewardsRoute from './routes/rewards.route';
import cronRouter from './routes/cron.route';

app.use('/api/user', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/game', gameRouter);
app.use('/api/daily', dailyTournamentRouter);
app.use('/api/solo', soloRouter);
app.use('/api/cron', cronRouter);
app.use('/api/instant', instantRouter);
// app.use('/api/rewards', rewardsRoute);

// // app.use('/api/admin/login', adminLogin);
// app.use('/api/admin/', adminRoute);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening to port: ${port}`);
});
