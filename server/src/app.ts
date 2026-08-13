import cors from 'cors';
import express from 'express';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'TokTickIT API' });
  });

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  return app;
}
