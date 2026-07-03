"use client";

import { useState, useEffect } from "react";
import type { AccountBalance } from "@/app/api/balance/route";

export function useBalance() {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/balance")
      .then((r) => r.json())
      .then((d: { balances?: AccountBalance[] }) => {
        if (!cancelled) setBalances(d.balances ?? []);
      })
      .catch(() => { if (!cancelled) setBalances([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { balances, loading };
}
