# Supabase — preparación del módulo 4A

Esta carpeta prepara la persistencia sin conectar la aplicación. El diseño, configurador, carrito y WhatsApp actuales siguen utilizando su flujo local. No hay proyecto remoto vinculado ni secretos reales.

## Archivos y contrato

Las cuatro migraciones se aplican en orden por nombre. Crean las nueve tablas, el catálogo inicial, las políticas y los comandos transaccionales. Los importes son enteros en centavos MXN. El precio inicial es 9500, provisional; $35 y $55 son referencias separadas del envío confirmado. El catálogo inicial replica la configuración comercial vigente.

Cada solicitud admite de 1 a 50 líneas, cantidades de 1 a 99, un acabado, hasta dos toppings distintos y un dip explícito, incluido sin dip. El servidor acepta identificadores estables y un precio esperado. Consulta producto, opciones y asociaciones disponibles, recalcula el precio y rechaza cambios de precio para que el cliente revise su carrito. Guarda nombres, identificadores, recargos y precio provisional en el snapshot de cada línea.

El comando submit_order_request recibe una clave UUID y un payload normalizado. Un bloqueo transaccional y una restricción única serializan reintentos concurrentes. El mismo contenido devuelve el mismo folio; contenido distinto con la misma clave produce conflicto. Ante timeout se reintenta la misma clave. Cada nuevo intento comercial usa otra clave. El hash incluye datos de contacto y nunca se expone públicamente.

El subtotal se calcula en servidor. Las restricciones diferidas verifican líneas, subtotal, contacto y correspondencia entre modalidad y entrega antes de confirmar la transacción. Los roles de aplicación carecen de escritura directa sobre pedidos, snapshots y eventos.

## Administración y estados

El registro público de cuentas y los accesos anónimos de Auth están deshabilitados en la configuración local. En un proyecto futuro habrá que reflejar estos ajustes en el Dashboard. El propietario del proyecto crea al administrador de confianza mediante Auth y agrega su UUID a admin_users desde el entorno administrativo seguro. No existe un endpoint para autopromoverse. El administrador debe completar MFA TOTP para obtener una sesión aal2 antes de consultar datos privados.

Los administradores activos pueden editar disponibilidad y precios del catálogo. Las solicitudes y datos de clientes se leen con RLS y MFA. Los cambios de estado se realizan exclusivamente mediante transition_order, indicando el estado esperado para detectar acciones concurrentes.

El recorrido de recogida es pendiente → confirmado → preparando → listo → entregado. Para entrega, listo pasa por en reparto. Se permite cancelar antes de entregado, con motivo obligatorio. Un pedido cancelado o entregado es terminal. confirmed_at distingue solicitudes recibidas de pedidos confirmados; los cancelados se excluyen de las ventas vigentes. No se registra ni se infiere pago en esta fase.

confirm_delivery exige un administrador y un pedido pendiente de entrega. La llamada declara que verificó cobertura y registra tarifa definitiva, responsable y fecha. Confirmar un pedido a domicilio exige cobertura y tarifa definidas. Después de la confirmación se conserva esa cotización. Los eventos registran cambios de estado y tarifa sin copiar datos personales. La dirección exacta de recogida no forma parte del catálogo público.

## Edge Function preparada

submit-order usa fetch nativo y validación propia, sin nuevas dependencias. Su registro está deshabilitado por defecto y el gateway exige JWT. Además requiere un token temporal de servidor para pruebas autorizadas; jamás debe enviarse al frontend. El ejemplo de entorno contiene solo campos vacíos y el indicador de desactivación.

La función comprueba tamaño del cuerpo, campos permitidos, tipos, cantidades y estructura. La RPC valida disponibilidad y precios con filas bloqueadas hasta el commit. Solo devuelve folio, estado, subtotal y condición de reintento. Las claves de servidor permanecen en el entorno de ejecución, nunca en VITE_* ni en Git. No se registran payloads ni errores privados.

Antes de habilitar recepción pública se necesita otra fase autorizada con control de abuso y frecuencia, decisiones de autenticación del endpoint, CORS de producción y límites de cuota. Cambiar solo el indicador de entorno no habilita un formulario público.

## Verificaciones y pendientes

Ejecutar node tests/supabase-preparation.mjs permite comprobar sin red el TypeScript de la función con declaraciones mínimas de Deno, su contrato y respuestas simuladas. También comprueba la estructura básica de las migraciones; no constituye una validación de sintaxis PostgreSQL.

supabase/tests/orders.sql prepara pruebas transaccionales con fixtures ficticias y rollback para catálogo público, lectura privada, promoción prohibida, MFA, múltiples líneas, precios, opciones, idempotencia, subtotal, cobertura y transiciones. Ejecutarlas únicamente en una base desechable después de aplicar las migraciones. No se ejecutaron aquí porque faltan PostgreSQL, Supabase CLI y Deno, y el motor de Docker está detenido.

Requieren Supabase local o un proyecto Free autorizado:
- Aplicación limpia de las migraciones y ejecución real de orders.sql.
- Dos sesiones simultáneas con la misma clave y pruebas de rollback sin registros parciales.
- JWT reales de administrador, usuario sin autorización, administrador desactivado y MFA incompleto.
- Gateway, secretos, REST, CORS, timeout y reintentos desde el runtime Deno.
- Exportación y restauración de respaldos y revisión de cuotas gratuitas.

No ejecutar comandos de vinculación, despliegue ni migraciones remotas en esta fase. Presupuesto de infraestructura de $0 MXN y revisión de cuotas antes de habilitar servicios.

## Referencias

- [Políticas RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Seguridad de Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Autenticación multifactor](https://supabase.com/docs/guides/auth/auth-mfa)
- [Configuración de Supabase CLI](https://supabase.com/docs/guides/local-development/cli/config)
