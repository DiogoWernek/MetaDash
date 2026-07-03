import { NextRequest, NextResponse } from "next/server";

export interface AdThumbnailData {
  thumbnail_url?: string;
  image_url?: string;
  is_video: boolean;
}

const USE_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<project-ref>") ||
  process.env.USE_MOCK_DATA === "true";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const metaAdId = searchParams.get("metaAdId");
  const accountId = searchParams.get("accountId");

  if (!metaAdId || !accountId) {
    return NextResponse.json({ error: "Parâmetros obrigatórios: metaAdId, accountId" }, { status: 400 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ thumbnail_url: undefined, image_url: undefined, is_video: false } satisfies AdThumbnailData);
  }

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");

    // ── 1. Cache — a imagem de um anúncio não muda depois de criado ──────────
    const { data: cached } = await supabaseAdmin
      .from("ad_thumbnail_cache")
      .select("thumbnail_url, image_url, is_video")
      .eq("ad_id", metaAdId)
      .limit(1);

    if (cached && cached.length > 0) {
      const row = cached[0];
      return NextResponse.json({
        thumbnail_url: row.thumbnail_url ?? undefined,
        image_url: row.image_url ?? undefined,
        is_video: !!row.is_video,
      } satisfies AdThumbnailData);
    }

    // ── 2. Cache miss → busca ao vivo (até 3 chamadas à Graph API) ───────────
    const { fetchAdCreative } = await import("@/lib/meta");

    const { data: accounts, error } = await supabaseAdmin
      .from("ad_accounts")
      .select("access_token, meta_account_id")
      .eq("id", accountId)
      .limit(1);

    if (error || !accounts?.length) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    const { access_token, meta_account_id } = accounts[0];
    const creative = await fetchAdCreative(metaAdId, access_token, meta_account_id);

    const result: AdThumbnailData = {
      thumbnail_url: creative?.thumbnail_url,
      image_url: creative?.image_url,
      is_video: !!creative?.video_id,
    };

    // Grava no cache em background — não bloqueia a resposta
    supabaseAdmin
      .from("ad_thumbnail_cache")
      .upsert(
        { ad_id: metaAdId, account_id: accountId, ...result, cached_at: new Date().toISOString() },
        { onConflict: "ad_id" }
      )
      .then(({ error: upsertErr }) => {
        if (upsertErr) console.error("[ad-thumbnail] Erro ao gravar cache:", upsertErr);
      });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[ad-thumbnail] Error:", err);
    return NextResponse.json({ error: "Falha ao carregar thumbnail" }, { status: 500 });
  }
}
