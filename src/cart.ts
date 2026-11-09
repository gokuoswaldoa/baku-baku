import { dips, finishes, product, toppings } from './order-config';

export interface Personalization {
  finish: (typeof finishes)[number];
  toppings: (typeof toppings)[number][];
  dip: (typeof dips)[number];
}

export interface CartItem extends Personalization {
  id: string;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  needsReview: boolean;
}

export const cartStorageKey = 'baku-cart-v1';
export const maxQuantity = 99;
export const maxLines = 50;

export function validQuantity(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= maxQuantity;
}

export function validPersonalization(value: unknown): value is Personalization {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return finishes.some(option => option === item.finish)
    && dips.some(option => option === item.dip)
    && Array.isArray(item.toppings)
    && item.toppings.length <= 2
    && new Set(item.toppings).size === item.toppings.length
    && item.toppings.every(topping => toppings.some(option => option === topping));
}

export function samePersonalization(a: Personalization, b: Personalization) {
  return a.finish === b.finish && a.dip === b.dip
    && a.toppings.length === b.toppings.length
    && a.toppings.every(topping => b.toppings.includes(topping));
}

export function restoreCart(raw: string | null): CartState {
  const empty: CartState = { items: [], needsReview: false };
  if (raw === null) return empty;
  if (raw.length > 100000) return { ...empty, needsReview: true };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...empty, needsReview: true };
    const saved = parsed as Record<string, unknown>;
    if (saved.version !== 1 || !Array.isArray(saved.items)) return { ...empty, needsReview: true };
    const items: CartItem[] = [];
    let needsReview = saved.needsReview === true;
    for (const candidate of saved.items) {
      if (!validPersonalization(candidate)) {
        needsReview = true;
        continue;
      }
      const line = candidate as Personalization & Record<string, unknown>;
      if (typeof line.id !== 'string' || !/^[\w-]{1,80}$/.test(line.id)
        || items.some(item => item.id === line.id)
        || typeof line.quantity !== 'number' || !validQuantity(line.quantity)
        || items.length >= maxLines) {
        needsReview = true;
        continue;
      }
      items.push({ id: line.id, quantity: line.quantity, finish: line.finish, dip: line.dip, toppings: [...line.toppings] });
    }
    return { items, needsReview };
  } catch {
    return { ...empty, needsReview: true };
  }
}

export function cartTotals(items: readonly CartItem[]) {
  const quantity = items.reduce((total, item) => total + item.quantity, 0);
  return { quantity, subtotal: quantity * product.unitPrice };
}
