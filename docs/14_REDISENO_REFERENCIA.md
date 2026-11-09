# Rediseño local de BAKU-BAKU

La página reutiliza la mascota, el lettering y la fotografía oficiales. El original de cada activo se conserva. La composición usa una portada carbón, brochazos, una franja marfil con borde rasgado y un panel de personalización en el flujo de la página. El contenido cambia de orden y de número de columnas según el espacio disponible.

## Consulta de disponibilidad

`src/order-config.ts` centraliza el producto, el precio provisional de 95 MXN y los datos de la consulta. Los controles nativos permiten elegir el acabado y hasta dos toppings. La salsa de soya con jalapeño y cebollín es la única opción aparte documentada como disponible. El enlace conserva el número anterior, incluye la selección y solicita coordinación con el taller. Para entrega, cobertura y tarifa se consultan por chat.

## Validación local

La comprobación de TypeScript usa `node_modules/.bin/tsc.cmd --noEmit`. El comando `npm run build` encontró un EPERM en la resolución de rutas dentro del sandbox de Windows y compiló fuera del sandbox sin cambios en Vite ni en los permisos de OneDrive.

La comprobación de navegador usa `node .validacion-baku/qa.mjs` después del build. Requiere Edge local, abre un servidor de prueba en loopback, comprueba desbordamiento y carga de imágenes en los seis anchos solicitados, y verifica la configuración y el enlace de consulta sin abrir WhatsApp. Guarda las capturas a 390 y 1440 px en `.validacion-baku`.

