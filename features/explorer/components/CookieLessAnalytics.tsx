"use client";

import { useEffect } from "react";

const SCRIPT_ID = "chesstree-cookieless-analytics";
const SCRIPT_URL = "https://analytics.markellosecosystem.com/v1/script.js";
const PRODUCTION_HOSTNAME = "chesstree.markellosecosystem.com";

export function CookieLessAnalytics() {
  useEffect(() => {
    if (
      window.location.protocol !== "https:"
      || window.location.hostname.toLowerCase() !== PRODUCTION_HOSTNAME
      || document.getElementById(SCRIPT_ID)
    ) {
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = SCRIPT_URL;
    document.head.append(script);
  }, []);

  return null;
}
