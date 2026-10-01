import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { authRouter, requireAuth } from './server/auth';
import { productsRouter } from './server/products';
import { customersRouter } from './server/customers';
import { billsRouter } from './server/bills';
import { paymentsRouter } from './server/payments';
import { dashboardRouter } from './server/dashboard';
import { settingsRouter } from './server/settings';
import { getDatabase } from './server/db';

// Pre-initialize and seed DB if empty
getDatabase();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Steel Sariya & Cement Billing Portal' });
  });

  // Mount API endpoints
  app.use('/api/auth', authRouter);
  app.use('/api/products', requireAuth, productsRouter);
  app.use('/api/customers', requireAuth, customersRouter);
  app.use('/api/bills', requireAuth, billsRouter);
  app.use('/api/payments', requireAuth, paymentsRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/settings', requireAuth, settingsRouter);

  // Dev vs Production static handling
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Steel & Cement Billing Server active at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
