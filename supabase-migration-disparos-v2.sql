-- ============================================================
-- MIGRATION v2: Automações + Disparos
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── 1. HORÁRIO COMERCIAL ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS horario_comercial (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id       uuid REFERENCES clinics(id) ON DELETE CASCADE,
  instancia       text NOT NULL,
  uazapi_token    text,
  uazapi_base_url text DEFAULT 'https://customix.uazapi.com',
  hora_inicio     text DEFAULT '08:00',
  hora_fim        text DEFAULT '18:00',
  dias_semana     integer[] DEFAULT '{1,2,3,4,5}',
  mensagem_fora   text,
  ativo           boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Caso a tabela já existisse sem essas colunas, adiciona sem erro
ALTER TABLE horario_comercial
  ADD COLUMN IF NOT EXISTS uazapi_token    text,
  ADD COLUMN IF NOT EXISTS uazapi_base_url text DEFAULT 'https://customix.uazapi.com';

-- ── 2. SCRIPTS AUTOMÁTICOS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS auto_scripts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id       uuid REFERENCES clinics(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  tipo_gatilho    text DEFAULT 'texto_exato',
  gatilho_valor   text,
  acao_pos_envio  text DEFAULT 'aguardar',
  ativo           boolean DEFAULT true,
  ordem           integer DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auto_script_partes (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id uuid REFERENCES auto_scripts(id) ON DELETE CASCADE,
  ordem     integer DEFAULT 1,
  tipo      text DEFAULT 'texto',
  conteudo  text,
  delay_ms  integer DEFAULT 1500
);

-- ── 3. PROMPTS DE IA ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ia_prompts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id       uuid REFERENCES clinics(id) ON DELETE CASCADE UNIQUE,
  system_prompt   text,
  max_tentativas  integer DEFAULT 2,
  modelo          text DEFAULT 'gpt-4o-mini',
  temperatura     numeric DEFAULT 0.3,
  ativo           boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now()
);

-- ── 4. LOGS DE AUTOMAÇÃO ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS automacao_logs (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  whatsapp  text,
  tipo      text,
  entrada   text,
  saida     text,
  sucesso   boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

-- ── 5. GARANTIR TODAS AS COLUNAS EM disparos E disparo_leads ──
-- (ADD COLUMN IF NOT EXISTS não dá erro se a coluna já existir)

ALTER TABLE disparos
  ADD COLUMN IF NOT EXISTS template_id        uuid REFERENCES message_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mensagem_base       text,
  ADD COLUMN IF NOT EXISTS agendado_para       timestamptz,
  ADD COLUMN IF NOT EXISTS intervalo_tipo      text DEFAULT 'aleatorio',
  ADD COLUMN IF NOT EXISTS intervalo_segundos  integer,
  ADD COLUMN IF NOT EXISTS status              text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS total_leads         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_enviados      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_erros         integer DEFAULT 0;

ALTER TABLE disparo_leads
  ADD COLUMN IF NOT EXISTS lead_id     uuid REFERENCES leads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS whatsapp    text,
  ADD COLUMN IF NOT EXISTS mensagem    text,
  ADD COLUMN IF NOT EXISTS status      text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS enviado_em  timestamptz,
  ADD COLUMN IF NOT EXISTS erro_msg    text;

-- ── 6. RLS E POLÍTICAS ───────────────────────────────────────
ALTER TABLE horario_comercial  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_scripts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_script_partes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_prompts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE automacao_logs     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='horario_comercial' AND policyname='auth_horario') THEN
    CREATE POLICY "auth_horario" ON horario_comercial FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='auto_scripts' AND policyname='auth_auto_scripts') THEN
    CREATE POLICY "auth_auto_scripts" ON auto_scripts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='auto_script_partes' AND policyname='auth_auto_script_partes') THEN
    CREATE POLICY "auth_auto_script_partes" ON auto_script_partes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ia_prompts' AND policyname='auth_ia_prompts') THEN
    CREATE POLICY "auth_ia_prompts" ON ia_prompts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='automacao_logs' AND policyname='auth_automacao_logs') THEN
    CREATE POLICY "auth_automacao_logs" ON automacao_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Pronto. Execute no Supabase SQL Editor.
