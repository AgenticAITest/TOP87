-- Super-admin correction of a member's detail data (typos / wrong values in collected data).
--
-- Edits one alumni_roster row and, if that row is linked to an account (profile_id), the same
-- person's profiles row — in one transaction, so the two copies can't drift apart. Works for the
-- unregistered alumni too (roster-only; the profile part is skipped).
--
-- Every editable field is passed in full (the admin form pre-fills current values); an empty
-- string is stored as NULL. birthdate is a single value written to BOTH tables, because the
-- birthday card reads alumni_roster.birthdate while members see profiles.birthdate.
--
-- Writes an audit_log row ('member_details_updated') with before/after of the changed fields.
-- Super-admin only: the function checks is_super_admin itself (SECURITY DEFINER bypasses RLS).
--
-- ⚠️ NOT YET APPLIED to production — run in the Supabase SQL editor BEFORE deploying the
--    front-end that calls admin_update_member().

CREATE OR REPLACE FUNCTION public.admin_update_member(
  p_roster_id    uuid,
  p_nama_lengkap text,
  p_nama_update  text,
  p_birthdate    date,
  p_notes        text,
  -- Profile fields — ignored when the roster row has no linked account.
  p_name         text DEFAULT NULL,
  p_nickname     text DEFAULT NULL,
  p_kelas        text DEFAULT NULL,
  p_whatsapp     text DEFAULT NULL,
  p_phone        text DEFAULT NULL,
  p_city         text DEFAULT NULL,
  p_profession   text DEFAULT NULL,
  p_tshirt_size  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roster_before jsonb;
  v_roster_after  jsonb;
  v_prof_before   jsonb;
  v_prof_after    jsonb;
  v_profile_id    uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true) THEN
    RAISE EXCEPTION 'Only super admins can edit member details' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(p_nama_lengkap), '') IS NULL THEN
    RAISE EXCEPTION 'nama_lengkap is required';
  END IF;

  SELECT profile_id,
         jsonb_build_object('nama_lengkap', nama_lengkap, 'nama_update', nama_update,
                            'birthdate', birthdate, 'notes', notes)
    INTO v_profile_id, v_roster_before
    FROM alumni_roster WHERE id = p_roster_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roster entry % not found', p_roster_id;
  END IF;

  UPDATE alumni_roster SET
    nama_lengkap = btrim(p_nama_lengkap),
    nama_update  = NULLIF(btrim(p_nama_update), ''),
    birthdate    = p_birthdate,
    notes        = NULLIF(btrim(p_notes), '')
  WHERE id = p_roster_id
  RETURNING jsonb_build_object('nama_lengkap', nama_lengkap, 'nama_update', nama_update,
                               'birthdate', birthdate, 'notes', notes)
    INTO v_roster_after;

  IF v_profile_id IS NOT NULL THEN
    IF NULLIF(btrim(p_name), '') IS NULL THEN
      RAISE EXCEPTION 'name is required for a linked account';
    END IF;

    SELECT jsonb_build_object('name', name, 'nickname', nickname, 'birthdate', birthdate,
                              'kelas', kelas, 'whatsapp', whatsapp, 'phone', phone, 'city', city,
                              'profession', profession, 'tshirt_size', tshirt_size)
      INTO v_prof_before
      FROM profiles WHERE id = v_profile_id;

    -- kelas is validated by the profiles CHECK constraint (3A–3F or NULL).
    UPDATE profiles SET
      name        = btrim(p_name),
      nickname    = NULLIF(btrim(p_nickname), ''),
      birthdate   = p_birthdate,
      kelas       = NULLIF(btrim(p_kelas), ''),
      whatsapp    = NULLIF(btrim(p_whatsapp), ''),
      phone       = NULLIF(btrim(p_phone), ''),
      city        = NULLIF(btrim(p_city), ''),
      profession  = NULLIF(btrim(p_profession), ''),
      tshirt_size = NULLIF(btrim(p_tshirt_size), ''),
      updated_at  = now()
    WHERE id = v_profile_id
    RETURNING jsonb_build_object('name', name, 'nickname', nickname, 'birthdate', birthdate,
                                 'kelas', kelas, 'whatsapp', whatsapp, 'phone', phone, 'city', city,
                                 'profession', profession, 'tshirt_size', tshirt_size)
      INTO v_prof_after;
  END IF;

  -- No ::text cast: prod's audit_log.target_id is uuid (the table predates the migration that
  -- declares it text). A bare uuid assigns cleanly to either column type.
  INSERT INTO audit_log (action, actor_id, target_id, details)
  VALUES ('member_details_updated', auth.uid(), p_roster_id, jsonb_build_object(
    'profile_id',     v_profile_id,
    'roster_before',  v_roster_before,
    'roster_after',   v_roster_after,
    'profile_before', v_prof_before,
    'profile_after',  v_prof_after
  ));
END;
$$;

REVOKE ALL     ON FUNCTION public.admin_update_member(uuid, text, text, date, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_update_member(uuid, text, text, date, text, text, text, text, text, text, text, text, text) TO authenticated;

-- Verification (as a super admin, in the app or with a JWT): edit a row, then
--   SELECT * FROM audit_log WHERE action = 'member_details_updated' ORDER BY created_at DESC LIMIT 5;
