import { authClient } from "@/lib/auth-client.ts";

export function useAuth() {
  const session = authClient.useSession();
  return {
    user: session.data?.user ?? null,
    isAuthenticated: Boolean(session.data?.user),
    isLoading: session.isPending,
    signOut: authClient.signOut,
  };
}
