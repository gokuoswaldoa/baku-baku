# Bolas de Fuego - Encuesta de Validación (Dark Kitchen)

Single Page Application (SPA) en React con Tailwind CSS para la validación de mercado de una Dark Kitchen de sushi empanizado en esfera (*Bolas de Fuego*) con entrega a domicilio local.

## Características de Diseño UI/UX
- **Enfoque Mobile-First**: Optimizado para abrirse directamente desde enlaces compartidos en WhatsApp y Facebook en pantallas móviles (360px a 440px).
- **Tema Visual Dark Moderno**: Paleta de color carbón oscuro (`#0A0A0C`, `#111216`, `#16181F`) con acentos vibrantes naranja fuego (`#FF5A00`), tipografía clara y contrastes diseñados para abrir el apetito.
- **Sin Emojis**: Cumple al 100% con la regla estricta de 0 emojis, utilizando vectores SVG e iconos de línea de alta fidelidad.
- **Flujo Guiado Paso a Paso**: Reduce la fricción cognitiva mediante tarjetas interactivas y barra de progreso animada.
- **Pantalla de Agradecimiento y Recompensa VIP**: Incluye cupón de 50% de descuento copiable y enlace para compartir con vecinos en WhatsApp.
- **Estado de Carga Interactivo**: Animación durante el envío ("Preparando el fuego...").

## Estructura de Preguntas
1. **Selección única**: "¿Qué sueles pedir para cenar los fines de semana?" (Tacos, Pizza, Hamburguesas/Hot Dogs, Alitas, Otro antojo con especificación de texto).
2. **Rango de precio**: "¿Cuánto sueles gastar por persona en una cena de fin de semana?" ($50 - $80, $80 - $120, $120 - $150, Más de $150 MXN).
3. **Pregunta visual Sí/No**: "Si abriera una opción de Sushi Empanizado en Bola (Bolas de Fuego) a domicilio en la colonia, ¿te animarías a probarlo?"
4. **Selección múltiple**: "¿Qué ingredientes te llaman más la atención?" (Surimi/Tampico, Atún spicy, Pollo crujiente, Queso crema extra, Aguacate).
5. **Captura VIP**: Número de WhatsApp para cupón del 50% en la inauguración secreta.

## Instrucciones de Ejecución

```bash
# Instalar dependencias (ya instaladas)
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```
