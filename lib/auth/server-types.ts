/** What a server component may know about the visitor (Phase 29). */
export interface ServerAuth {
  /**
   * Supabase mode: a verified Supabase user exists. Local mode: the `np_logged_in` cookie is present, a HINT
   * only (display decisions such as "Masuk" vs "Profil", never access to data).
   */
  loggedIn: boolean;
  /** Supabase mode only: the visitor's access token. Local mode: always undefined (no token on the server). */
  accessToken?: string;
  /** Supabase mode only: `user_metadata.full_name`. Local mode: null (the client shows the name). */
  fullName: string | null;
}
