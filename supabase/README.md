# Supabase — preparación del módulo 4A

Esta carpeta prepara la persistencia sin conectar la aplicación. El diseño, configurador, carrito y WhatsApp actuales siguen utilizando su flujo local. No hay proyecto remoto vinculado ni secretos reales.

## Archivos y contrato

Las cuatro migraciones se aplican en orden por nombre. Crean las nueve tablas, el catálogo inicial, las políticas y los comandos transaccionales. Los importes son enteros en centavos MXN. El precio inicial es 9500, provisional; $35 y $55 son referencias separadas del envío confirmado. El catálogo inicial replica la configuración comercial vigente.

Cada solicitud admite de 1 a 50 líneas, cantidades de 1 a 99, un acabado, hasta dos toppings distintos y un dip explícito, incluido sin dip. El servidor acepta identificadores estables y un precio esperado. Consulta producto, opciones y asociaciones disponibles, recalcula el precio y rechaza cambios de precio para que el cliente revise su carrito. Guarda nombres, identificadores, recargos y precio provisional en el snapshot de cada línea.

El comando submit_order_request recibe una clave UUID y un payload normalizado. Un bloqueo transaccional y una restricción única serializan reintentos concurrentes. El mismo contenido devuelve el mismo folio; contenido distinto con la misma clave produce conflicto. Ante timeout se reintenta la misma clave. Cada nuevo intento comercial usa otra clave. El hash incluye datos de contacto y nunca se expone públicamente.

El subtotal se calcula en servidor. Las restricciones diferidas verifican líneas, subtotal, contacto y correspondencia entre modalidad y entrega antes de confirmar la transacción. Los roles de aplicación carecen de escritura directa sobre pedidos, snapshots y eventos.

## Administración y estados

El registro público de cuentas y los accesos anónimos de Auth están deshabilitados en la configuración local. En el proyecto Free creado hay que reflejar estos ajustes en el Dashboard antes de habilitar acceso administrativo. El propietario del proyecto crea al administrador de confianza mediante Auth y agrega su UUID a admin_users desde el entorno administrativo seguro. No existe un endpoint para autopromoverse. El administrador debe completar MFA TOTP para obtener una sesión aal2 antes de consultar datos privados.

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

## Revisión previa a vincular el proyecto

Orden revisado de las migraciones:
1. 202611060001_schema crea tablas, claves, restricciones, helper administrativo y RLS.
2. 202611060002_catalog inserta el producto y opciones sobre esas tablas.
3. 202611060003_order_commands crea las RPC de registro, transición y tarifa; depende del esquema y de Auth.
4. 202611060004_integrity agrega triggers que dependen de las tablas y funciones anteriores y restringe el rol de servidor a las RPC.

La revisión estática no encontró DROP, TRUNCATE ni DELETE de datos. Los triggers BEFORE DELETE impiden alterar snapshots y eventos. La única relación ON DELETE CASCADE elimina la autorización admin_users cuando se elimina su usuario de Auth. Los REVOKE son cambios deliberados de permisos, incluido el rol service_role en la cuarta migración. Cada archivo es transaccional y está destinado a una aplicación única mediante el historial de migraciones. Un esquema remoto con tablas homónimas requiere revisión antes de aplicar.

Las nueve tablas habilitan RLS. El público solo lee catálogo y opciones disponibles; los pedidos, contactos, entregas y eventos requieren administrador activo con aal2. Las funciones SECURITY DEFINER fijan search_path vacío y limitan EXECUTE. submit_order_request solo admite service_role; las funciones de administración vuelven a comprobar identidad y MFA. La validación real de políticas, concurrencia y sintaxis SQL sigue pendiente de PostgreSQL/Supabase.

La configuración TOML mantiene submit-order con verify_jwt y su indicador de entorno desactivado. Vincular el proyecto no aplica estas migraciones ni los ajustes locales de Auth al proyecto remoto.

## Cliente React/Vite preparado

El SDK oficial @supabase/supabase-js es la única dependencia añadida. src/lib/supabase.ts expone getSupabaseClient con creación diferida y validación de URL y clave publishable. Importarlo no crea el cliente. Las sesiones persistentes, la detección de tokens en la URL y la renovación automática están desactivadas en esta preparación. Un módulo administrativo futuro deberá definir explícitamente el ciclo de sesión.

Copiar .env.example a .env.local solo si este último aún no existe. Completar localmente VITE_SUPABASE_URL con la Project URL y VITE_SUPABASE_PUBLISHABLE_KEY con la clave publishable del proyecto, obtenidas en el Dashboard. Reiniciar Vite después de modificar variables. La URL y la referencia del proyecto todavía deben obtenerse del Dashboard. La clave recibida en el chat no se ha copiado al código, ejemplos ni commits.

Las variables VITE_* son públicas dentro del bundle. Las claves secret y service_role, la contraseña de base de datos y el token de acceso de CLI pertenecen al entorno privado. .env.local, otros .env con valores y supabase/.temp están ignorados por Git. .env.example contiene solo nombres y campos vacíos.

## Vinculación mediante CLI — procedimiento para ejecutar manualmente

Desde PowerShell en la raíz del repositorio, con Node/npm disponibles, ejecutar:

~~~powershell
Set-Location -LiteralPath 'C:\Users\oswal\OneDrive\Escritorio\baku-baku'
npx --yes supabase@2 login
$projectRef = Read-Host 'Project ref del proyecto Free'
npx --yes supabase@2 link --project-ref $projectRef
~~~

npx descarga temporalmente la CLI si no está disponible; estos comandos no se ejecutaron en esta fase. Usar el inicio de sesión interactivo de la CLI. Si solicita contraseña de base de datos, introducirla únicamente en su prompt local o dejarla vacía para omitir la validación de base de datos cuando lo ofrezca. No incluir credenciales en argumentos, capturas ni mensajes. La referencia se obtiene en Project Settings del proyecto correcto. Verificar que corresponda al proyecto Free.

Este procedimiento solo vincula el directorio. La siguiente fase requiere revisar el esquema remoto y autorizar las migraciones y las pruebas RLS por separado. Conservar submit-order deshabilitada hasta completar las pruebas y aprobar su habilitación.

Verificaciones locales adicionales mediante node tests/supabase-client.mjs y npm run build. La prueba de cliente usa datos ficticios, intercepta fetch y verifica cero solicitudes de red, creación única y exclusión de archivos privados.

[Referencia de vinculación CLI](https://supabase.com/docs/reference/cli/supabase-link). [Claves de API y exposición pública](https://supabase.com/docs/guides/getting-started/api-keys).