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
import ambassadorRouter from './routes/ambassador';
import paymentsRouter from './routes/payments';
import geoRouter from './routes/geo';
import reviewsRouter from './routes/reviews';
import bookingsRouter from './routes/bookings';
import bankRouter from './routes/bank';
import certificationsRouter from './routes/certifications';
import interestsRouter from './routes/interests';
import newsRouter from './routes/news';
import classifiedsRouter from './routes/classifieds';
import pricesRouter from './routes/prices';
import translationsRouter from './routes/translations';
import eventsRouter from './routes/events';
import eventDiscoverRouter from './routes/eventDiscover';
import promotionsRouter from './routes/promotions';
import merchRouter from './routes/merch';
import radioRouter from './routes/radio';
import messagesRouter from './routes/messages';
import ridesRouter from './routes/rides';
import analyticsRouter from './routes/analytics';
import followsRouter from './routes/follows';
import marketRouter from './routes/market';
import groupsRouter from './routes/groups';
import cronRouter from './routes/cron';

const app = express();

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app') || origin.endsWith('.seshaa.africa') || origin === 'https://www.seshaa.africa' || origin === 'https://seshaa.africa')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));

// Raw body needed for Stripe webhook signature verification
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/', (_req, res) => res.redirect('/health'));
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '2.0.0', app: 'Seshaa API' }));

app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/ads', adsRouter);
app.use('/api/salesreps', salesRepsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/ambassador', ambassadorRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/geo', geoRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/bank', bankRouter);
app.use('/api/certifications', certificationsRouter);
app.use('/api/interests', interestsRouter);
app.use('/api/news', newsRouter);
app.use('/api/classifieds', classifiedsRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/translations', translationsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/events', eventDiscoverRouter);
app.use('/api/promotions', promotionsRouter);
app.use('/api/merch', merchRouter);
app.use('/api/radio', radioRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/rides', ridesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/follows', followsRouter);
app.use('/api/market', marketRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/cron', cronRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start the HTTP server when running locally (not on Vercel serverless)
if (process.env.VERCEL !== '1') {
  app.listen(config.port, () => {
    console.log(`🌍 Seshaa API v2 running on port ${config.port}`);
  });
}

export default app;
