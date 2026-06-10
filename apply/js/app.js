const SUPABASE_URL     = 'https://nzoljvgtagplgpklnczo.supabase.co';
const SUPABASE_ANON    = 'sb_publishable_G5m_mpzl1vN5cuATFLlMJg_Wdqpr4Er';
const DASHBOARD_URL    = 'https://analyticsresearchsciencesorcercies.github.io/sakala-haiti-draft/apply/dashboard.html';
const BASE             = '/sakala-haiti-draft/apply';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});

async function getSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) { window.location.href = BASE + '/login.html'; return null; }
  return session;
}

async function getSponsor(userId) {
  const { data } = await db.from('sponsors').select('*').eq('user_id', userId).single();
  return data;
}

async function getYouth(sponsorId) {
  const { data } = await db
    .from('sponsor_youth')
    .select('youth(*)')
    .eq('sponsor_id', sponsorId)
    .single();
  return data?.youth || null;
}

async function getUpdates(youthId) {
  const { data } = await db
    .from('updates')
    .select('*')
    .eq('published', true)
    .or(youthId ? `youth_id.is.null,youth_id.eq.${youthId}` : 'youth_id.is.null')
    .order('created_at', { ascending: false });
  return data || [];
}

async function signOut() {
  await db.auth.signOut();
  window.location.href = BASE + '/';
}
