import type { CheckoutDetails } from './checkout';
import type { CartItem } from './cart';
import { product } from './order-config';

const optionIds: Record<CartItem['finish'] | CartItem['toppings'][number] | CartItem['dip'], string> = {
  'Con salsa de anguila': 'anguila',
  'Sin salsa encima': 'sin-salsa',
  'Ajonjolí blanco tostado': 'ajonjoli',
  'Cebollín': 'cebollin',
  'Aguacate': 'aguacate',
  'Cebolla crujiente': 'cebolla-crujiente',
  'Jalapeño en rodajas': 'jalapeno',
  'Panko crujiente extra': 'panko-extra',
  'Soya con jalapeño y cebollín': 'soya-jalapeno',
  'Mayo chipotle': 'mayo-chipotle',
  'Soya clásica': 'soya-clasica',
  'Valentina': 'valentina',
  'Sin dip': 'sin-dip',
};

const localCheckoutEnabled = import.meta.env.DEV
  && import.meta.env.VITE_ORDER_INTAKE_LOCAL === 'true'
  && window.location.hostname === '127.0.0.1';
export const checkoutSubmissionEnabled = import.meta.env.MODE !== 'whatsapp'
  && (localCheckoutEnabled || import.meta.env.VITE_ORDER_INTAKE_GATEWAY === 'true');

export function checkoutSubmissionBody(items: readonly CartItem[], details: CheckoutDetails) {
  const { delivery } = details;
  return JSON.stringify({
    modality: delivery ? 'entrega' : 'recogida',
    neighborhood: delivery?.neighborhood,
    items: items.map(line => ({
      product_id: 'bola-fuego-xl',
      quantity: line.quantity,
      finish_id: optionIds[line.finish],
      topping_ids: line.toppings.map(topping => optionIds[topping]).sort(),
      dip_id: optionIds[line.dip],
      expected_unit_price_cents: product.unitPrice * 100,
    })),
    contact: {
      name: details.name,
      phone: details.phone,
      ...(delivery && {
        recipient_name: delivery.recipientName,
        recipient_phone: delivery.recipientPhone,
        address: delivery.address,
        references: delivery.references || undefined,
        latitude: delivery.pin.latitude,
        longitude: delivery.pin.longitude,
      }),
    },
  });
}

export async function registerCheckout(key: string, body: string, subtotalCents: number) {
  if (!checkoutSubmissionEnabled) return { kind: 'retry' } as const;
  try {
    const response = await fetch('/api/checkout/submit-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      cache: 'no-store',
      redirect: 'error',
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 400 || response.status === 422) return { kind: 'invalid' } as const;
    if (response.status === 409) return { kind: 'conflict' } as const;
    if (response.ok) {
      const receipt = await response.json();
      if (typeof receipt.id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(receipt.id)
        && receipt.subtotal_cents === subtotalCents) {
        return { kind: 'registered', folio: receipt.id } as const;
      }
    }
  } catch {
    // A response can be lost after a successful write. Keep the same request for retries.
  }
  return { kind: 'retry' } as const;
}
