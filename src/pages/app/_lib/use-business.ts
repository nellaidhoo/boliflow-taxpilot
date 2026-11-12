import { useOutletContext } from "react-router-dom";
import type { Business } from "@/lib/api.ts";

/** The current business, provided by the app layout once the profile exists. */
export function useBusiness(): Business {
  return useOutletContext<Business>();
}
