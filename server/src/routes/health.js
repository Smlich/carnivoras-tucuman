import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/', (request, response) => {
  const databaseConnected = isDatabaseConnected();

  response.status(200).json({
    data: {
      service: 'carnivoras-tucuman-api',
      status: databaseConnected ? 'ok' : 'degraded',
      database: databaseConnected ? 'connected' : 'not-configured',
      catalogMode: databaseConnected ? 'mongodb' : 'demo-catalog',
    },
  });
});
