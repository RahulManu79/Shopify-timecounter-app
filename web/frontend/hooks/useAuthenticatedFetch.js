import { useMemo } from "react";

/**
 * A hook that returns an authenticated fetch function.
 * Authentication is handled by the Shopify Express middleware via
 * cookie-based session tokens (bounce-page flow). The `credentials: "include"`
 * ensures session cookies are sent with every request.
 */
export function useAuthenticatedFetch() {
  return useMemo(() => {
    return async (url, options = {}) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      return response;
    };
  }, []);
}
