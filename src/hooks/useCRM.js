import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────
// CLÍNICAS
// ─────────────────────────────────────────
export function useClinics(currentUser) {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    // If not loaded user yet, don't fetch or just fetch all if it's fine. Wait, better to wait for currentUser.
    if (currentUser === undefined) return // if we use undefined as initial state, but App uses null.
    // Actually, if currentUser is null, we might be loading. Let's just run.

    setLoading(true)
    let query = supabase.from('clinics').select('id, name, icon_url, ativo').order('name')

    if (currentUser && currentUser.role !== 'super_admin') {
      const { data: cu } = await supabase.from('clinic_users').select('clinic_id').eq('user_id', currentUser.id)
      const allowedIds = cu?.map(x => x.clinic_id) || []
      if (allowedIds.length > 0) {
        query = query.in('id', allowedIds)
      } else {
        setClinics([])
        setLoading(false)
        return
      }
    }

    const { data, error } = await query
    if (!error) setClinics(data || [])
    setLoading(false)
  }, [currentUser])

  useEffect(() => { fetch() }, [fetch])

  const updateClinic = async (id, form) => {
    const { error } = await supabase.from('clinics').update(form).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const deleteClinic = async (id) => {
    const { error } = await supabase.from('clinics').delete().eq('id', id)
    if (!error) setClinics(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { clinics, loading, refetch: fetch, updateClinic, deleteClinic }
}

// ─────────────────────────────────────────
// CONFIGURAÇÕES DO CRM POR CLÍNICA
// ─────────────────────────────────────────
export function useCRMConfig(clinicId) {
  const [estagios, setEstagios] = useState([])
  const [statusList, setStatusList] = useState([])
  const [etiquetas, setEtiquetas] = useState([])
  const [interesses, setInteresses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const [e, s, t, i] = await Promise.all([
      supabase.from('crm_estagios').select('*').eq('clinic_id', clinicId).order('ordem'),
      supabase.from('crm_status').select('*').eq('clinic_id', clinicId).order('ordem'),
      supabase.from('crm_etiquetas').select('*').eq('clinic_id', clinicId).order('nome'),
      supabase.from('crm_interesses').select('*').eq('clinic_id', clinicId).order('nome'),
    ])
    if (!e.error) setEstagios(e.data || [])
    if (!s.error) setStatusList(s.data || [])
    if (!t.error) setEtiquetas(t.data || [])
    if (!i.error) setInteresses(i.data || [])
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const addEstagio = async (nome, cor) => {
    const ordem = estagios.length + 1
    const { data, error } = await supabase.from('crm_estagios').insert({ clinic_id: clinicId, nome, cor, ordem }).select().single()
    if (!error) setEstagios(prev => [...prev, data])
    return { data, error }
  }

  const addStatus = async (nome, cor) => {
    const ordem = statusList.length + 1
    const { data, error } = await supabase.from('crm_status').insert({ clinic_id: clinicId, nome, cor, ordem }).select().single()
    if (!error) setStatusList(prev => [...prev, data])
    return { data, error }
  }

  const addEtiqueta = async (nome, cor) => {
    const { data, error } = await supabase.from('crm_etiquetas').insert({ clinic_id: clinicId, nome, cor }).select().single()
    if (!error) setEtiquetas(prev => [...prev, data])
    return { data, error }
  }

  const addInteresse = async (nome) => {
    const { data, error } = await supabase.from('crm_interesses').insert({ clinic_id: clinicId, nome }).select().single()
    if (!error) setInteresses(prev => [...prev, data])
    return { data, error }
  }

  const deleteItem = async (table, id, setter) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) setter(prev => prev.filter(x => x.id !== id))
    return { error }
  }

  return {
    estagios, statusList, etiquetas, interesses, loading, refetch: fetch,
    addEstagio, addStatus, addEtiqueta, addInteresse,
    deleteEstagio: (id) => deleteItem('crm_estagios', id, setEstagios),
    deleteStatus: (id) => deleteItem('crm_status', id, setStatusList),
    deleteEtiqueta: (id) => deleteItem('crm_etiquetas', id, setEtiquetas),
    deleteInteresse: (id) => deleteItem('crm_interesses', id, setInteresses),
  }
}

// ─────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────
export function useLeads(clinicId) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        leads_interesses ( interesse_id ),
        leads_etiquetas ( etiqueta_id )
      `)
      .eq('clinic_id', clinicId)
      .order('data_cadastro', { ascending: false })

    if (!error) {
      // Normaliza arrays de interesses e etiquetas
      const normalized = (data || []).map(l => ({
        ...l,
        interesses: (l.leads_interesses || []).map(x => x.interesse_id),
        etiquetas: (l.leads_etiquetas || []).map(x => x.etiqueta_id),
      }))
      setLeads(normalized)
    }
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  // Criar lead
  const createLead = async (form) => {
    const { interesses, etiquetas, ...leadData } = form
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...leadData, clinic_id: clinicId })
      .select()
      .single()

    if (error) return { error }

    // Inserir interesses
    if (interesses?.length) {
      await supabase.from('leads_interesses').insert(
        interesses.map(id => ({ lead_id: data.id, interesse_id: id }))
      )
    }
    // Inserir etiquetas
    if (etiquetas?.length) {
      await supabase.from('leads_etiquetas').insert(
        etiquetas.map(id => ({ lead_id: data.id, etiqueta_id: id }))
      )
    }

    await fetch()
    return { data, error: null }
  }

  // Atualizar lead
  const updateLead = async (id, form) => {
    const { interesses, etiquetas, leads_interesses, leads_etiquetas, ...leadData } = form
    const { error } = await supabase.from('leads').update(leadData).eq('id', id)
    if (error) return { error }

    // Reescreve interesses
    await supabase.from('leads_interesses').delete().eq('lead_id', id)
    if (interesses?.length) {
      await supabase.from('leads_interesses').insert(
        interesses.map(iid => ({ lead_id: id, interesse_id: iid }))
      )
    }
    // Reescreve etiquetas
    await supabase.from('leads_etiquetas').delete().eq('lead_id', id)
    if (etiquetas?.length) {
      await supabase.from('leads_etiquetas').insert(
        etiquetas.map(eid => ({ lead_id: id, etiqueta_id: eid }))
      )
    }

    await fetch()
    return { error: null }
  }

  // Deletar lead
  const deleteLead = async (id) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (!error) setLeads(prev => prev.filter(l => l.id !== id))
    return { error }
  }

  return { leads, loading, refetch: fetch, createLead, updateLead, deleteLead }
}

// ─────────────────────────────────────────
// TEMPLATES DE MENSAGEM
// ─────────────────────────────────────────
export function useTemplates(clinicId) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('nome')
    if (!error) setTemplates(data || [])
    setLoading(false)
  }, [clinicId])

  useEffect(() => { fetch() }, [fetch])

  const createTemplate = async (nome, conteudo) => {
    const { data, error } = await supabase
      .from('message_templates')
      .insert({ clinic_id: clinicId, nome, conteudo })
      .select()
      .single()
    if (!error) setTemplates(prev => [...prev, data])
    return { data, error }
  }

  const deleteTemplate = async (id) => {
    const { error } = await supabase.from('message_templates').delete().eq('id', id)
    if (!error) setTemplates(prev => prev.filter(t => t.id !== id))
    return { error }
  }

  return { templates, loading, refetch: fetch, createTemplate, deleteTemplate }
}

// ─────────────────────────────────────────
// DISPAROS
// ─────────────────────────────────────────
export function useDisparos(clinicId) {
  const [disparos, setDisparos] = useState([])
  const [loading, setLoading] = useState(true)
  const [executando, setExecutando] = useState(false)
  const cancelRef = useRef(false)

  const carregarDisparos = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('disparos')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
    if (!error) setDisparos(data || [])
    setLoading(false)
  }, [clinicId])

  useEffect(() => { carregarDisparos() }, [carregarDisparos])

  const createDisparo = async (disparo, leadsIds, mensagemPorLead) => {
    const { data, error } = await supabase
      .from('disparos')
      .insert({ ...disparo, clinic_id: clinicId, total_leads: leadsIds.length })
      .select()
      .single()
    if (error) return { error }

    if (leadsIds.length) {
      await supabase.from('disparo_leads').insert(
        leadsIds.map(lid => ({
          disparo_id: data.id,
          lead_id: lid,
          whatsapp: mensagemPorLead[lid]?.whatsapp,
          mensagem: mensagemPorLead[lid]?.mensagem,
          partes: mensagemPorLead[lid]?.partes || null,
          status: 'pendente',
        }))
      )
    }

    await carregarDisparos()
    return { data, error: null }
  }

  // Busca os leads pendentes de um disparo e a config Uazapi da clínica,
  // depois envia cada mensagem respeitando o intervalo configurado.
  const executarDisparo = async (disparoId, onProgress) => {
    // 1. Buscar itens pendentes
    const { data: itens, error: itensErr } = await supabase
      .from('disparo_leads')
      .select('*')
      .eq('disparo_id', disparoId)
      .in('status', ['pendente', 'rascunho'])
      .order('id')

    if (itensErr) return { error: 'Erro ao buscar leads do disparo: ' + itensErr.message }
    if (!itens?.length) return { error: 'Nenhum lead pendente encontrado neste disparo.' }

    // 2. Buscar config da clínica
    const { data: horario, error: horErr } = await supabase
      .from('horario_comercial')
      .select('instancia, uazapi_token, uazapi_base_url, n8n_webhook_url')
      .eq('clinic_id', clinicId)
      .eq('ativo', true)
      .limit(1)
      .single()

    if (horErr || (!horario?.uazapi_token && !horario?.n8n_webhook_url)) {
      return { error: 'Configure o Token da Uazapi ou o Webhook N8n em Automações → Horário Comercial antes de disparar.' }
    }

    // 3. Buscar config de intervalo do disparo
    const { data: disparoData } = await supabase
      .from('disparos')
      .select('intervalo_tipo, intervalo_segundos')
      .eq('id', disparoId)
      .single()

    // 4. Marcar disparo como 'enviando'
    await supabase.from('disparos').update({ status: 'enviando' }).eq('id', disparoId)

    setExecutando(true)
    cancelRef.current = false

    const usarN8n = !!horario?.n8n_webhook_url

    let enviados = 0
    let erros = 0

    for (let i = 0; i < itens.length; i++) {
      if (cancelRef.current) break

      const item = itens[i]
      onProgress?.({ total: itens.length, enviados, erros, idx: i, atual: item })

      try {
        let res
        // Partes: se o item tiver partes (multi-msg/arquivo), enviar cada uma
        const partesItem = item.partes || (item.mensagem ? [{ tipo: 'texto', conteudo: item.mensagem, delay_ms: 0 }] : [])
        let erroDeEnvio = null

        for (let pi = 0; pi < partesItem.length; pi++) {
          const parte = partesItem[pi]
          if (pi > 0 && parte.delay_ms > 0) await new Promise(r => setTimeout(r, parte.delay_ms))

          if (usarN8n) {
            res = await fetch(horario.n8n_webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                number: item.whatsapp, tipo: parte.tipo, text: parte.conteudo, url: parte.conteudo,
                uazapi_url: horario.uazapi_base_url || 'https://customix.uazapi.com',
                uazapi_token: horario.uazapi_token,
              }),
            })
          } else {
            const baseUrl = horario.uazapi_base_url || 'https://customix.uazapi.com'
            const tok = horario.uazapi_token
            if (parte.tipo === 'texto') {
              res = await fetch(`${baseUrl}/send/text`, {
                method: 'POST',
                headers: { 'token': tok, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: item.whatsapp, text: parte.conteudo }),
              })
            } else if (parte.tipo === 'imagem') {
              res = await fetch(`${baseUrl}/send/image`, {
                method: 'POST',
                headers: { 'token': tok, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: item.whatsapp, url: parte.conteudo }),
              })
            } else if (parte.tipo === 'documento') {
              res = await fetch(`${baseUrl}/send/document`, {
                method: 'POST',
                headers: { 'token': tok, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: item.whatsapp, url: parte.conteudo, fileName: parte.conteudo.split('/').pop() || 'arquivo' }),
              })
            } else if (parte.tipo === 'audio') {
              res = await fetch(`${baseUrl}/send/audio`, {
                method: 'POST',
                headers: { 'token': tok, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: item.whatsapp, url: parte.conteudo }),
              })
            }
          }
          if (res && !res.ok) {
            erroDeEnvio = await res.text().catch(() => String(res.status))
            break
          }
        }

        if (!erroDeEnvio) {
          enviados++
          await supabase.from('disparo_leads').update({
            status: 'enviado', enviado_em: new Date().toISOString(),
          }).eq('id', item.id)
        } else {
          erros++
          await supabase.from('disparo_leads').update({
            status: 'erro', erro_msg: String(erroDeEnvio).slice(0, 300),
          }).eq('id', item.id)
        }
      } catch (e) {
        erros++
        await supabase.from('disparo_leads').update({
          status: 'erro',
          erro_msg: e?.message || 'Erro de rede',
        }).eq('id', item.id)
      }

      onProgress?.({ total: itens.length, enviados, erros, idx: i + 1, atual: null })

      // Aguardar intervalo (exceto após o último)
      if (i < itens.length - 1 && !cancelRef.current) {
        const delayMs = disparoData?.intervalo_tipo === 'aleatorio'
          ? Math.round((60 + Math.random() * 180) * 1000)   // 1 a 4 min
          : (disparoData?.intervalo_segundos || 60) * 1000
        await new Promise(r => setTimeout(r, delayMs))
      }
    }

    // 5. Status final
    const finalStatus = cancelRef.current
      ? 'cancelado'
      : erros > 0 && enviados === 0
        ? 'erro'
        : 'completo'

    await supabase.from('disparos').update({
      status: finalStatus,
      total_enviados: enviados,
      total_erros: erros,
    }).eq('id', disparoId)

    setExecutando(false)
    await carregarDisparos()
    return { enviados, erros, cancelado: cancelRef.current }
  }

  const cancelarExecucao = () => { cancelRef.current = true }

  return { disparos, loading, executando, refetch: carregarDisparos, createDisparo, executarDisparo, cancelarExecucao }
}

// ─────────────────────────────────────────
// MÉTRICAS (usa as views do banco)
// ─────────────────────────────────────────
export function useMetrics(clinicId) {
  const [metrics, setMetrics] = useState(null)
  const [acionar, setAcionar] = useState([])
  const [semResposta, setSemResposta] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clinicId) return
    const load = async () => {
      setLoading(true)
      const [m, a, s] = await Promise.all([
        supabase.from('vw_crm_metricas').select('*').eq('clinic_id', clinicId).single(),
        supabase.from('vw_leads_acionar_hoje').select('*').eq('clinica', clinicId),
        supabase.from('vw_leads_sem_resposta').select('*').eq('clinica', clinicId),
      ])
      if (!m.error) setMetrics(m.data)
      if (!a.error) setAcionar(a.data || [])
      if (!s.error) setSemResposta(s.data || [])
      setLoading(false)
    }
    load()
  }, [clinicId])

  return { metrics, acionar, semResposta, loading }
}
