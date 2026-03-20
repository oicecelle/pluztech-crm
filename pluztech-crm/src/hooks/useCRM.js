import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────
// CLÍNICAS
// ─────────────────────────────────────────
export function useClinics() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clinics')
      .select('id, name, icon_url')
      .eq('ativo', true)
      .order('name')
    if (!error) setClinics(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { clinics, loading, refetch: fetch }
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

  const fetch = useCallback(async () => {
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

  useEffect(() => { fetch() }, [fetch])

  const createDisparo = async (disparo, leadsIds, mensagemPorLead) => {
    // Cria o disparo
    const { data, error } = await supabase
      .from('disparos')
      .insert({ ...disparo, clinic_id: clinicId, total_leads: leadsIds.length })
      .select()
      .single()
    if (error) return { error }

    // Cria os registros de cada lead
    if (leadsIds.length) {
      await supabase.from('disparo_leads').insert(
        leadsIds.map(lid => ({
          disparo_id: data.id,
          lead_id: lid,
          whatsapp: mensagemPorLead[lid]?.whatsapp,
          mensagem: mensagemPorLead[lid]?.mensagem,
          status: 'pendente',
        }))
      )
    }

    await fetch()
    return { data, error: null }
  }

  return { disparos, loading, refetch: fetch, createDisparo }
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
