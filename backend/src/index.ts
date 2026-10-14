import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import ridesRoutes from './routes/rides.routes';
import stopsRoutes from './routes/stops.routes';
import bookingsRoutes from './routes/bookings.routes';
import adminRoutes from './routes/admin.routes';
import * as authController from './controllers/auth.controller';
import { authenticateJwt } from './middleware/auth';
import { startHoldExpiryJob } from './jobs/holdExpiry.job';

const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

app.use(express.json());

// Request logging in development
if (config.nodeEnv !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// Primary API Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.get('/me', authenticateJwt, authController.me);
app.get('/api/me', authenticateJwt, authController.me);

app.use('/rides', ridesRoutes);
app.use('/api/rides', ridesRoutes);

app.use('/stops', stopsRoutes);
app.use('/api/stops', stopsRoutes);

app.use('/bookings', bookingsRoutes);
app.use('/api/bookings', bookingsRoutes);

app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`================================================================`);
    console.log(` Campus Ride-Pooling Backend running on port ${config.port}`);
    console.log(` College Email Domain: ${config.collegeEmailDomain}`);
    console.log(` Database: ${config.db.database} @ ${config.db.host}:${config.db.port}`);
    console.log(`================================================================`);

    // Start 30s background hold expiry worker
    startHoldExpiryJob(30);
  });
}

export default app;
