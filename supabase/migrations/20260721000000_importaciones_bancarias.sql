-- Create table for importaciones_bancarias
CREATE TABLE IF NOT EXISTS public.importaciones_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_archivo TEXT NOT NULL,
    tipo_archivo TEXT NOT NULL,
    ruta_storage TEXT NOT NULL,
    tamano BIGINT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Pendiente',
    cantidad_movimientos INTEGER,
    observaciones TEXT,
    resultado_procesamiento JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_estado CHECK (estado IN ('Pendiente', 'Procesando', 'Procesado', 'Error'))
);

-- Enable RLS
ALTER TABLE public.importaciones_bancarias ENABLE ROW LEVEL SECURITY;

-- Create policy for user's own data
CREATE POLICY "Users can only see and modify their own importaciones"
    ON public.importaciones_bancarias
    FOR ALL
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

-- Storage Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('importaciones', 'importaciones', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for authenticated users
CREATE POLICY "Authenticated users can upload files to importaciones bucket"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'importaciones' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own files in importaciones bucket"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'importaciones' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own files in importaciones bucket"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'importaciones' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own files in importaciones bucket"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'importaciones' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS importaciones_bancarias_updated_at ON public.importaciones_bancarias;
CREATE TRIGGER importaciones_bancarias_updated_at
BEFORE UPDATE ON public.importaciones_bancarias
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
