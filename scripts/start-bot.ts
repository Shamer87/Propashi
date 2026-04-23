import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local BEFORE importing anything else
config({ path: path.resolve(process.cwd(), '.env.local') });

async function start() {
  const { default: bot } = await import('../src/lib/bot');

  console.log('Starting Telegram Bot in long-polling mode...');
  bot.launch().then(() => {
    console.log('Telegram Bot is running! Press Ctrl+C to stop.');
  }).catch((err: any) => {
    console.error('Failed to start bot:', err);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

start();
