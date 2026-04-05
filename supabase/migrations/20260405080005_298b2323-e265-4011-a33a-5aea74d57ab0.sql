-- Drop the legacy 10-parameter overload that causes RPC ambiguity
DROP FUNCTION IF EXISTS public.find_or_create_wine(text, uuid, integer, integer, real, text, text, numeric, bigint, integer);

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';