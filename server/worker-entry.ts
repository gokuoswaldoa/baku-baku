import { DurableObject } from 'cloudflare:workers';
import worker, { CheckoutLimits } from './checkout-worker';

export class CheckoutLimiter extends DurableObject {
  private readonly limits: CheckoutLimits;

  constructor(ctx: ConstructorParameters<typeof CheckoutLimits>[0], env: unknown) {
    super(ctx, env);
    this.limits = new CheckoutLimits(ctx);
  }

  fetch(request: Request) { return this.limits.fetch(request); }
}

export default worker;
