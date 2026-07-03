import { NextResponse } from "next/server";

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<project-ref>") ||
  process.env.USE_MOCK_DATA === "true";

export interface AccountBalance {
  account_id: string;
  name: string;
  currency: string;
  is_prepay: boolean;
  // Pré-pago (ex: PIX): quanto ainda dá pra gastar. Meta não expõe esse valor
  // diretamente — aproximado por (spend_cap - amount_spent) + balance (ver
  // memória crm-dashboard-rewrite-julho — confirmado contra o Gerenciador de
  // Pagamentos real, fica em torno de 5-10% de defasagem por causa do delay
  // da Meta em recalcular spend_cap, não é um valor cravado).
  // Pós-pago (cartão/boleto): balance = quanto já foi gasto e será cobrado
  // (essa parte É exata — bate 100% com "Saldo atual" do Gerenciador).
  value: number; // em reais
}

// Saldo é buscado AO VIVO na Meta a cada chamada — não é gravado no Supabase — porque o
// cliente pediu um valor em tempo real (não faz sentido cachear via sync diário).
export async function GET() {
  if (USE_MOCK) {
    return NextResponse.json({
      balances: [
        { account_id: "mock-1", name: "BM Saúde", currency: "BRL", is_prepay: true, value: 2696.81 },
        { account_id: "mock-2", name: "BM Engenharia", currency: "BRL", is_prepay: false, value: 429.09 },
      ] satisfies AccountBalance[],
    });
  }

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");

    const { data: accounts, error } = await supabaseAdmin
      .from("ad_accounts")
      .select("id,name,meta_account_id,access_token")
      .eq("active", true);

    if (error) throw error;

    const balances: AccountBalance[] = await Promise.all(
      (accounts ?? []).map(async (account) => {
        try {
          const res = await fetch(
            `https://graph.facebook.com/v21.0/${account.meta_account_id}?fields=balance,spend_cap,amount_spent,currency,is_prepay_account&access_token=${account.access_token}`
          );
          const json = await res.json() as {
            balance?: string; spend_cap?: string; amount_spent?: string;
            currency?: string; is_prepay_account?: boolean;
            error?: { message?: string };
          };
          if (!res.ok || json.error) throw new Error(json.error?.message ?? `HTTP ${res.status}`);

          const balanceCents = parseInt(json.balance ?? "0", 10) || 0;
          const spendCapCents = parseInt(json.spend_cap ?? "0", 10) || 0;
          const amountSpentCents = parseInt(json.amount_spent ?? "0", 10) || 0;
          const isPrepay = !!json.is_prepay_account;

          // Pré-pago com spend_cap=0 = sem teto configurado — não dá pra derivar
          // "disponível" nesse caso, cai pro balance bruto como melhor esforço.
          const value = isPrepay && spendCapCents > 0
            ? (spendCapCents - amountSpentCents + balanceCents) / 100
            : balanceCents / 100;

          return {
            account_id: account.id,
            name: account.name,
            currency: json.currency ?? "BRL",
            is_prepay: isPrepay,
            value,
          };
        } catch (err) {
          console.error(`[api/balance] Erro na conta ${account.name}:`, err);
          return { account_id: account.id, name: account.name, currency: "BRL", is_prepay: false, value: 0 };
        }
      })
    );

    return NextResponse.json({ balances });
  } catch (err) {
    console.error("[api/balance] Error:", err);
    return NextResponse.json({ error: "Falha ao carregar saldo das contas" }, { status: 500 });
  }
}
