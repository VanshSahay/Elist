import { analytics } from '../src/lib/analytics';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test analytics functionality
    console.log('🧪 Testing analytics on Vercel...');
    
    // Track a test event
    analytics.trackCommand('test_user_123', 'test_analytics', {
      test: true,
      source: 'vercel_test_endpoint',
      timestamp: new Date().toISOString()
    });
    
    // Flush to ensure event is sent
    await analytics.flush();
    
    const response = {
      success: true,
      message: 'Analytics test completed',
      environment: {
        hasPosthogApiKey: !!process.env.POSTHOG_API_KEY,
        posthogHost: process.env.POSTHOG_HOST || 'default',
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('🧪 Analytics test response:', response);
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Analytics test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}