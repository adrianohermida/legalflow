/**
 * Redirect Handler - Legacy Route Compatibility
 * Handles redirects from old route patterns to new unified routes
 */

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LEGACY_REDIRECTS } from "../lib/routes";

export function RedirectHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = location.pathname;

    // Check for exact match redirects
    const exactRedirect =
      LEGACY_REDIRECTS[currentPath as keyof typeof LEGACY_REDIRECTS];
    if (exactRedirect) {
      navigate(exactRedirect, { replace: true });
      return;
    }

    // Check for pattern-based redirects (with parameters)
    for (const [legacyPattern, newRoute] of Object.entries(LEGACY_REDIRECTS)) {
      if (legacyPattern.includes(":")) {
        const patternRegex = legacyPattern.replace(/:\w+/g, "([^/]+)");
        const regex = new RegExp(`^${patternRegex}$`);
        const match = currentPath.match(regex);

        if (match) {
          // Extract parameter names from pattern
          const paramNames =
            legacyPattern.match(/:\w+/g)?.map((p) => p.slice(1)) || [];
          const paramValues = match.slice(1);

          // Build new URL with parameters
          let newUrl = newRoute;
          paramNames.forEach((paramName, index) => {
            newUrl = newUrl.replace(`:${paramName}`, paramValues[index] || "");
          });

          navigate(newUrl, { replace: true });
          return;
        }
      }
    }
  }, [location.pathname, navigate]);

  return null;
}
