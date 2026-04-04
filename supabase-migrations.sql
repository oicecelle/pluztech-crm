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
