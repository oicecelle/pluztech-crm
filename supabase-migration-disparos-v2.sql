-- ============================================================
-- MIGRATION: Disparos v2 — Execução via Uazapi
-- Rodar no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar uazapi_token e uazapi_base_url ao horario_comercial
ALTER TABLE horario_comercial
  ADD COLUMN IF NOT EXISTS uazapi_token text,
  ADD COLUMN IF NOT EXISTS uazapi_base_url text DEFAULT 'https://customix.uazapi.com';

-- 2. Adicionar erro_msg em disparo_leads (para registrar motivo de falha)
ALTER TABLE disparo_leads
  ADD COLUMN IF NOT EXISTS erro_msg text;

-- 3. Adicionar enviados/erros em disparos (para histórico rápido sem join)
ALTER TABLE disparos
  ADD COLUMN IF NOT EXISTS total_enviados integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_erros integer DEFAULT 0;

-- Pronto. Execute este script no Supabase SQL Editor.
