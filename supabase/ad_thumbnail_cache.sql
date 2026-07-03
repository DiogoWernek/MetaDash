-- Cache server-side de thumbnail/imagem de criativo — evita refazer as até 3 chamadas
-- sequenciais à Graph API (adimages + thumbnail hi-res + video thumbnails) toda vez que
-- a aba Criativos carrega. A imagem de um anúncio não muda depois de criado, então cache
-- sem expiração é seguro; ver app/api/ad-thumbnail/route.ts.
CREATE TABLE IF NOT EXISTS ad_thumbnail_cache (
  ad_id         text PRIMARY KEY,
  account_id    text NOT NULL,
  thumbnail_url text,
  image_url     text,
  is_video      boolean NOT NULL DEFAULT false,
  cached_at     timestamptz NOT NULL DEFAULT now()
);
