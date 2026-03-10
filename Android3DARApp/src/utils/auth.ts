// import { supabase } from '../config/supabase';

// export async function getSession() {
//   const { data } = await supabase.auth.getSession();
//   return data.session ?? null;
// }

// export async function getAccessToken(): Promise<string | null> {
//   const session = await getSession();
//   return session?.access_token ?? null;
// }

// export async function signOut() {
//   await supabase.auth.signOut();
// }
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

export async function signOut() {
  await supabase.auth.signOut();
}
