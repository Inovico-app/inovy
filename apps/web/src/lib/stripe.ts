import "server-only";

import Stripe from "stripe";

let _stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY environment variable is not set. Stripe integration requires this key.",
      );
    }
    _stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripeClient;
}
