import { cartConsultationMessage, type OrderLine } from './order-config';

export interface DeliveryPin {
  latitude: number;
  longitude: number;
}

export function parsePin(latitude: string, longitude: string): DeliveryPin | null {
  const decimal = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/;
  const values = [latitude.trim(), longitude.trim()];
  if (!values.every(value => decimal.test(value))) return null;
  const [lat, lng] = values.map(value => Number(value.replace(',', '.')));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { latitude: lat, longitude: lng };
}

export interface CheckoutDetails {
  name: string;
  phone: string;
  delivery?: {
    recipientName: string;
    recipientPhone: string;
    address: string;
    neighborhood: string;
    references: string;
    pin: DeliveryPin;
  };
}

export function readCheckout(form: FormData, modality: 'recogida' | 'entrega'): CheckoutDetails | null {
  const read = (key: string, max: number) => {
    const raw = form.get(key);
    const value = typeof raw === 'string' ? raw.trim() : '';
    return value.length <= max && !/[\u0000-\u001f\u007f]/.test(value) ? value : null;
  };
  const name = read('customerName', 120);
  const phone = read('customerPhone', 10);
  if (!name || !phone || !/^\d{10}$/.test(phone)) return null;
  if (modality === 'recogida') return { name, phone };

  const recipientName = read('recipientName', 120);
  const recipientPhone = read('recipientPhone', 10);
  const street = read('street', 120);
  const exterior = read('exterior', 20);
  const interior = read('interior', 20);
  const neighborhood = read('colonia', 120);
  const postalCode = read('postalCode', 5);
  const municipality = read('municipality', 80);
  const references = read('references', 500);
  const pin = parsePin(String(form.get('latitude') ?? ''), String(form.get('longitude') ?? ''));

  if (!recipientName || !recipientPhone || !/^\d{10}$/.test(recipientPhone)
    || !street || !exterior || interior === null || !neighborhood || postalCode === null
    || (postalCode && !/^\d{5}$/.test(postalCode)) || !municipality || references === null || !pin) return null;

  const address = [
    street + ' ' + exterior + (interior ? ', interior ' + interior : ''),
    'Col. ' + neighborhood,
    postalCode && 'C. P. ' + postalCode,
    municipality,
  ].filter(Boolean).join(', ');

  return { name, phone, delivery: { recipientName, recipientPhone, address, neighborhood, references, pin } };
}

export function checkoutMessage(items: readonly OrderLine[], details: CheckoutDetails) {
  const { delivery } = details;
  return [
    cartConsultationMessage(items, delivery ? 'entrega' : 'recogida', delivery?.neighborhood ?? ''),
    '',
    'Contacto: ' + details.name,
    'Teléfono de contacto: ' + details.phone,
    ...(delivery ? [
      'Recibe: ' + delivery.recipientName,
      'Teléfono de quien recibe: ' + delivery.recipientPhone,
      'Dirección: ' + delivery.address,
      ...(delivery.references ? ['Referencias: ' + delivery.references] : []),
      'Pin: ' + delivery.pin.latitude + ', ' + delivery.pin.longitude,
    ] : []),
  ].join('\n');
}
