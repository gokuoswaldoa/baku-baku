# Checkout de contacto y entrega

El nombre y teléfono del contacto se solicitan en ambas modalidades. Para entrega se captura también quién recibe, la dirección escrita, referencias y un pin. El formulario usa teléfonos locales de 10 dígitos y código postal mexicano de 5 dígitos cuando se proporciona.

El checkout mantiene estos datos en memoria hasta abandonar o recargar la página. El carrito conserva únicamente productos y personalizaciones. Al revisar el pedido se puede copiar el mensaje y pegarlo en el chat del negocio. El enlace de WhatsApp contiene solo el destino. El usuario decide cuándo enviar el mensaje.

Leaflet se carga al abrir el mapa. Las teselas usan la caché normal del navegador, HTTPS y atribución visible. El proveedor recibe solicitudes de teselas para la zona visible, sin campos del formulario. VITE_OSM_TILE_URL permite cambiar el servidor; al hacerlo se deben verificar los términos y la atribución del proveedor. Los campos de coordenadas permiten completar el pin aunque falle el mapa. La ubicación del dispositivo se solicita desde el botón explícito.

Las columnas remotas revisadas permiten asociar el contacto, dirección escrita, referencias y coordenadas a order_contacts y la colonia a order_delivery. La migración local 006 añade recipient_name y recipient_phone a order_delivery sin exigir una actualización de registros anteriores. La futura integración de submit-order deberá validar y guardar ambos campos en la misma transacción. En esta fase la consulta sigue siendo por WhatsApp.

La migración también prepara prepare_driver_message para la acción explícita del futuro panel. La función exige un administrador activo con MFA, una entrega confirmada con tarifa y datos completos. Devuelve texto con folio, destinatario, teléfono, dirección, referencias y navegación. El panel podrá mostrarlo para revisión y copia manual. El checkout público carece de esa acción.

Verificación local con TypeScript, build de Vite y tests/cart.browser.mjs en Edge. Se probaron 360, 390, 430, 768, 1024 y 1440 px. Las pruebas simulan teselas exitosas y fallidas para evitar tráfico automatizado al proveedor. También simulan geolocalización y portapapeles sin abrir WhatsApp. En PostgreSQL 17 local pasaron la migración 006, la regresión de pedidos y supabase/tests/driver_message.sql con datos ficticios.

[Política de teselas de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)
