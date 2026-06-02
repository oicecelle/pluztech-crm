import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRelatorios(clinicId, startDate, endDate) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    leadsNovos: [],
    leadsReengajados: [],
    agendamentos: [],
    comparecimentos: 0,
    cancelamentos: 0,
    emNegociacao: 0,
    perdidos: [],
    interesses: {},
    origens: {},
    objecoes: {},
    semResposta: 0,
    rawObjections: []
  })

  useEffect(() => {
    if (!clinicId || !startDate || !endDate) return

    async function fetchData() {
      setLoading(true)
      try {
        const startISO = new Date(startDate + 'T00:00:00').toISOString()
        const endISO = new Date(endDate + 'T23:59:59').toISOString()

        // 1. Fetch all leads of the clinic
        const { data: leads, error: leadsErr } = await supabase
          .from('leads')
          .select('id, nome, sobrenome, whatsapp, data_cadastro, fechou, data_fechamento, aguardando_retorno, tipo_lead, status_id, estagio_id, origem, respondeu, data_ultima_interacao, observacoes, crm_status(nome), crm_estagios(nome)')
          .eq('clinic_id', clinicId)

        if (leadsErr) throw leadsErr

        // 2. Fetch agendamentos
        const { data: agendamentos, error: agErr } = await supabase
          .from('agendamentos')
          .select('id, status, criado_em')
          .eq('clinic_id', clinicId)
          .gte('criado_em', startISO)
          .lte('criado_em', endISO)

        if (agErr) throw agErr

        // 3. Fetch objections
        const { data: objections, error: objErr } = await supabase
          .from('lead_objecoes')
          .select('id, lead_id, objecao, categoria, criado_em, leads(nome, sobrenome, whatsapp)')
          .eq('clinic_id', clinicId)
          .gte('criado_em', startISO)
          .lte('criado_em', endISO)

        if (objErr) throw objErr

        // 4. Fetch interests for leads created in the period
        const leadsPeriodo = leads.filter(l => l.data_cadastro && l.data_cadastro >= startISO && l.data_cadastro <= endISO)
        const leadIdsPeriodo = leadsPeriodo.map(l => l.id)

        let interestsMap = {}
        if (leadIdsPeriodo.length > 0) {
          const { data: liData, error: liErr } = await supabase
            .from('leads_interesses')
            .select('interesse_id, crm_interesses(nome)')
            .in('lead_id', leadIdsPeriodo)

          if (!liErr && liData) {
            liData.forEach(item => {
              const name = item.crm_interesses?.nome || 'Outros'
              interestsMap[name] = (interestsMap[name] || 0) + 1
            })
          }
        }

        // Process metrics
        const leadsNovos = leadsPeriodo.filter(l => l.tipo_lead !== 'retorno')
        
        const leadsReengajados = leads.filter(l => {
          if (!l.data_cadastro || !l.data_ultima_interacao) return false
          const cadastradoAntes = l.data_cadastro < startISO
          const interagiuPeriodo = l.data_ultima_interacao >= startISO && l.data_ultima_interacao <= endISO
          return cadastradoAntes && interagiuPeriodo
        })

        const comparecimentos = agendamentos.filter(a => a.status === 'compareceu').length
        const cancelamentos = agendamentos.filter(a => a.status === 'cancelado').length

        // Em negociação ou em andamento
        const emNegociacao = leads.filter(l => {
          const statusNome = l.crm_status?.nome?.toLowerCase() || ''
          const estagioNome = l.crm_estagios?.nome?.toLowerCase() || ''
          return statusNome.includes('negocia') || statusNome.includes('andamento') ||
                 estagioNome.includes('negocia') || estagioNome.includes('andamento')
        }).length

        // Perdidos
        const perdidos = leads.filter(l => {
          const statusNome = l.crm_status?.nome?.toLowerCase() || ''
          const estagioNome = l.crm_estagios?.nome?.toLowerCase() || ''
          return statusNome.includes('perdido') || statusNome.includes('desist') || statusNome.includes('sem interesse') ||
                 estagioNome.includes('perdido') || estagioNome.includes('desist') || estagioNome.includes('sem interesse')
        })

        // Origens
        const origensMap = {}
        leadsNovos.forEach(l => {
          const ori = l.origem || 'Não identificada'
          origensMap[ori] = (origensMap[ori] || 0) + 1
        })

        // Objeções count
        const objecoesMap = {}
        objections.forEach(o => {
          const cat = o.categoria || o.objecao || 'Outros'
          objecoesMap[cat] = (objecoesMap[cat] || 0) + 1
        })

        // Sem resposta
        const semResposta = leadsNovos.filter(l => l.respondeu === false).length

        setData({
          leadsNovos,
          leadsReengajados,
          agendamentos,
          comparecimentos,
          cancelamentos,
          emNegociacao,
          perdidos,
          interesses: interestsMap,
          origens: origensMap,
          objecoes: objecoesMap,
          semResposta,
          rawObjections: objections
        })
      } catch (e) {
        console.error('[useRelatorios] Error fetching report data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clinicId, startDate, endDate])

  return { data, loading }
}
