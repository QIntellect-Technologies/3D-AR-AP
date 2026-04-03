import { supabase } from '../config/supabase';

export async function getSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('getSession error:', error.message);
      return null;
    }

    return session ?? null;
  } catch (e: any) {
    console.error('getSession failed:', e?.message ?? String(e));
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();

  console.log('getAccessToken session exists?', !!session);
  console.log('getAccessToken token exists?', !!session?.access_token);
  console.log('getAccessToken expires_at =', session?.expires_at);

  return session?.access_token ?? null;
}

// 👇 Add this function
export async function refreshSession(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Refresh session error:', error.message);
      return false;
    }

    console.log('Session refreshed successfully');
    return true;
  } catch (err: any) {
    console.error('Failed to refresh session:', err?.message ?? String(err));
    return false;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}
