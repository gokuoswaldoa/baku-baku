# Estado de BAKU-BAKU

- **Stack.** React, Vite, TypeScript y Tailwind CSS. Aplicación local sin servicios conectados.
- **Diseño aprobado.** Se conserva la composición actual. Los originales de logotipo, mascota, lettering y fotografía de la Bola de Fuego están en `public/assets/`.
- **Terminado.** Portada responsiva, configurador para una Bola de Fuego XL con hasta dos de seis toppings, elección obligatoria de dip, resumen y consulta por WhatsApp. La entrega solicita colonia y muestra tarifas de referencia de $35 cerca y $55 lejos. Los datos comerciales editables viven en `src/order-config.ts`.
- **Pendiente.** Catálogo separado, carrito, checkout, administración y persistencia. Faltan validación de precios en servidor, historial de opciones y precios por pedido, capas visuales y reglas de cobertura.
- **Decisiones comerciales.** Confirmar precio definitivo, disponibilidad y horarios, colonias cubiertas y tarifas de envío. El domicilio exacto de recogida se comparte al confirmar.
- **Próximo módulo.** Catálogo y disponibilidad, separado del configurador, con producto, opciones y precio provisional desde la configuración existente.
- **Seguridad y presupuesto.** $0 MXN. Mantener credenciales y datos privados fuera de Git y del frontend. Guardar dirección, referencias y coordenadas por separado cuando exista checkout. Confirmar entregas solo con cobertura y tarifa definida. Publicación, pagos e integraciones externas requieren autorización.


## Verificación del módulo
TypeScript y build aprobados. Edge verificó seis anchos sin desbordamiento, máximo dos toppings, los cinco valores de dip y sus mensajes, bloqueo de dip pendiente y colonia vacía o con espacios. Las tarifas de referencia quedan separadas del precio del producto. La consulta no confirma el pedido ni la entrega.
