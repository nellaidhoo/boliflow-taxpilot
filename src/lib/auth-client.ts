import { createAuthClient } from "better-auth/react";

const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;

export const authClient = createAuthClient({
  baseURL: apiUrl,
  basePath: "/v1/auth",
  fetchOptions: { credentials: "include" },
});
