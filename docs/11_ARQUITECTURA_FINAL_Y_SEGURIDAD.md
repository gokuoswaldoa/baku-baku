# Propuesta Técnica Final: Arquitectura, Seguridad y Modelo de Datos
## BAKU-BAKU SUSHI & FIRE (Presupuesto $0 MXN)

---

## 1. Stack Final Justificado ($0 MXN y Uso Comercial)

Se adopta la arquitectura **Vite + React + TypeScript + Supabase Free + Cloudflare Pages**:

```
┌────────────────────────────────────────────────────────┐
│  Cloudflare Pages (Edge CDN Global)                   │
│  - SPA estática: Vite + React + TypeScript + Tailwind   │
│  - Costo: $0 MXN permanente | Tráfico ilimitado        │
│  - Sin tarjeta de crédito | Uso comercial permitido   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS + supabase-js (anon_key)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Supabase Free Tier (PostgreSQL Administrado)         │
│  - Base de Datos Relacional + RLS Estricto             │
│  - Autenticación administrativa integrada              │
│  - Almacenamiento de capas visuales WebP              │
│  - Costo: $0 MXN | Sin tarjeta de crédito             │
└────────────────────────────────────────────────────────┘
```

### Justificación Técnica y Descarte de Alternativas
1. **Descarte de Vercel Hobby:** Los Términos de Servicio de Vercel en su plan gratuito prohíben explícitamente el uso comercial (*"Hobby accounts may only be used for non-commercial purposes"*). Su uso expondría el proyecto a suspensión o cobros forzados.
2. **Ventaja de Cloudflare Pages:** Ofrece ancho de banda ilimitado, sitios ilimitados, despliegue continuo desde GitHub y permite uso comercial en su plan gratuito sin requerir tarjeta bancaria.
3. **Ventaja de Vite + React SPA frente a SSR:** Al no requerir un servidor Node.js en ejecución continua, la aplicación se entrega como activos estáticos ultrarrápidos desde la red perimetral (CDN), eliminando cuotas de cómputo en backend y evitando la complejidad de adaptadores de Edge runtime.
4. **Lógica de Servidor en PostgreSQL:** Las validaciones de precios, cálculo de totales, verificación de cobertura y generación de snapshots se ejecutan dentro de PostgreSQL mediante funciones almacenadas (`SECURITY DEFINER`), garantizando que la lógica crítica resida en el servidor sin costo de hosting adicional.

---

## 2. Arquitectura de Seguridad, RLS y Tokens del Repartidor

### Principio de Llaves y Secretos
* **Frontend:** Únicamente contendrá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
* **Prohibición:** La clave `service_role` **jamás** se incluirá en el repositorio, variables de entorno del cliente ni código frontend.
* **Toda mutación sensible (crear pedidos, calcular totales, generar tokens)** se delega a funciones RPC con `SECURITY DEFINER` que controlan exactamente qué datos se escriben y qué se retorna.

```mermaid
graph TD
    Client["Cliente Web (anon_key)"] -->|1. Lectura pública| Cat["Catálogo y Opciones (RLS: Select público)"]
    Client -->|2. Envía pedido sin precios| RPC_Order["RPC submit_order() (Security Definer)"]
    RPC_Order -->|Valida precios oficiales y calcula| DB_Orders[("Tabla 'orders'")]
    
    Admin["Administrador (Auth Session)"] -->|Gestión total| DB_All[("Todas las Tablas (RLS: role authenticated)")]
    Admin -->|Asigna pedido a repartidor| RPC_Assign["RPC assign_rider()"]
    RPC_Assign -->|Genera token plano a admin + guarda HASH| DB_Orders
    
    Rider["Repartidor (Sin cuenta / Enlace con Token)"] -->|Consulta ficha| RPC_Rider["RPC get_rider_sheet(order_id, plain_token)"]
    RPC_Rider -->|Compara sha256(plain_token) == rider_token_hash| DB_Orders
```

### Políticas Concretas de Row Level Security (RLS)

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- 1. CATÁLOGO Y OPCIONES: Lectura pública, mutación solo administradores
CREATE POLICY "Catalogo publico lectura" 
ON products FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Catalogo gestion admin" 
ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Opciones publicas lectura" 
ON customization_options FOR SELECT TO anon, authenticated USING (is_available = true);

CREATE POLICY "Opciones gestion admin" 
ON customization_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Zonas publicas lectura" 
ON delivery_zones FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Zonas gestion admin" 
ON delivery_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Settings lectura publica" 
ON system_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Settings gestion admin" 
ON system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. PEDIDOS Y DETALLES:
-- El cliente anónimo NO puede hacer SELECT libre sobre 'orders' para proteger datos personales.
-- Tampoco puede hacer INSERT directo para evitar alterar precios: se usa la función RPC 'submit_order'.
CREATE POLICY "Admin control total orders" 
ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin control total items" 
ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin control total items_cust" 
ON order_item_customizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin control total status_history" 
ON order_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Arquitectura de Tokens Seguros para el Repartidor
1. **Generación Diferida:** El token **no se crea al entrar el pedido**. Se genera exclusivamente cuando el administrador cambia el estado a `asignado_a_repartidor` mediante la función `assign_rider_token(p_order_id)`.
2. **Almacenamiento en Hash:** La base de datos guarda únicamente el hash SHA-256 (`rider_token_hash`). Si la base de datos sufriera una fuga, los tokens reales no quedan expuestos.
3. **Entrega Única:** La función de asignación genera un secreto aleatorio criptográfico (ej. 32 bytes en hexadecimal), calcula su hash para la base de datos y retorna el enlace completo con el token plano una sola vez al administrador para que lo comparta al repartidor por WhatsApp.
4. **Caducidad y Revocación:** El token incluye fecha de expiración (24 horas) y una bandera booleana `rider_token_revoked`. Si el pedido se cancela o se reasigna a otro repartidor, el token anterior se revoca inmediatamente.
5. **Consulta Limitada:** El repartidor no accede a la tabla `orders` directamente. Consume la función `get_rider_order_details(p_order_id, p_token_plain)`, la cual verifica:
   $$\text{sha256}(p\_token\_plain) == rider\_token\_hash \quad \land \quad \text{expires\_at} > \text{NOW()} \quad \land \quad \neg rider\_token\_revoked$$
   Si es válido, devuelve únicamente: folio, nombre, teléfono para llamada directa, dirección, referencias, coordenadas y tarifa de envío. **No expone datos financieros del negocio ni datos de otros pedidos.**

---

## 3. Correcciones al Modelo SQL (Restricciones, Triggers y Snapshots)

```sql
-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA DE CONFIGURACIÓN DEL SISTEMA
CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTOS BASE
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. OPCIONES DE PERSONALIZACIÓN
CREATE TABLE customization_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(20) NOT NULL CHECK (category IN ('decoracion', 'salsa')),
    name VARCHAR(80) NOT NULL,
    extra_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (extra_price >= 0),
    layer_image_url TEXT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0
);

-- 4. ZONAS DE REPARTO
CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_name VARCHAR(120) NOT NULL,
    delivery_fee NUMERIC(10,2) NOT NULL CHECK (delivery_fee >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PEDIDOS CON RESTRICCIONES DE INTEGRIDAD
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    order_type VARCHAR(15) NOT NULL CHECK (order_type IN ('recogida', 'entrega')),
    status VARCHAR(30) NOT NULL DEFAULT 'pendiente_confirmacion' CHECK (
        status IN ('pendiente_confirmacion', 'confirmado', 'en_preparacion', 'asignado_a_repartidor', 'en_camino', 'entregado', 'cancelado')
    ),
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(15) NOT NULL,
    
    -- Dirección física
    street_and_number TEXT,
    neighborhood VARCHAR(120),
    references_text TEXT,
    
    -- Coordenadas con validación geográfica estricta
    latitude NUMERIC(10,8) CHECK (latitude IS NULL OR (latitude BETWEEN -90.0 AND 90.0)),
    longitude NUMERIC(11,8) CHECK (longitude IS NULL OR (longitude BETWEEN -180.0 AND 180.0)),
    
    -- Zona de entrega
    delivery_zone_id UUID REFERENCES delivery_zones(id),
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    
    -- Importes del negocio
    products_subtotal NUMERIC(10,2) NOT NULL CHECK (products_subtotal >= 0),
    total_order NUMERIC(10,2) NOT NULL CHECK (total_order >= 0),
    
    -- Seguridad del Repartidor (Solo HASH)
    rider_token_hash VARCHAR(64),
    rider_token_expires_at TIMESTAMP WITH TIME ZONE,
    rider_token_revoked BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Consistencia de negocio entre Recogida y Entrega
    CONSTRAINT chk_order_modality_consistency CHECK (
        (order_type = 'recogida' AND delivery_zone_id IS NULL AND delivery_fee = 0.00 AND street_and_number IS NULL AND latitude IS NULL AND longitude IS NULL)
        OR
        (order_type = 'entrega' AND delivery_zone_id IS NOT NULL AND street_and_number IS NOT NULL AND neighborhood IS NOT NULL)
    )
);

-- 6. ITEMS DEL PEDIDO (Snapshots de producto)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name_snapshot VARCHAR(100) NOT NULL,
    unit_price_snapshot NUMERIC(10,2) NOT NULL CHECK (unit_price_snapshot >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0)
);

-- 7. DETALLE DE PERSONALIZACIÓN (Snapshots de personalización)
CREATE TABLE order_item_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    option_id UUID REFERENCES customization_options(id),
    option_name_snapshot VARCHAR(80) NOT NULL,
    option_category_snapshot VARCHAR(20) NOT NULL,
    extra_price_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (extra_price_snapshot >= 0)
);

-- 8. AUDITORÍA DE ESTADOS
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by VARCHAR(50) DEFAULT 'sistema',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. FUNCIÓN RPC: CREACIÓN Y CÁLCULO DE PEDIDOS EN SERVIDOR
CREATE OR REPLACE FUNCTION submit_order(
    p_idempotency_key VARCHAR(64),
    p_order_type VARCHAR(15),
    p_customer_name VARCHAR(120),
    p_customer_phone VARCHAR(15),
    p_street_and_number TEXT,
    p_neighborhood VARCHAR(120),
    p_references_text TEXT,
    p_latitude NUMERIC(10,8),
    p_longitude NUMERIC(11,8),
    p_delivery_zone_id UUID,
    p_items JSONB -- [{ product_id, quantity, option_ids: [] }]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_number VARCHAR(20);
    v_delivery_fee NUMERIC(10,2) := 0.00;
    v_products_subtotal NUMERIC(10,2) := 0.00;
    v_total_order NUMERIC(10,2) := 0.00;
    v_item RECORD;
    v_product RECORD;
    v_option RECORD;
    v_item_subtotal NUMERIC(10,2);
    v_order_item_id UUID;
    v_opt_id UUID;
BEGIN
    -- Validar idempotencia
    IF EXISTS (SELECT 1 FROM orders WHERE idempotency_key = p_idempotency_key) THEN
        SELECT id, order_number INTO v_order_id, v_order_number 
        FROM orders WHERE idempotency_key = p_idempotency_key;
        RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'status', 'already_exists');
    END IF;

    -- Validar tarifa de envío si es entrega
    IF p_order_type = 'entrega' THEN
        SELECT delivery_fee INTO v_delivery_fee 
        FROM delivery_zones 
        WHERE id = p_delivery_zone_id AND is_active = TRUE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Zona de entrega no válida o inactiva';
        END IF;
    END IF;

    -- Generar folio legible
    v_order_number := 'BK-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM()*1000)::TEXT, 3, '0');

    -- Insertar orden preliminar para obtener ID
    INSERT INTO orders (
        order_number, idempotency_key, order_type, status,
        customer_name, customer_phone, street_and_number, neighborhood,
        references_text, latitude, longitude, delivery_zone_id, delivery_fee,
        products_subtotal, total_order
    ) VALUES (
        v_order_number, p_idempotency_key, p_order_type, 'pendiente_confirmacion',
        p_customer_name, p_customer_phone, p_street_and_number, p_neighborhood,
        p_references_text, p_latitude, p_longitude, p_delivery_zone_id, v_delivery_fee,
        0.00, 0.00
    ) RETURNING id INTO v_order_id;

    -- Procesar cada item calculando precios estrictamente desde la base de datos
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, option_ids JSONB)
    LOOP
        SELECT name, base_price INTO v_product FROM products WHERE id = v_item.product_id AND is_active = TRUE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto inactivo o inexistente: %', v_item.product_id;
        END IF;

        v_item_subtotal := v_product.base_price;

        -- Insertar snapshot de item
        INSERT INTO order_items (
            order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal
        ) VALUES (
            v_order_id, v_item.product_id, v_product.name, v_product.base_price, v_item.quantity, 0.00
        ) RETURNING id INTO v_order_item_id;

        -- Procesar personalizaciones si existen
        IF v_item.option_ids IS NOT NULL AND jsonb_array_length(v_item.option_ids) > 0 THEN
            FOR v_opt_id IN SELECT jsonb_array_elements_text(v_item.option_ids)::UUID
            LOOP
                SELECT name, category, extra_price INTO v_option 
                FROM customization_options 
                WHERE id = v_opt_id AND is_available = TRUE;
                
                IF FOUND THEN
                    v_item_subtotal := v_item_subtotal + v_option.extra_price;
                    INSERT INTO order_item_customizations (
                        order_item_id, option_id, option_name_snapshot, option_category_snapshot, extra_price_snapshot
                    ) VALUES (
                        v_order_item_id, v_opt_id, v_option.name, v_option.category, v_option.extra_price
                    );
                END IF;
            END LOOP;
        END IF;

        -- Actualizar subtotal real del item multiplicado por su cantidad
        UPDATE order_items SET subtotal = v_item_subtotal * v_item.quantity WHERE id = v_order_item_id;
        v_products_subtotal := v_products_subtotal + (v_item_subtotal * v_item.quantity);
    END LOOP;

    v_total_order := v_products_subtotal + v_delivery_fee;

    -- Actualizar totales en la cabecera
    UPDATE orders 
    SET products_subtotal = v_products_subtotal, total_order = v_total_order 
    WHERE id = v_order_id;

    -- Registrar auditoría inicial
    INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes)
    VALUES (v_order_id, NULL, 'pendiente_confirmacion', 'cliente', 'Pedido registrado vía web');

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'products_subtotal', v_products_subtotal,
        'delivery_fee', v_delivery_fee,
        'total_order', v_total_order,
        'status', 'pendiente_confirmacion'
    );
END;
$$;

-- 10. FUNCIÓN RPC: ASIGNAR REPARTIDOR Y GENERAR TOKEN SEGURO
CREATE OR REPLACE FUNCTION assign_rider(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plain_token VARCHAR(64);
    v_token_hash VARCHAR(64);
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generar token aleatorio de 32 bytes (64 chars hex)
    v_plain_token := encode(gen_random_bytes(32), 'hex');
    v_token_hash := encode(digest(v_plain_token, 'sha256'), 'hex');
    v_expires_at := CURRENT_TIMESTAMP + INTERVAL '24 hours';

    UPDATE orders 
    SET rider_token_hash = v_token_hash,
        rider_token_expires_at = v_expires_at,
        rider_token_revoked = FALSE,
        status = 'asignado_a_repartidor'
    WHERE id = p_order_id;

    INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes)
    VALUES (p_order_id, 'en_preparacion', 'asignado_a_repartidor', 'admin', 'Token de repartidor generado');

    -- Solo en este momento se retorna el token plano al administrador
    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'plain_token', v_plain_token,
        'expires_at', v_expires_at
    );
END;
$$;

-- 11. FUNCIÓN RPC: CONSULTA SEGURA DE LA FICHA DEL REPARTIDOR
CREATE OR REPLACE FUNCTION get_rider_sheet(p_order_id UUID, p_plain_token VARCHAR(64))
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_input_hash VARCHAR(64);
    v_order RECORD;
BEGIN
    v_input_hash := encode(digest(p_plain_token, 'sha256'), 'hex');

    SELECT order_number, customer_name, customer_phone, street_and_number,
           neighborhood, references_text, latitude, longitude, delivery_fee, status
    INTO v_order
    FROM orders
    WHERE id = p_order_id
      AND rider_token_hash = v_input_hash
      AND rider_token_expires_at > CURRENT_TIMESTAMP
      AND rider_token_revoked = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ficha no disponible, token inválido o expirado';
    END IF;

    RETURN jsonb_build_object(
        'order_number', v_order.order_number,
        'status', v_order.status,
        'customer_name', v_order.customer_name,
        'customer_phone', v_order.customer_phone,
        'street_and_number', v_order.street_and_number,
        'neighborhood', v_order.neighborhood,
        'references_text', v_order.references_text,
        'latitude', v_order.latitude,
        'longitude', v_order.longitude,
        'delivery_fee_to_collect', v_order.delivery_fee
    );
END;
$$;
```

---

## 4. Flujo Financiero y Separación de Cobros (Negocio vs. Repartidor)

```
┌────────────────────────────────────────────────────────────────┐
│                   DESGLOSE DEL COBRO                           │
├────────────────────────────────┬───────────────────────────────┤
│ 1. ALIMENTOS (Para el Negocio) │ 2. FLETE (Para el Repartidor) │
│ Subtotal Productos: $95.00 MXN │ Tarifa de Envío: $25.00 MXN   │
│ Receptor: BAKU-BAKU            │ Receptor: Repartidor Externo  │
│ Método: Efectivo al recoger /  │ Método: Efectivo directo      │
│         Transferencia previa   │         al entregar el domo   │
└────────────────────────────────┴───────────────────────────────┘
```

1. **El Repartidor no cobra los alimentos:** Por defecto, el repartidor solo tiene derecho y responsabilidad sobre el cobro de la **tarifa de envío**, salvo que el negocio establezca explícitamente un acuerdo de contra-entrega total para ese pedido.
2. **Modalidad Recogida en Taller:**
   * Alimentos: Se pagan al negocio.
   * Envío: **$0.00 MXN**.
3. **Modalidad Entrega a Domicilio:**
   * La ficha del repartidor muestra en tipografía destacada:
     `"MONTO A COBRAR POR SERVICIO DE ENTREGA: $[Tarifa] MXN"`.
   * Si los alimentos ya fueron pagados por transferencia al negocio, la ficha indica claramente: `"ALIMENTOS: YA PAGADOS AL NEGOCIO — NO COBRAR PRODUCTOS"`.

---

## 5. Simplificación del Mapa Inicial (Sin Nominatim)

```
[ Formulario de Entrega ]
  ├── 1. Selección de Colonia (Menú desplegable ligado a delivery_zones aprobadas)
  ├── 2. Calle, número exterior/interior y Referencias (Input texto manual)
  └── 3. Pin en Mapa (Leaflet + OpenStreetMap tiles)
       ├── Opción A: Botón "Usar mi ubicación GPS" (Nativa del navegador: navigator.geolocation)
       └── Opción B: Arrastrar el pin manualmente dentro del área visible.
```

* **Eliminación Total de Nominatim en MVP:** No se realizará ninguna consulta de geocodificación inversa por texto o coordenadas.
* **Ventajas:** Cero riesgo de bloqueo de IP por parte de OSM, cero dependencias de APIs de terceros y carga inmediata en dispositivos móviles de gama baja.
* **Resultado:** Se guarda la latitud/longitud exacta donde el cliente situó el pin, y esa misma coordenada se traduce en los botones directos de Google Maps y Waze en la ficha del repartidor:
  `https://www.google.com/maps/search/?api=1&query={lat},{lng}`

---

## 6. Gestión de la Pausa por Inactividad en Supabase Free

Supabase pausa los proyectos del plan gratuito si no reciben consultas durante **7 días consecutivos**.

### Estrategia de Operación sin Costos ni Pings Artificiales:
1. **Comportamiento en Operación Real:** Durante la operación comercial semanal, las consultas naturales de los clientes al consultar el menú o realizar pedidos mantienen el proyecto activo de manera orgánica.
2. **Procedimiento de Despausa (En períodos de prueba o baja actividad):**
   * Si el proyecto entra en pausa, los datos **no se pierden ni se alteran**.
   * El propietario ingresa a `supabase.com/dashboard` y hace clic en el botón **"Restore Project"**.
   * La base de datos vuelve a estar 100% operativa en **1 a 2 minutos** sin costo alguno.
3. **Manejo de Errores en Frontend:** Si la base de datos estuviera en pausa, la aplicación web muestra un mensaje amigable:
   > *"Estamos preparando la cocina para hoy. Si deseas ordenar de inmediato, contáctanos directamente por WhatsApp pulsando aquí."*

---

## 7. Lista Corta de Decisiones Comerciales Pendientes

Antes de vaciar datos definitivos en las migraciones de la base de datos, se requiere que el propietario determine:

1. **Tabla Oficial de Zonas y Tarifas de Temixco:**
   * Lista de colonias exactas con cobertura.
   * Tarifa oficial asignada a cada colonia.
   * Límite estricto de exclusión (definición geográfica de "la pista").
2. **Precio Oficial de la Bola Base:**
   * Confirmar si el precio de lanzamiento será **$95 MXN** o si habrá ajuste tras calcular costos de empaque y mermas.
3. **Precios de Extras y Regla Definitiva de Salsas:**
   * ¿Se aprueba la regla de **hasta 2 decoraciones y 1 salsa incluida**?
   * ¿Cuál será el costo unitario por porción extra de salsa o aguacate adicional?
4. **Política de Cobro de Alimentos:**
   * Definir si el cliente transfiere al negocio antes de despachar el pedido o si en casos especiales el repartidor cobra la totalidad en efectivo contra entrega.

---

## 8. Estado del Sistema

* No se ha escrito código de la aplicación.
* No se han instalado paquetes npm ni herramientas de construcción.
* No se han creado proyectos ni recursos en plataformas externas.
* Los activos oficiales se mantienen intactos.
