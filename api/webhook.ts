import { bot } from '../src/bot';
import { analytics } from '../src/lib/analytics';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Ensure analytics is initialized (important for serverless)
    // This will be a no-op if already initialized
    
    await bot.handleUpdate(req.body);
    
    // Flush analytics events before function terminates (important for serverless)
    await analytics.flush();
    
    res.status(200).send('ok');
  } catch (error: any) {
    console.error('Webhook error:', error);
    
    // Track webhook errors
    analytics.trackError(null, error.message || 'Webhook error', {
      error_type: 'webhook_handler',
      error_stack: error.stack || 'No stack trace',
      request_method: req.method,
      request_url: req.url
    });
    
    // Flush error events
    await analytics.flush();
    
    res.status(500).send('Internal Server Error');
  }
}
