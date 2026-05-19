import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useInfoGeral(clinicId) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('general_information').select('*').eq('clinic_id', clinicId).single()
    setInfo(data || { clinic_id: clinicId })
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const { error } = await supabase.from('general_information').upsert({ ...form, clinic_id: clinicId }, { onConflict: 'clinic_id' })
    if (!error) setInfo(form)
    return { error }
  }
  return { info, loading, save, refetch: fetch }
}

export function useRotinas(clinicId) {
  const [rotinas, setRotinas] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('operational_routines').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false })
    setRotinas(data || [])
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) { const { error } = await supabase.from('operational_routines').update(payload).eq('id', form.id); if (!error) await fetch(); return { error } }
    const { error } = await supabase.from('operational_routines').insert(payload); if (!error) await fetch(); return { error }
  }
  const toggleStatus = async (id, cur) => {
    const next = cur === 'concluida' ? 'pendente' : 'concluida'
    const { error } = await supabase.from('operational_routines').update({ status: next }).eq('id', id)
    if (!error) setRotinas(r => r.map(x => x.id === id ? { ...x, status: next } : x))
    return { error }
  }
  const remove = async (id) => { const { error } = await supabase.from('operational_routines').delete().eq('id', id); if (!error) setRotinas(r => r.filter(x => x.id !== id)); return { error } }
  return { rotinas, loading, save, toggleStatus, remove, refetch: fetch }
}

export function useMateriais(clinicId) {
  const [materiais, setMateriais] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('materials').select('*, material_files(*)').eq('clinic_id', clinicId).order('created_at', { ascending: false })
    setMateriais(data || [])
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const { material_files, ...mat } = form
    const payload = { ...mat, clinic_id: clinicId }
    if (form.id) { const { error } = await supabase.from('materials').update(payload).eq('id', form.id); if (!error) await fetch(); return { error } }
    const { error } = await supabase.from('materials').insert(payload); if (!error) await fetch(); return { error }
  }
  const remove = async (id) => { const { error } = await supabase.from('materials').delete().eq('id', id); if (!error) setMateriais(m => m.filter(x => x.id !== id)); return { error } }
  return { materiais, loading, save, remove, refetch: fetch }
}

export function useScriptsGuia(clinicId) {
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('scripts').select('*, script_responses(*), script_links(*)').eq('clinic_id', clinicId).order('created_at', { ascending: false })
    setScripts((data || []).map(s => ({ ...s, respostas: (s.script_responses || []).sort((a, b) => a.ordem - b.ordem), links: (s.script_links || []).sort((a, b) => a.ordem - b.ordem) })))
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const { respostas, links, script_responses, script_links, ...scriptData } = form
    const payload = { ...scriptData, clinic_id: clinicId }
    let scriptId = form.id
    if (form.id) { const { error } = await supabase.from('scripts').update(payload).eq('id', form.id); if (error) return { error } }
    else { const { data, error } = await supabase.from('scripts').insert(payload).select().single(); if (error) return { error }; scriptId = data.id }
    await supabase.from('script_responses').delete().eq('script_id', scriptId)
    if (respostas?.length) await supabase.from('script_responses').insert(respostas.map((r, i) => ({ script_id: scriptId, response_text: r.response_text || r, ordem: i })))
    await supabase.from('script_links').delete().eq('script_id', scriptId)
    if (links?.length) await supabase.from('script_links').insert(links.map((l, i) => ({ script_id: scriptId, link_title: l.link_title, link_url: l.link_url, notes: l.notes, ordem: i })))
    await fetch(); return { error: null }
  }
  const remove = async (id) => { const { error } = await supabase.from('scripts').delete().eq('id', id); if (!error) setScripts(s => s.filter(x => x.id !== id)); return { error } }
  return { scripts, loading, save, remove, refetch: fetch }
}

export function useRegras(clinicId) {
  const [regras, setRegras] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('rules').select('*').eq('clinic_id', clinicId).order('created_at')
    setRegras(data || [])
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) { const { error } = await supabase.from('rules').update(payload).eq('id', form.id); if (!error) await fetch(); return { error } }
    const { error } = await supabase.from('rules').insert(payload); if (!error) await fetch(); return { error }
  }
  const remove = async (id) => { const { error } = await supabase.from('rules').delete().eq('id', id); if (!error) setRegras(r => r.filter(x => x.id !== id)); return { error } }
  return { regras, loading, save, remove, refetch: fetch }
}

export function useProcedimentos(clinicId) {
  const [procedimentos, setProcedimentos] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('procedures').select('*').eq('clinic_id', clinicId).order('name')
    setProcedimentos(data || [])
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) { const { error } = await supabase.from('procedures').update(payload).eq('id', form.id); if (!error) await fetch(); return { error } }
    const { error } = await supabase.from('procedures').insert(payload); if (!error) await fetch(); return { error }
  }
  const remove = async (id) => { const { error } = await supabase.from('procedures').delete().eq('id', id); if (!error) setProcedimentos(p => p.filter(x => x.id !== id)); return { error } }
  return { procedimentos, loading, save, remove, refetch: fetch }
}

export function useProfissionais(clinicId) {
  const [profissionais, setProfissionais] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('professionals').select('*').eq('clinic_id', clinicId).order('name')
    setProfissionais(data || [])
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) { const { error } = await supabase.from('professionals').update(payload).eq('id', form.id); if (!error) await fetch(); return { error } }
    const { error } = await supabase.from('professionals').insert(payload); if (!error) await fetch(); return { error }
  }
  const remove = async (id) => { const { error } = await supabase.from('professionals').delete().eq('id', id); if (!error) setProfissionais(p => p.filter(x => x.id !== id)); return { error } }
  return { profissionais, loading, save, remove, refetch: fetch }
}

export function useEventos(clinicId) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('events_campaigns').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false })
    setEventos(data || [])
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) { const { error } = await supabase.from('events_campaigns').update(payload).eq('id', form.id); if (!error) await fetch(); return { error } }
    const { error } = await supabase.from('events_campaigns').insert(payload); if (!error) await fetch(); return { error }
  }
  const remove = async (id) => { const { error } = await supabase.from('events_campaigns').delete().eq('id', id); if (!error) setEventos(e => e.filter(x => x.id !== id)); return { error } }
  return { eventos, loading, save, remove, refetch: fetch }
}

export function useFAQ(clinicId) {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('faq').select('*').eq('clinic_id', clinicId).order('created_at')
    setFaqs(data || [])
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) { const { error } = await supabase.from('faq').update(payload).eq('id', form.id); if (!error) await fetch(); return { error } }
    const { error } = await supabase.from('faq').insert(payload); if (!error) await fetch(); return { error }
  }
  const remove = async (id) => { const { error } = await supabase.from('faq').delete().eq('id', id); if (!error) setFaqs(f => f.filter(x => x.id !== id)); return { error } }
  return { faqs, loading, save, remove, refetch: fetch }
}

export function useOrigens(clinicId) {
  const [origens, setOrigens] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    const { data } = await supabase.from('crm_origens').select('*').eq('clinic_id', clinicId).order('nome')
    setOrigens(data || [])
    setLoading(false)
  }, [clinicId])
  useEffect(() => { fetch() }, [fetch])
  const save = async (form) => {
    const payload = { ...form, clinic_id: clinicId }
    if (form.id) { const { error } = await supabase.from('crm_origens').update(payload).eq('id', form.id); if (!error) await fetch(); return { error } }
    const { error } = await supabase.from('crm_origens').insert(payload); if (!error) await fetch(); return { error }
  }
  const remove = async (id) => { const { error } = await supabase.from('crm_origens').delete().eq('id', id); if (!error) setOrigens(o => o.filter(x => x.id !== id)); return { error } }
  return { origens, loading, save, remove, refetch: fetch }
}

export function useTarefasPendentes(clinicId) {
  const [total, setTotal] = useState(0)
  useEffect(() => {
    if (!clinicId) return
    supabase.from('operational_routines').select('id', { count: 'exact' }).eq('clinic_id', clinicId).neq('status', 'concluida').then(({ count }) => setTotal(count || 0))
  }, [clinicId])
  return total
}
