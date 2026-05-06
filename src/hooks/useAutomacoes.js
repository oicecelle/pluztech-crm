import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── HORÁRIO COMERCIAL ───────────────────────────────────────
export function useHorarios(clinicId) {
  const [horarios, setHorarios] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('horario_comercial')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at')
    if (!error) setHorarios(data || [])
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) {
      const { error } = await supabase.from('horario_comercial').update(payload).eq('id', form.id)
      if (!error) await fetch()
      return { error }
    }
    const { data, error } = await supabase.from('horario_comercial').insert(payload).select().single()
    if (!error) await fetch()
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('horario_comercial').delete().eq('id', id)
    if (!error) setHorarios(h => h.filter(x => x.id !== id))
    return { error }
  }

  return { horarios, loading, refetch: fetch, save, remove }
}

// ─── SCRIPTS AUTOMÁTICOS ─────────────────────────────────────
export function useScripts(clinicId) {
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('auto_scripts')
      .select(`*, auto_script_partes(*)`)
      .eq('clinic_id', clinicId)
      .order('ordem')
    if (!error) {
      setScripts((data || []).map(s => ({
        ...s,
        partes: (s.auto_script_partes || []).sort((a, b) => a.ordem - b.ordem)
      })))
    }
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const save = async (form) => {
    const { partes, auto_script_partes, ...scriptData } = form
    const payload = { ...scriptData, clinic_id: clinicId }

    let scriptId = form.id
    if (form.id) {
      const { error } = await supabase.from('auto_scripts').update(payload).eq('id', form.id)
      if (error) return { error }
    } else {
      const { data, error } = await supabase.from('auto_scripts').insert(payload).select().single()
      if (error) return { error }
      scriptId = data.id
    }

    // Reescreve partes
    await supabase.from('auto_script_partes').delete().eq('script_id', scriptId)
    if (partes?.length) {
      await supabase.from('auto_script_partes').insert(
        partes.map((p, i) => ({ script_id: scriptId, ordem: i + 1, tipo: p.tipo, conteudo: p.conteudo, delay_ms: p.delay_ms || 1500 }))
      )
    }
    await fetch()
    return { error: null }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('auto_scripts').delete().eq('id', id)
    if (!error) setScripts(s => s.filter(x => x.id !== id))
    return { error }
  }

  return { scripts, loading, refetch: fetch, save, remove }
}

// ─── PROMPT DE IA ────────────────────────────────────────────
export function useIAPrompt(clinicId) {
  const [prompt, setPrompt] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase
      .from('ia_prompts')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()
    setPrompt(data || { clinic_id: clinicId, system_prompt: '', max_tentativas: 2, modelo: 'gpt-4o-mini', temperatura: 0.3, ativo: true })
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) {
      const { error } = await supabase.from('ia_prompts').update(payload).eq('id', form.id)
      if (!error) setPrompt(form)
      return { error }
    }
    const { data, error } = await supabase.from('ia_prompts').upsert(payload, { onConflict: 'clinic_id' }).select().single()
    if (!error) setPrompt(data)
    return { data, error }
  }

  return { prompt, loading, refetch: fetch, save }
}

// ─── FOLLOW-UP CONFIG ────────────────────────────────────────
export function useFollowupConfig(clinicId) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase
      .from('followup_config')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()
    setConfig(data || { clinic_id: clinicId, fu1_ativo: false, fu1_hora: '14:00', fu1_mensagem: '', fu2_ativo: false, fu2_hora: '16:00', fu2_pergunta_gatilho: '', fu2_mensagem: '' })
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    const { data, error } = await supabase
      .from('followup_config')
      .upsert(payload, { onConflict: 'clinic_id' })
      .select()
      .single()
    if (!error) setConfig(data)
    return { data, error }
  }

  return { config, loading, refetch: fetch, save }
}

// ─── FOLLOW-UP FILA ──────────────────────────────────────────
export function useFollowupFila(clinicId) {
  const [fila, setFila] = useState([])
  const [loading, setLoading] = useState(true)

  const hoje = new Date().toISOString().split('T')[0]

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('followup_fila')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('data_referencia', hoje)
      .in('status', ['pendente', 'enviado'])
      .order('criado_em', { ascending: false })
    if (!error) setFila(data || [])
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('followup_fila').update({ status }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const updateMensagem = async (id, mensagem_followup) => {
    const { error } = await supabase.from('followup_fila').update({ mensagem_followup }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => updateStatus(id, 'removido')

  return { fila, loading, refetch: fetch, updateStatus, updateMensagem, remove }
}

// ─── AGENDAMENTOS CONFIG ─────────────────────────────────────
export function useAgendamentosConfig(clinicId) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase
      .from('agendamentos_config')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()
    setConfig(data || {
      clinic_id: clinicId,
      ativo: false,
      hora_envio: '09:00',
      mensagem_confirmacao: 'Olá {nome}! 😊 Passando para lembrar que você tem um agendamento amanhã às {hora}. Confirma sua presença?',
      palavras_gatilho: 'agendado,remarcado,confirmei,horário confirmado,consulta marcada,marcamos para,ficou para,ficou marcado'
    })
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    const { data, error } = await supabase
      .from('agendamentos_config')
      .upsert(payload, { onConflict: 'clinic_id' })
      .select()
      .single()
    if (!error) setConfig(data)
    return { data, error }
  }

  return { config, loading, refetch: fetch, save }
}

// ─── AGENDAMENTOS ─────────────────────────────────────────────
export function useAgendamentos(clinicId) {
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('data_agendamento', { ascending: true })
      .order('criado_em', { ascending: false })
      .limit(200)
    if (!error) setAgendamentos(data || [])
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) {
      const { error } = await supabase.from('agendamentos').update(payload).eq('id', form.id)
      if (!error) await fetch()
      return { error }
    }
    const { data, error } = await supabase.from('agendamentos').insert(payload).select().single()
    if (!error) await fetch()
    return { data, error }
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('agendamentos').update({ status }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (!error) setAgendamentos(a => a.filter(x => x.id !== id))
    return { error }
  }

  return { agendamentos, loading, refetch: fetch, save, updateStatus, remove }
}

// ─── LOGS DE AUTOMAÇÃO ───────────────────────────────────────
export function useAutomacaoLogs(clinicId) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('automacao_logs')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('criado_em', { ascending: false })
      .limit(100)
    if (!error) setLogs(data || [])
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])
  return { logs, loading, refetch: fetch }
}
