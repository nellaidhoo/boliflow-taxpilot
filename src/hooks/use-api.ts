import { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { requestApi } from "@/lib/api.ts";

export function useApi() {
  const { isAuthenticated } = useAuth();
  const request = useCallback(
    <T,>(path: string, options?: Parameters<typeof requestApi<T>>[1]) => {
      if (!isAuthenticated) throw new Error("Sign in to continue");
      return requestApi<T>(path, options);
    },
    [isAuthenticated],
  );
  return { request, isAuthenticated, isReady: isAuthenticated };
}
