export const business = {
  name: 'BAKU-BAKU SUSHI & FIRE',
  shortName: 'BAKU-BAKU',
  location: 'Rubén Jaramillo, Temixco',
  whatsappCountryCode: '52',
  whatsappDisplay: '777 287 2695',
};

export const availability = {
  request: 'quiero consultar la disponibilidad de esta combinación:',
  pickup: 'Te damos la dirección al confirmar el pedido.',
  delivery: 'Cobertura y tarifa definitiva pendientes de confirmación.',
  orderNote: 'El taller confirma disponibilidad, cobertura y tarifa por chat.',
};

export const product = {
  name: 'Bola de Fuego XL',
  filling: 'relleno estilo Tampico',
  provisionalPrice: 95,
  photo: '/assets/bola de fuego rellena de tampico.png',
};

export const whatsapp = 'https://wa.me/' + business.whatsappCountryCode + business.whatsappDisplay.split(' ').join('');
export const finishes = ['Con salsa de anguila', 'Sin salsa encima'] as const;
export const toppings = ['Ajonjolí blanco tostado', 'Cebollín', 'Aguacate', 'Cebolla crujiente', 'Jalapeño en rodajas', 'Panko crujiente extra'] as const;
export const dips = ['Soya con jalapeño y cebollín', 'Mayo chipotle', 'Soya clásica', 'Valentina', 'Sin dip'] as const;
export const deliveryRates = { near: 35, far: 55 };
export const deliveryReference = 'Tarifas de referencia: $' + deliveryRates.near + ' MXN cerca y $' + deliveryRates.far + ' MXN lejos.';
export const modalities = {
  recogida: 'Recoger en ' + business.location,
  entrega: 'Entrega a domicilio — tarifa por cotizar',
};

export function consultationUrl(
  finish: string,
  selectedToppings: readonly string[],
  dip: string,
  modality: keyof typeof modalities,
  neighborhood: string,
) {
  const message = [
    'Hola ' + business.shortName + ', ' + availability.request,
    'Producto: ' + product.name + ' — ' + product.filling,
    'Cantidad: 1',
    'Acabado: ' + finish,
    'Toppings: ' + (selectedToppings.join(', ') || 'Ninguno'),
    'Salsa aparte: ' + dip,
    'Precio provisional: $' + product.provisionalPrice + ' MXN',
    'Modalidad: ' + modalities[modality],
    ...(modality === 'recogida'
      ? [availability.pickup]
      : ['Colonia: ' + neighborhood.trim(), deliveryReference, availability.delivery]),
  ].join('\n');

  return whatsapp + '?text=' + encodeURIComponent(message);
}

