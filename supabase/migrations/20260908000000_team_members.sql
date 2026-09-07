-- ---------- team_members ----------
-- Staff/agents who take orders (Team Work section inside Orders).
-- These are NOT separate logins — they're a tracking tag attached to an
-- order so the shop owner can see who booked which order.
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  member_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own team members" ON public.team_members;
CREATE POLICY "own team members" ON public.team_members FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- One member code per shop owner (case-insensitive), so codes don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_code_idx
  ON public.team_members (user_id, lower(member_code))
  WHERE member_code IS NOT NULL AND member_code <> '';

-- ---------- orders: link to the team member who booked it ----------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_member_name text;
