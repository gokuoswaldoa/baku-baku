export interface OrderPayload {
  modality: 'recogida' | 'entrega';
  neighborhood?: string;
  items: {
    product_id: string;
    quantity: number;
    finish_id: string;
    topping_ids: string[];
    dip_id: string;
    expected_unit_price_cents: number;
  }[];
  contact?: {
    name?: string;
    phone?: string;
    address?: string;
    references?: string;
    latitude?: number;
    longitude?: number;
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_payload');
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('unexpected_field');
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error('invalid_text');
  return value.trim();
}

function identifier(value: unknown): string {
  const result = text(value, 80);
  if (!/^[a-z0-9-]+$/.test(result)) throw new Error('invalid_identifier');
  return result;
}

export function validateIdempotencyKey(value: string | null): string {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('invalid_idempotency_key');
  }
  return value.toLowerCase();
}

export function validatePayload(value: unknown): OrderPayload {
  const input = object(value);
  keys(input, ['modality', 'neighborhood', 'items', 'contact']);
  if (input.modality !== 'recogida' && input.modality !== 'entrega') throw new Error('invalid_modality');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) throw new Error('invalid_items');
  const result: OrderPayload = {
    modality: input.modality,
    items: input.items.map(raw => {
      const line = object(raw);
      keys(line, ['product_id', 'quantity', 'finish_id', 'topping_ids', 'dip_id', 'expected_unit_price_cents']);
      if (typeof line.quantity !== 'number' || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error('invalid_quantity');
      if (typeof line.expected_unit_price_cents !== 'number' || !Number.isInteger(line.expected_unit_price_cents)
        || line.expected_unit_price_cents < 0 || line.expected_unit_price_cents > 5000000) throw new Error('invalid_price');
      if (!Array.isArray(line.topping_ids) || line.topping_ids.length > 2) throw new Error('invalid_toppings');
      const toppingIds = line.topping_ids.map(identifier).sort();
      if (new Set(toppingIds).size !== toppingIds.length) throw new Error('duplicate_toppings');
      return {
        product_id: identifier(line.product_id), quantity: line.quantity,
        finish_id: identifier(line.finish_id), topping_ids: toppingIds,
        dip_id: identifier(line.dip_id), expected_unit_price_cents: line.expected_unit_price_cents,
      };
    }),
  };
  if (result.modality === 'entrega') result.neighborhood = text(input.neighborhood, 120);
  else if (input.neighborhood !== undefined) throw new Error('unexpected_neighborhood');
  if (input.contact !== undefined) {
    const contact = object(input.contact);
    keys(contact, ['name', 'phone', 'address', 'references', 'latitude', 'longitude']);
    result.contact = {};
    for (const field of ['name', 'phone', 'address', 'references'] as const) {
      if (contact[field] !== undefined) result.contact[field] = text(contact[field], field === 'name' ? 120 : field === 'phone' ? 25 : 500);
    }
    if (result.contact.phone && !/^\+?[0-9 ()-]{7,25}$/.test(result.contact.phone)) throw new Error('invalid_phone');
    if (contact.latitude !== undefined || contact.longitude !== undefined) {
      if (typeof contact.latitude !== 'number' || !Number.isFinite(contact.latitude) || Math.abs(contact.latitude) > 90
        || typeof contact.longitude !== 'number' || !Number.isFinite(contact.longitude) || Math.abs(contact.longitude) > 180) throw new Error('invalid_pin');
      result.contact.latitude = contact.latitude;
      result.contact.longitude = contact.longitude;
    }
  }
  return result;
}
