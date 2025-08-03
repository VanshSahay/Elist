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
                flushAt: 1, // Send events immediately in production
                flushInterval: 1000, // Send events every 1 second
            });
            this.isEnabled = true;
            console.log('📊 PostHog analytics initialized');
        } else {
            console.log('⚠️ PostHog API key not found. Analytics disabled.');
        }
    }

    // Track user commands
    trackCommand(userId: string, command: string, properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) return;

        this.posthog.capture({
            distinctId: userId,
            event: 'bot_command',
            properties: {
                command,
                timestamp: new Date().toISOString(),
                ...properties
            }
        });
    }

    // Track waitlist operations
    trackWaitlistEvent(userId: string, event: string, properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) return;

        this.posthog.capture({
            distinctId: userId,
            event: `waitlist_${event}`,
            properties: {
                timestamp: new Date().toISOString(),
                ...properties
            }
        });
    }

    // Track user registration
    trackUserRegistration(userId: string, properties: Record<string, any> = {}) {
        if (!this.isEnabled || !this.posthog) return;

        this.posthog.capture({
            distinctId: userId,
            event: 'user_registered',
            properties: {
                timestamp: new Date().toISOString(),
                ...properties
            }
        });

        // Also identify the user for better tracking
        this.posthog.identify({
            distinctId: userId,
            properties: {
                first_seen: new Date().toISOString(),
                ...properties
            }
        });
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