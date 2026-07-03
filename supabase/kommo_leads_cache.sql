CREATE TABLE IF NOT EXISTS kommo_leads_cache (
  lead_id      bigint PRIMARY KEY,
  price        numeric NOT NULL DEFAULT 0,
  status_id    integer NOT NULL DEFAULT 0,
  status_name  text NOT NULL DEFAULT '',
  is_won       boolean NOT NULL DEFAULT false,
  is_lost      boolean NOT NULL DEFAULT false,
  course       text NOT NULL DEFAULT 'Não informado',
  source       text NOT NULL DEFAULT 'Não informado',
  created_date date NOT NULL,
  synced_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kommo_leads_cache_date_idx ON kommo_leads_cache (created_date);

-- 2026-07-02 — Reconstrução da aba CRM (Aquisição/Triagem × Comercial/Consultoras):
-- pipeline_id distingue os dois funis; os 4 campos abaixo mapeiam campos customizados
-- do Kommo já existentes na conta da Navigare (ver KOMMO_*_FIELD_ID no .env/wrangler.toml).
ALTER TABLE kommo_leads_cache ADD COLUMN IF NOT EXISTS pipeline_id integer NOT NULL DEFAULT 0;
ALTER TABLE kommo_leads_cache ADD COLUMN IF NOT EXISTS entrada_prospeccao text NOT NULL DEFAULT 'Não informado';
ALTER TABLE kommo_leads_cache ADD COLUMN IF NOT EXISTS setor text NOT NULL DEFAULT 'Não informado';
ALTER TABLE kommo_leads_cache ADD COLUMN IF NOT EXISTS motivo_perda text NOT NULL DEFAULT '';
ALTER TABLE kommo_leads_cache ADD COLUMN IF NOT EXISTS submotivo_perda text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS kommo_leads_cache_pipeline_idx ON kommo_leads_cache (pipeline_id);
