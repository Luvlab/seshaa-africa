import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import listingsRouter from './routes/listings';
import adsRouter from './routes/ads';
import authRouter from './routes/auth';
import salesRepsRouter from './routes/salesreps';
import aiRouter from './routes/ai';
import chatRouter from './routes/chat';
import adminRouter from './routes/admin';
import uploadRouter from './routes/upload';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0', app: 'Seshaa API' }));

app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/ads', adsRouter);
app.use('/api/salesreps', salesRepsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`🌍 Seshaa API running on port ${config.port}`);
});

export default app;
