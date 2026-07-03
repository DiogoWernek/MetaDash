import type { AccountBalance } from "@/app/api/balance/route";

// Único ponto de config do alerta de saldo baixo — usado tanto no card individual
// (HeroMetrics) quanto no banner de alertas gerais (AlertaCritico).
export const LOW_BALANCE_THRESHOLD = 100;
export const LOW_BALANCE_ACCOUNT_NAME = "BM Saúde";

export function findLowBalance(balances: AccountBalance[]): AccountBalance | undefined {
  return balances.find(
    (b) => b.name === LOW_BALANCE_ACCOUNT_NAME && b.is_prepay && b.value < LOW_BALANCE_THRESHOLD
  );
}
