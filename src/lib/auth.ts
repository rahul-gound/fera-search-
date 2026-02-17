/* Supabase auth placeholders — wire up when ready */

export async function signIn(_email: string): Promise<void> {
  // TODO: Supabase signInWithOtp({ email })
  console.info("[auth] signIn placeholder");
}

export async function verifyOtp(
  _email: string,
  _token: string
): Promise<void> {
  // TODO: Supabase verifyOtp({ email, token, type: "email" })
  console.info("[auth] verifyOtp placeholder");
}

export async function signOut(): Promise<void> {
  // TODO: Supabase signOut()
  console.info("[auth] signOut placeholder");
}

export async function getUser(): Promise<null> {
  // TODO: Supabase getUser()
  return null;
}
