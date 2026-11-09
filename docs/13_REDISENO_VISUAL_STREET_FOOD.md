# Rediseño Visual Implementado: Street Food Japonés Contemporáneo
## BAKU-BAKU SUSHI & FIRE

Este documento detalla el rediseño integral de la tienda web de **BAKU-BAKU SUSHI & FIRE** para su lanzamiento beta, sustituyendo la interfaz anterior por una experiencia de comida urbana japonesa, con personalidad propia, tipografía de impacto y uso estricto de los activos oficiales.

---

## 1. Identidad de Marca y Activos Oficiales Integrados

* **Mascota Oficial:** `public/assets/mascota.png` integrado en el Navbar compacto con sus proporciones originales y sombra de acento en naranja neón.
* **Lettering Oficial:** Integración de `public/assets/BAKU-BAKU_transparente.webp` y `public/assets/SUSHI-Y-FIRE_transparente.webp`, conservando la caligrafía original de la marca sin sustituirla por fuentes genéricas.
* **Fotografía Real del Producto:** `public/assets/bola de fuego rellena de tampico.png` utilizada como protagonista absoluto en el Hero y en el visualizador del configurador.
* **Logotipo Completo Oficial:** `public/assets/logo.jpg` conservado en el Footer y raíz sin deformaciones ni alteraciones.
* **Tipografía Complementaria:** *Syne* (pesos 700-900) para titulares con actitud streetwear japonesa y *Plus Jakarta Sans* para lectura limpia y legible.
* **Eliminación Total de Emojis:** Se retiraron todos los emojis genéricos (como la flama 🔥) para mantener una imagen limpia, enérgica y profesional.

---

## 2. Catálogo Real y Personalización en 3 Categorías

Se eliminaron completamente los sabores no validados (*Crunch Chicken*, *Tuna Fire*, etc.). Solo existe un producto oficial:

**Bola de Fuego XL — Relleno estilo Tampico (surimi y queso crema philadelphia)**, empanizada al panko y partida en cuatro bocados en domo térmico. Precio provisional visible: **$95 MXN**.

### Opciones de Personalización Implementadas:
1. **Categoría A (Acabado sobre la bola):**
   * *Con Salsa de Anguila:* Aplicada encima del empanizado.
   * *Sin Salsa Encima:* Empanizado natural y crujiente.
2. **Categoría B (Toppings exteriores - Sujetos a confirmación):**
   * Ajonjolí tostado.
   * Cebollín fresco picado.
   * Aguacate en cubos.
3. **Categoría C (Salsa o Dip aparte en vasito):**
   * *Salsa de soya con jalapeño y cebollín:* Preparación de la casa en vasito sellado.
   * *Dip de chipotle con mayonesa:* Marcado expresamente como *(Opción sujeta a confirmación)*.

---

## 3. Experiencia UX/UI y Responsividad Probada

La interfaz fue diseñada y verificada para los anchos requeridos:
* **Móviles pequeños (360px - 390px):** Navbar compacto sin desbordamientos, botón táctil superior "Armar Bola", barra fija inferior con precio provisional y botón rápido de personalización.
* **Móviles medianos (430px):** **Bottom Sheet** deslizable suave que despliega el configurador ocupando el 88% de la pantalla sin tapar el botón de envío.
* **Tablets (768px):** Distribución balanceada de 2 columnas para el Hero y los pilares del concepto.
* **Escritorio (1024px - 1440px):** Composición editorial de dos columnas (fotografía real de la bola a la izquierda con resumen en tiempo real, selector táctil de opciones a la derecha).

---

## 4. Canal de Consulta por WhatsApp (Sin Simulación de Pedido Confirmado)

El botón principal del configurador genera un enlace directo al WhatsApp oficial (`527772872695`):

```text
Hola BAKU-BAKU, quiero consultar la disponibilidad de este pedido:

*1x Bola de Fuego XL ($95 MXN provisional)*
• Acabado: Con salsa de anguila encima
• Toppings: Ajonjolí tostado, Cebollín fresco
• Salsa/Dip aparte: Salsa de soya con jalapeño y cebollín
• Modalidad: Para recoger en taller (Temixco) / Para entrega con repartidor (verificar cobertura y tarifa)

¿Me pueden confirmar tiempo y disponibilidad para hoy?
```

* **Transparencia Operativa:** No se muestran estados falsos de "Cocina abierta en vivo" ni tiempos estimados no controlados.
* **Privacidad:** No se publica la dirección exacta del taller; se indica que se comparte al coordinar la orden por WhatsApp.
* **Logística:** Se aclara que el servicio a domicilio depende de la confirmación de cobertura y tarifa del repartidor colaborador.

---

## 5. Validación Técnica

* **Compilación:** `npm run build` ejecutado con éxito (cero errores de TypeScript, bundle CSS de 26.36 kB y bundle JS de 183.62 kB).
* **Costo:** $0 MXN. Sin servicios externos de pago, sin pasarelas y sin tarjetas bancarias.
