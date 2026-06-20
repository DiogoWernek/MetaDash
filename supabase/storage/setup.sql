-- =============================================================
-- Supabase Storage: bucket público para imagens de anúncios
-- Executar no SQL Editor do Supabase
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Service role pode fazer upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'ad-images');

CREATE POLICY "Leitura pública de imagens"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad-images');

-- =============================================================
-- Tabela: agent_runs — histórico de criações do agente
-- =============================================================

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES ad_accounts(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL,
  image_url TEXT,
  image_hash TEXT,
  meta_campaign_id TEXT,
  meta_adset_id TEXT,
  meta_creative_id TEXT,
  meta_ad_id TEXT,
  agent_messages JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  error_log TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_account ON agent_runs(account_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created ON agent_runs(created_at DESC);
