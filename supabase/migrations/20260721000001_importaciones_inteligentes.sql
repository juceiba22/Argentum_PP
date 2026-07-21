-- =========================================
-- TABLA PRINCIPAL: importaciones
-- =========================================
CREATE TABLE IF NOT EXISTS public.importaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origen TEXT NOT NULL,
    tipo_archivo TEXT,
    nombre_archivo TEXT,
    ruta_storage TEXT,
    tamano BIGINT,
    estado TEXT NOT NULL DEFAULT 'Pendiente',
    cantidad_registros INTEGER DEFAULT 0,
    resultado_procesamiento JSONB,
    metadata JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT check_origen CHECK (origen IN ('BANCO', 'ARCA', 'PAYWAY', 'MERCADOPAGO', 'OTRO')),
    CONSTRAINT check_estado CHECK (estado IN ('Pendiente', 'Procesando', 'Procesado', 'Error'))
);

-- INDICES
CREATE INDEX IF NOT EXISTS importaciones_usuario_id_idx ON public.importaciones(usuario_id);
CREATE INDEX IF NOT EXISTS importaciones_estado_idx ON public.importaciones(estado);
CREATE INDEX IF NOT EXISTS importaciones_origen_idx ON public.importaciones(origen);
CREATE INDEX IF NOT EXISTS importaciones_created_at_desc_idx ON public.importaciones(created_at DESC);

-- TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS importaciones_updated_at ON public.importaciones;
CREATE TRIGGER importaciones_updated_at
BEFORE UPDATE ON public.importaciones
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.importaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own importaciones"
    ON public.importaciones FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can read their own importaciones"
    ON public.importaciones FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

CREATE POLICY "Users can update their own importaciones"
    ON public.importaciones FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Ningún usuario pueda eliminar registros de otros usuarios (al no existir POLICY para DELETE, por defecto se deniega todo DELETE)

-- =========================================
-- PREPARAR FUTURAS TABLAS
-- =========================================

-- movimientos_importados
CREATE TABLE IF NOT EXISTS public.movimientos_importados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    importacion_id UUID NOT NULL REFERENCES public.importaciones(id) ON DELETE CASCADE,
    fecha DATE,
    descripcion TEXT,
    importe NUMERIC,
    saldo NUMERIC,
    tipo TEXT,
    categoria TEXT,
    datos_originales JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- facturas_importadas
CREATE TABLE IF NOT EXISTS public.facturas_importadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    importacion_id UUID NOT NULL REFERENCES public.importaciones(id) ON DELETE CASCADE,
    cuit TEXT,
    razon_social TEXT,
    tipo_comprobante TEXT,
    numero TEXT,
    fecha DATE,
    subtotal NUMERIC,
    iva NUMERIC,
    total NUMERIC,
    estado TEXT,
    datos_originales JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for child tables
ALTER TABLE public.movimientos_importados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_importadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own movimientos_importados"
    ON public.movimientos_importados FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.importaciones
        WHERE importaciones.id = movimientos_importados.importacion_id
        AND importaciones.usuario_id = auth.uid()
    ));

CREATE POLICY "Users can access their own facturas_importadas"
    ON public.facturas_importadas FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.importaciones
        WHERE importaciones.id = facturas_importadas.importacion_id
        AND importaciones.usuario_id = auth.uid()
    ));
