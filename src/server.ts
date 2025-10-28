import express, { Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

const port = 3000;

app.get('/', (_, res: Response) => {
  res.send('Hello niga, meow meow');
});

import userRouter from './routes/user.route';

app.use('/api', userRouter);

app.listen(port, () => {
  console.log(`Server listening to port: ${port}`);
});
