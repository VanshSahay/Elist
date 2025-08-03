import { bot } from './bot';
import { analytics } from './lib/analytics';

// Start the bot
bot.launch();

console.log('🤖 Elist Bot is running...');

// Graceful shutdown
process.once('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await analytics.shutdown();
    bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await analytics.shutdown();
    bot.stop('SIGTERM');
    process.exit(0);
});
