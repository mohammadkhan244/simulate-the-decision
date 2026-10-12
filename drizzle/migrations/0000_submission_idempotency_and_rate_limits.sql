CREATE TABLE public.submission_receipts (
  submission_id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('enquiry','exercise')),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','saved','failed')),
  notion_page_id text,
  locked_until timestamptz NOT NULL DEFAULT now() + interval '45 seconds',
  attempts integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.submission_receipts IS 'Idempotency receipts only. Never store form answers here.';
GRANT ALL ON public.submission_receipts TO service_role;
ALTER TABLE public.submission_receipts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomically claim a submission ID.
-- Returns: 'claimed' (new), 'reclaimed' (earlier attempt failed/stalled: reconcile first),
-- 'busy' (another request is processing it), 'saved' (already persisted), 'conflict' (ID used for other kind).
CREATE OR REPLACE FUNCTION public.claim_submission(_id uuid, _kind text)
RETURNS TABLE(outcome text, page_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.submission_receipts%ROWTYPE;
BEGIN
  INSERT INTO public.submission_receipts(submission_id, kind) VALUES (_id, _kind)
  ON CONFLICT (submission_id) DO NOTHING;
  IF FOUND THEN RETURN QUERY SELECT 'claimed'::text, NULL::text; RETURN; END IF;
  SELECT * INTO r FROM public.submission_receipts WHERE submission_id = _id FOR UPDATE;
  IF r.kind <> _kind THEN RETURN QUERY SELECT 'conflict'::text, NULL::text; RETURN; END IF;
  IF r.status = 'saved' THEN RETURN QUERY SELECT 'saved'::text, r.notion_page_id; RETURN; END IF;
  IF r.status = 'processing' AND r.locked_until > now() THEN RETURN QUERY SELECT 'busy'::text, NULL::text; RETURN; END IF;
  UPDATE public.submission_receipts
     SET status = 'processing', locked_until = now() + interval '45 seconds', attempts = attempts + 1, updated_at = now()
   WHERE submission_id = _id;
  RETURN QUERY SELECT 'reclaimed'::text, NULL::text;
END $$;

CREATE OR REPLACE FUNCTION public.finish_submission(_id uuid, _status text, _page_id text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.submission_receipts
     SET status = _status, notion_page_id = COALESCE(_page_id, notion_page_id),
         locked_until = now(), updated_at = now()
   WHERE submission_id = _id AND status <> 'saved';
$$;

CREATE OR REPLACE FUNCTION public.read_submission(_id uuid)
RETURNS TABLE(status text, page_id text) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT status, notion_page_id FROM public.submission_receipts WHERE submission_id = _id;
$$;

-- Shared fixed-window limiter. Returns true when the hit is allowed.
CREATE OR REPLACE FUNCTION public.hit_rate_limit(_bucket text, _window_seconds integer, _max integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w timestamptz; n integer;
BEGIN
  w := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  INSERT INTO public.rate_limits(bucket, window_start, hits) VALUES (_bucket, w, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = public.rate_limits.hits + 1
  RETURNING hits INTO n;
  IF random() < 0.02 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;
  RETURN n <= _max;
END $$;

REVOKE ALL ON FUNCTION public.claim_submission(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_submission(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_submission(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_submission(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_submission(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_submission(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO service_role;