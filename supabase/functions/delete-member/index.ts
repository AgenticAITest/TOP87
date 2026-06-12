import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    // Verify caller identity with their own JWT
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    // Verify caller is super admin
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', caller.id)
      .single();
    if (!callerProfile?.is_super_admin) return json({ error: 'Forbidden: super admin only' }, 403);

    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') return json({ error: 'userId is required' }, 400);
    if (userId === caller.id) return json({ error: 'Cannot delete your own account' }, 400);

    // Service-role client for privileged operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Capture name before deletion for the audit log
    const { data: target } = await adminClient
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();

    // Write audit log first — record exists even if deletion fails
    await adminClient.from('audit_log').insert({
      action:    'member_hard_deleted',
      actor_id:  caller.id,
      target_id: userId,
      details:   { deleted_name: target?.name ?? 'unknown', reason: 'admin_hard_delete' },
    });

    // Delete profile row first (cascades to charter_members, profile_friends, etc.)
    await adminClient.from('profiles').delete().eq('id', userId);

    // Hard-delete the auth user (requires service role)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) return json({ error: deleteError.message }, 500);

    return json({ success: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
