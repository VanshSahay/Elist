import { PostHog } from 'posthog-node';

export class Analytics {
    private posthog: PostHog | null = null;
    private isEnabled: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const apiKey = process.env.POSTHOG_API_KEY;
        const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

        if (apiKey) {
            this.posthog = new PostHog(apiKey, {
                host: host,
                flushAt: 1, // Send events immediately (important for serverless)
                flushInterval: 100, // Flush quickly in serverless environments
                disableGeoip: false
            });
            this.isEnabled = true;
            console.log('📊 PostHog analytics initialized for', process.env.VERCEL ? 'Vercel serverless' : 'local development');
            
            // Test event to verify connection works
            this.posthog.capture({
                distinctId: 'system',
                event: 'analytics_initialized',
                properties: {
                    environment: process.env.VERCEL ? 'vercel' : 'local',
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            console.log('⚠️ PostHog API key not found. Analytics disabled.');
            console.log('Environment check:', {
                hasApiKey: !!apiKey,
                isVercel: !!process.env.VERCEL,
                nodeEnv: process.env.NODE_ENV
            });
        }
    }

    // Force flush events (important for serverless)
    async flush() {
        if (this.posthog) {
            try {
                await this.posthog.flush();
            } catch (e) {
                console.error('Failed to flush PostHog events:', e);
            }
        }
    }

    // Track user commands
    trackCommand(userId: string, command: string, properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) {
            console.log('Analytics disabled, skipping trackCommand:', command);
            return;
        }

        console.log('📊 Tracking command:', command, 'for user:', userId);
        this.posthog.capture({
            distinctId: userId,
            event: 'bot_command',
            properties: {
                command,
                timestamp: new Date().toISOString(),
                environment: process.env.VERCEL ? 'vercel' : 'local',
                ...properties
            }
        });

        // Immediate flush for serverless environments
        if (process.env.VERCEL) {
            this.flush().catch(e => console.error('Flush error:', e));
        }
    }

    // Track waitlist operations
    trackWaitlistEvent(userId: string, event: string, properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) return;

        console.log('📊 Tracking waitlist event:', event, 'for user:', userId);
        this.posthog.capture({
            distinctId: userId,
            event: `waitlist_${event}`,
            properties: {
                timestamp: new Date().toISOString(),
                environment: process.env.VERCEL ? 'vercel' : 'local',
                ...properties
            }
        });

        // Immediate flush for serverless environments
        if (process.env.VERCEL) {
            this.flush().catch(e => console.error('Flush error:', e));
        }
    }

    // Track user registration
    trackUserRegistration(userId: string, properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) return;

        console.log('📊 Tracking user registration for user:', userId);
        this.posthog.capture({
            distinctId: userId,
            event: 'user_registered',
            properties: {
                timestamp: new Date().toISOString(),
                environment: process.env.VERCEL ? 'vercel' : 'local',
                ...properties
            }
        });

        // Also identify the user for better tracking
        this.posthog.identify({
            distinctId: userId,
            properties: {
                first_seen: new Date().toISOString(),
                environment: process.env.VERCEL ? 'vercel' : 'local',
                ...properties
            }
        });

        // Immediate flush for serverless environments
        if (process.env.VERCEL) {
            this.flush().catch(e => console.error('Flush error:', e));
        }
    }

    // Track subscription events
    trackSubscription(userId: string, action: 'subscribe' | 'unsubscribe', properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) return;

        this.posthog.capture({
            distinctId: userId,
            event: `subscription_${action}`,
            properties: {
                timestamp: new Date().toISOString(),
                ...properties
            }
        });
    }

    // Track broadcast events
    trackBroadcast(userId: string, properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) return;

        this.posthog.capture({
            distinctId: userId,
            event: 'broadcast_sent',
            properties: {
                timestamp: new Date().toISOString(),
                ...properties
            }
        });
    }

    // Track errors
    trackError(userId: string | null, error: string, properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) return;

        this.posthog.capture({
            distinctId: userId || 'anonymous',
            event: 'bot_error',
            properties: {
                error,
                timestamp: new Date().toISOString(),
                ...properties
            }
        });
    }

    // Track bot startup
    trackBotStartup() {
        if (!this.isEnabled || !this.posthog) return;

        this.posthog.capture({
            distinctId: 'bot_system',
            event: 'bot_startup',
            properties: {
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0'
            }
        });
    }

    // Flush events before shutdown
    async shutdown() {
        if (this.posthog) {
            await this.posthog.shutdown();
            console.log('📊 PostHog analytics shut down');
        }
    }
}

// Export singleton instance
export const analytics = new Analytics();