import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual publishable key or use env var
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublicKey || stripePublicKey === 'pk_test_placeholder') {
    console.warn('STRIPE: VITE_STRIPE_PUBLISHABLE_KEY is missing or using placeholder in .env.local');
}

export const stripePromise = loadStripe(stripePublicKey || 'pk_test_placeholder');
