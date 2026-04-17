// Vercel Serverless Function — Fluxo de entrada WhatsApp → CRM
// URL: https://pluztech.vercel.app/api/whatsapp-inbound
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Validação de secret para evitar chamadas não autorizadas
  const secret = req.query.secret || req.headers['x-webhook-secret']
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = req.body || {}

  // ── Extrair campos do payload (suporta múltiplos formatos Uazapi) ──
  const data  = body.data  || body
  const key   = data.key   || {}

  // Ignorar mensagens enviadas pela própria instância
  const fromMe = key.fromMe ?? data.fromMe ?? body.fromMe ?? false
  if (fromMe === true) {
    return res.status(200).json({ skipped: 'outgoing' })
  }

  // Extrair número (remove sufixo @s.whatsapp.net / @c.us)
  const remoteJid = key.remoteJid || data.remoteJid || body.remoteJid || body.chatid || ''
  const phone = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '').trim()

  // Ignorar grupos e números inválidos
  if (!phone || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) {
    return res.status(200).json({ skipped: 'group or invalid' })
  }

  // Nome do contato
  const pushName = data.pushName || body.pushName || ''
  const nomeCompleto = pushName.trim() || phone
  const nome     = nomeCompleto.split(' ')[0] || phone
  const sobrenome = nomeCompleto.split(' ').slice(1).join(' ') || null

  // Texto da mensagem recebida
  const texto = (
    data.message?.conversation ||
    data.message?.extendedTextMessage?.text ||
    data.text ||
    body.text ||
    ''
  ).slice(0, 500)

  // Instância (para identificar a clínica)
  const instancia = body.instance || body.instancia || data.instance || req.query.instancia || ''

  // ── Supabase com service role (bypass RLS) ──
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Buscar clinic_id pela instância
  const { data: horario } = await supabase
    .from('horario_comercial')
    .select('clinic_id')
    .eq('instancia', instancia)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (!horario?.clinic_id) {
    console.warn('[inbound] Instância não encontrada:', instancia)
    return res.status(200).json({ skipped: 'clinic not found', instancia })
  }

  const clinicId = horario.clinic_id
  const now = new Date().toISOString()

  // Verificar se lead já existe pelo número + clínica
  const { data: existing } = await supabase
    .from('leads')
    .select('id, nome')
    .eq('clinic_id', clinicId)
    .eq('whatsapp', phone)
    .maybeSingle()

  if (existing) {
    // Atualizar data de última interação
    await supabase.from('leads').update({
      data_ultima_interacao:    now,
      ultima_interacao_contexto: texto || null,
    }).eq('id', existing.id)

    return res.status(200).json({ action: 'updated', lead_id: existing.id })
  }

  // Criar novo lead
  const { data: novo, error } = await supabase.from('leads').insert({
    clinic_id:                  clinicId,
    nome,
    sobrenome,
    whatsapp:                   phone,
    origem:                     'whatsapp_inbound',
    observacoes:                texto ? `Primeira mensagem: ${texto}` : null,
    data_ultima_interacao:      now,
    ultima_interacao_contexto:  texto || null,
    data_cadastro:              now,
  }).select('id').single()

  if (error) {
    console.error('[inbound] Erro ao criar lead:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ action: 'created', lead_id: novo.id, nome, phone })
}
