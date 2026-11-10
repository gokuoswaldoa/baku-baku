# Estado de BAKU-BAKU

- **Stack.** React, Vite, TypeScript y Tailwind CSS. Aplicación local sin servicios conectados.
- **Diseño aprobado.** Se conserva la composición actual. Los originales de logotipo, mascota, lettering y fotografía de la Bola de Fuego están en `public/assets/`.
- **Terminado.** Portada responsiva, configurador para una Bola de Fuego XL con hasta dos de seis toppings, elección obligatoria de dip, resumen y consulta por WhatsApp. La entrega solicita colonia y muestra tarifas de referencia de $35 cerca y $55 lejos. Los datos comerciales editables viven en `src/order-config.ts`.
- **Pendiente.** Catálogo separado, checkout, administración y persistencia de pedidos en servidor. Faltan validación de precios en servidor, historial de opciones y precios por pedido, capas visuales y reglas de cobertura.
- **Decisiones comerciales.** Confirmar precio definitivo, disponibilidad y horarios, colonias cubiertas y tarifas de envío. El domicilio exacto de recogida se comparte al confirmar.
- **Próximo módulo.** Catálogo y disponibilidad, separado del configurador, con producto, opciones y precio provisional desde la configuración existente.
- **Seguridad y presupuesto.** $0 MXN. Mantener credenciales y datos privados fuera de Git y del frontend. Guardar dirección, referencias y coordenadas por separado cuando exista checkout. Confirmar entregas solo con cobertura y tarifa definida. Publicación, pagos e integraciones externas requieren autorización.


## Verificación del módulo
TypeScript y build aprobados. Edge verificó seis anchos sin desbordamiento, máximo dos toppings, los cinco valores de dip y sus mensajes, bloqueo de dip pendiente y colonia vacía o con espacios. Las tarifas de referencia quedan separadas del precio del producto. La consulta no confirma el pedido ni la entrega.

## Módulo 3 — Carrito local
El configurador agrega personalizaciones al carrito, agrupa nuevas unidades idénticas y permite editar cada línea conservando las demás. La modalidad se elige una vez por pedido. El subtotal usa siempre el precio provisional centralizado. El envío se cotiza por separado.

El carrito se guarda en localStorage y se valida al recargar. Se descartan líneas inválidas u opciones retiradas y se exige revisar y corregir el carrito antes de consultar por WhatsApp. Si el navegador impide guardarlo, se muestra un aviso. Límites locales de 99 unidades por línea y 50 personalizaciones. La confirmación de disponibilidad y tarifa sigue a cargo del taller.

Verificación con TypeScript, build y Edge en 360, 390, 430, 768, 1024 y 1440 px. Prueba reproducible mediante npm run build y node tests/cart.browser.mjs, con Edge instalado en Windows. Cubre personalizaciones distintas, tres unidades idénticas, doble clic, edición, cantidades, eliminación, persistencia, datos inválidos y mensaje único. Las capturas se guardan en .validacion-baku/.

## Galería Así se ve tu Baku

El carrusel usa las cuatro imágenes de producto elegidas para la galería. El avance automático ocurre cada cuatro segundos con un deslizamiento de 600 ms. El cursor y el foco pausan el avance. La navegación manual y la ampliación lo mantienen en pausa hasta reanudarlo. Con movimiento reducido, la galería funciona en modo manual sin deslizamiento.

Las fotos se sirven en WebP de 480 px o hasta 960 px según el tamaño de pantalla. Al ampliar se carga una versión de mayor calidad que conserva el encuadre completo.

En escritorio, las fotos 3 y 4 se muestran completas dentro del mismo marco. La compilación copia únicamente las variantes WebP de la galería. Los originales se conservan en el proyecto local.
