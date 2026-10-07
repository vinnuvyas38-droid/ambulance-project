import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { SimulationEngine } from './services/simulation.engine';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, nodeEnv: env.NODE_ENV },
    `🚑 AI Emergency Green Corridor backend running at http://localhost:${env.PORT}`
  );

  // Initialize initial scenario preset
  SimulationEngine.reset('single_ambulance');

  if (env.SIM_AUTOSTART) {
    SimulationEngine.start();
  }
});

function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Graceful shutdown initiated');
  SimulationEngine.pause();
  server.close(() => {
    logger.info('HTTP server closed, process terminating');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
