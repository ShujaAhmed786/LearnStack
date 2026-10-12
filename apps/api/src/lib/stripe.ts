import Stripe from 'stripe';
import { env } from '../env.js';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia' as any,
});

export const isStripeConfigured = (): boolean => {
  return (
    Boolean(env.STRIPE_SECRET_KEY) &&
    !env.STRIPE_SECRET_KEY.includes('placeholder') &&
    env.STRIPE_SECRET_KEY.startsWith('sk_')
  );
};
