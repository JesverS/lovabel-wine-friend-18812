CREATE OR REPLACE FUNCTION public.increment_hashtag_usage(p_tag text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.hashtag (tag, usage_count)
  VALUES (p_tag, 1)
  ON CONFLICT (tag)
  DO UPDATE SET usage_count = hashtag.usage_count + 1
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;