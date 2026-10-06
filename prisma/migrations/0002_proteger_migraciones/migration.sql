-- La tabla de control de Prisma no se expone por la API de Supabase.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._prisma_migrations FROM anon, authenticated;
