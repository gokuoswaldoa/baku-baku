export const business = {
  name: 'BAKU-BAKU SUSHI & FIRE',
  shortName: 'BAKU-BAKU',
  location: 'Rubén Jaramillo, Temixco',
  hours: 'Sábados y domingos, de 2:00 p. m. a 8:00 p. m. (hora de Temixco, Morelos).',
  deliveryCoverage: 'Temixco y alrededores',
  whatsappCountryCode: '52',
  whatsappDisplay: '777 287 2695',
};

export const availability = {
  pickup: 'Te damos la dirección al confirmar el pedido.',
  delivery: 'Confirmamos cobertura y tarifa final por WhatsApp.',
  orderNote: 'Abrir WhatsApp no confirma el pedido. Por chat confirmamos disponibilidad, importe final y tiempo estimado.',
};

export const product = {
  name: 'Bola de Fuego XL',
  filling: 'relleno estilo Tampico',
  unitPrice: 80,
  photo: '/assets/bola de fuego rellena de tampico.png',
};

export const whatsapp = 'https://wa.me/' + business.whatsappCountryCode + business.whatsappDisplay.split(' ').join('');
export const finishes = ['Con salsa de anguila', 'Sin salsa encima'] as const;
export const toppings = ['Ajonjolí blanco tostado', 'Cebollín', 'Aguacate', 'Cebolla crujiente', 'Jalapeño en rodajas', 'Panko crujiente extra'] as const;
export const dips = ['Soya con jalapeño y cebollín', 'Mayo chipotle', 'Soya clásica', 'Valentina', 'Sin dip'] as const;
export const deliveryRates = { near: 35, far: 55 };
export const deliveryReference = `Envío estimado: $${deliveryRates.near} MXN para trayectos de aproximadamente 10 a 15 minutos o $${deliveryRates.far} MXN para trayectos más lejanos dentro de cobertura.`;

export function deliveryTotalEstimate(subtotal: number) {
  return `Total estimado con envío: $${subtotal + deliveryRates.near} o $${subtotal + deliveryRates.far} MXN, según el trayecto.`;
}
export const modalities = {
  recogida: 'Recoger en ' + business.location,
  entrega: 'Entrega a domicilio — tarifa por cotizar',
};

export interface OrderLine {
  finish: string;
  toppings: readonly string[];
  dip: string;
  quantity: number;
}

export function cartConsultationMessage(lines: readonly OrderLine[], modality: keyof typeof modalities, neighborhood: string) {
  const quantity = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = quantity * product.unitPrice;
  const message = [
    'Hola ' + business.shortName + ', quiero consultar la disponibilidad de este pedido:',
    ...lines.map((line, index) => [
      '',
      (index + 1) + '. ' + line.quantity + ' × ' + product.name + ' — ' + product.filling,
      'Acabado: ' + line.finish,
      'Toppings: ' + (line.toppings.join(', ') || 'Ninguno'),
      'Salsa aparte: ' + line.dip,
      'Importe: $' + line.quantity * product.unitPrice + ' MXN',
    ].join('\n')),
    '',
    'Total de bolas: ' + quantity,
    'Precio por unidad: $' + product.unitPrice + ' MXN',
    'Subtotal de productos: $' + subtotal + ' MXN',
    'Modalidad: ' + modalities[modality],
    ...(modality === 'recogida'
      ? [availability.pickup]
      : ['Colonia: ' + neighborhood.trim(), deliveryReference, deliveryTotalEstimate(subtotal), availability.delivery]),
    'Por favor, confirmen disponibilidad, importe final y tiempo estimado.',
  ].join('\n');
  return message;
}

