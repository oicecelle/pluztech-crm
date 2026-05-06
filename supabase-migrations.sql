-- ============================================================
-- MIGRATIONS — Guia Interativo (Pluz Tech)
-- Rodar no Supabase SQL Editor em: scrhexfcbtdyubehbzml.supabase.co
-- ============================================================

-- 1. Adicionar coluna locais (JSONB) em general_information
ALTER TABLE general_information
  ADD COLUMN IF NOT EXISTS locais jsonb DEFAULT '[]'::jsonb;

-- 2. Estágios do CRM por clínica
CREATE TABLE IF NOT EXISTS crm_estagios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text DEFAULT '#8B6F47',
  ordem integer DEFAULT 0,
  criado_em timestamptz DEFAULT now()
);

-- 3. Status do CRM por clínica
CREATE TABLE IF NOT EXISTS crm_status (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text DEFAULT '#3B82F6',
  ordem integer DEFAULT 0,
  criado_em timestamptz DEFAULT now()
);

-- 4. Etiquetas do CRM por clínica
CREATE TABLE IF NOT EXISTS crm_etiquetas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cor text DEFAULT '#22c55e',
  criado_em timestamptz DEFAULT now()
);

-- 5. Interesses do CRM por clínica
CREATE TABLE IF NOT EXISTS crm_interesses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  nome text NOT NULL,
  criado_em timestamptz DEFAULT now()
);

-- 6. Modelos de mensagem por clínica
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  nome text NOT NULL,
  conteudo text NOT NULL,
  criado_em timestamptz DEFAULT now()
);

-- 7. Leads (caso ainda não exista ou precise de colunas novas)
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sobrenome text,
  whatsapp text,
  email text,
  origem text,
  estagio_id uuid REFERENCES crm_estagios(id) ON DELETE SET NULL,
  status_id uuid REFERENCES crm_status(id) ON DELETE SET NULL,
  aguardando_retorno boolean DEFAULT false,
  fechou boolean DEFAULT false,
  sinal_pago boolean DEFAULT false,
  ja_foi_cliente boolean DEFAULT false,
  valor numeric,
  valor_sinal numeric,
  numero_sessoes integer,
  proximo_agendamento_data timestamptz,
  proximo_agendamento_horario text,
  proximo_agendamento_local text,
  proximo_agendamento_procedimento text,
  data_ultima_interacao timestamptz,
  ultima_interacao_contexto text,
  observacoes text,
  como_conheceu text,
  cidade_bairro text,
  indicado_por text,
  data_cadastro timestamptz DEFAULT now()
);

-- 8. Relação leads ↔ interesses
CREATE TABLE IF NOT EXISTS leads_interesses (
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  interesse_id uuid REFERENCES crm_interesses(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, interesse_id)
);

-- 9. Relação leads ↔ etiquetas
CREATE TABLE IF NOT EXISTS leads_etiquetas (
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  etiqueta_id uuid REFERENCES crm_etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, etiqueta_id)
);

-- 10. Disparos
CREATE TABLE IF NOT EXISTS disparos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  template_id uuid REFERENCES message_templates(id) ON DELETE SET NULL,
  mensagem_base text,
  agendado_para timestamptz,
  intervalo_tipo text DEFAULT 'aleatorio',
  intervalo_segundos integer,
  status text DEFAULT 'pendente',
  total_leads integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 11. Leads por disparo
CREATE TABLE IF NOT EXISTS disparo_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  disparo_id uuid REFERENCES disparos(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  whatsapp text,
  mensagem text,
  status text DEFAULT 'pendente',
  enviado_em timestamptz
);

-- 12. RLS — habilitar nas tabelas novas (permissão para usuário autenticado)
ALTER TABLE crm_estagios ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_interesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE disparo_leads ENABLE ROW LEVEL SECURITY;

-- 13. Políticas de acesso — autenticados podem tudo
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_estagios' AND policyname='autenticados_crm_estagios') THEN
    CREATE POLICY "autenticados_crm_estagios" ON crm_estagios FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_status' AND policyname='autenticados_crm_status') THEN
    CREATE POLICY "autenticados_crm_status" ON crm_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_etiquetas' AND policyname='autenticados_crm_etiquetas') THEN
    CREATE POLICY "autenticados_crm_etiquetas" ON crm_etiquetas FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='crm_interesses' AND policyname='autenticados_crm_interesses') THEN
    CREATE POLICY "autenticados_crm_interesses" ON crm_interesses FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_templates' AND policyname='autenticados_message_templates') THEN
    CREATE POLICY "autenticados_message_templates" ON message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads' AND policyname='autenticados_leads') THEN
    CREATE POLICY "autenticados_leads" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads_interesses' AND policyname='autenticados_leads_interesses') THEN
    CREATE POLICY "autenticados_leads_interesses" ON leads_interesses FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads_etiquetas' AND policyname='autenticados_leads_etiquetas') THEN
    CREATE POLICY "autenticados_leads_etiquetas" ON leads_etiquetas FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='disparos' AND policyname='autenticados_disparos') THEN
    CREATE POLICY "autenticados_disparos" ON disparos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='disparo_leads' AND policyname='autenticados_disparo_leads') THEN
    CREATE POLICY "autenticados_disparo_leads" ON disparo_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Pronto! Execute este script no Supabase SQL Editor.

-- ============================================================
-- MIGRATION v3 — N8n Workflows (executar após as migrations acima)
-- ============================================================

-- 14. Criar horario_comercial se não existir, depois adicionar colunas
-- (sem REFERENCES para ser compatível com qualquer estrutura de clinics)
CREATE TABLE IF NOT EXISTS horario_comercial (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid,
  instancia text,
  hora_inicio text DEFAULT '08:00',
  hora_fim text DEFAULT '18:00',
  dias_semana jsonb DEFAULT '[1,2,3,4,5]'::jsonb,
  mensagem_fora text,
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE horario_comercial
  ADD COLUMN IF NOT EXISTS clinic_id uuid,
  ADD COLUMN IF NOT EXISTS instancia text,
  ADD COLUMN IF NOT EXISTS uazapi_token text,
  ADD COLUMN IF NOT EXISTS uazapi_base_url text DEFAULT 'https://customix.uazapi.com',
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS grupo_whatsapp text,
  ADD COLUMN IF NOT EXISTS grupo_relatorio text,
  ADD COLUMN IF NOT EXISTS relatorio_periodicidade text DEFAULT 'diario',
  ADD COLUMN IF NOT EXISTS relatorio_hora text DEFAULT '20:00';

-- 14b. Criar ia_prompts se não existir
CREATE TABLE IF NOT EXISTS ia_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid,
  system_prompt text,
  modelo text DEFAULT 'gpt-4o',
  temperatura numeric DEFAULT 0.7,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE ia_prompts ADD COLUMN IF NOT EXISTS clinic_id uuid;

-- 14c. Garantir clinic_id em leads (pode estar ausente em ambientes antigos)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN clinic_id uuid;
  END IF;
END $$;

-- Colunas para disparo com múltiplas partes e arquivos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disparos') THEN
    ALTER TABLE disparos ADD COLUMN IF NOT EXISTS partes jsonb;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'disparo_leads') THEN
    ALTER TABLE disparo_leads ADD COLUMN IF NOT EXISTS partes jsonb;
  END IF;
END $$;

-- 15. Coluna status_bot em leads (controla se bot está ativo para o lead)
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status_bot boolean DEFAULT true;

-- 16. Tabela fila de mensagens fora do horário
CREATE TABLE IF NOT EXISTS fila_mensagens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid,
  phone text NOT NULL,
  push_name text,
  texto text,
  instancia text,
  status text DEFAULT 'pendente',
  criado_em timestamptz DEFAULT now(),
  enviado_em timestamptz
);

-- 17. Tabela interacoes (histórico de conversas IA)
CREATE TABLE IF NOT EXISTS interacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid,
  phone text NOT NULL,
  tipo text NOT NULL,
  conteudo text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interacoes_clinic_phone ON interacoes(clinic_id, phone);
CREATE INDEX IF NOT EXISTS idx_interacoes_criado ON interacoes(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_fila_status ON fila_mensagens(status, clinic_id);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'clinic_id'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_status_bot') THEN
      CREATE INDEX idx_leads_status_bot ON leads(status_bot, clinic_id);
    END IF;
  END IF;
END $$;

-- 18. RLS nas novas tabelas
ALTER TABLE horario_comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fila_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- horario_comercial
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='horario_comercial' AND policyname='autenticados_horario') THEN
    CREATE POLICY "autenticados_horario" ON horario_comercial FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='horario_comercial' AND policyname='service_role_horario') THEN
    CREATE POLICY "service_role_horario" ON horario_comercial FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- ia_prompts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ia_prompts' AND policyname='autenticados_ia_prompts') THEN
    CREATE POLICY "autenticados_ia_prompts" ON ia_prompts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ia_prompts' AND policyname='service_role_ia_prompts') THEN
    CREATE POLICY "service_role_ia_prompts" ON ia_prompts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- fila_mensagens
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fila_mensagens' AND policyname='autenticados_fila_mensagens') THEN
    CREATE POLICY "autenticados_fila_mensagens" ON fila_mensagens FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fila_mensagens' AND policyname='service_role_fila') THEN
    CREATE POLICY "service_role_fila" ON fila_mensagens FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- interacoes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='interacoes' AND policyname='autenticados_interacoes') THEN
    CREATE POLICY "autenticados_interacoes" ON interacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='interacoes' AND policyname='service_role_interacoes') THEN
    CREATE POLICY "service_role_interacoes" ON interacoes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Pronto! Migration v3 concluída.
