import * as dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        sendDefaultPii: true,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
    });
    console.log('Sentry initialized');
} else {
    console.log('SENTRY_DSN not set — Sentry disabled');
}