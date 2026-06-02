import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useTarefasPendentes } from '../hooks/useGuia'

const C = {
  preto:'#0F0F0F', branco:'#FFFFFF', marrom:'#8B6F47', marromHover:'#a07d54',
  creme:'#FAF7F2', cinza:'#9ca3af', borda:'#2a2a2a',
  card:'#1a1a1a', cardAlt:'#161616', input:'#222222',
  verde:'#22c55e', vermelho:'#EF4444', fundo:'#0F0F0F',
}

// ─── SEARCH HISTORY / FAVORITES (localStorage) ───────────────
const SEARCH_HISTORY_KEY = 'pluz_search_history'
const SEARCH_FAVS_KEY    = 'pluz_search_favs'

function getHistory() {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(q) {
  if (!q.trim()) return
  const prev = getHistory().filter(x => x !== q)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, 10)))
}
function getFavs() {
  try { return JSON.parse(localStorage.getItem(SEARCH_FAVS_KEY) || '[]') } catch { return [] }
}
function toggleFav(item) {
  const favs = getFavs()
  const key = item.type + ':' + item.id
  const exists = favs.find(f => f.key === key)
  if (exists) localStorage.setItem(SEARCH_FAVS_KEY, JSON.stringify(favs.filter(f => f.key !== key)))
  else localStorage.setItem(SEARCH_FAVS_KEY, JSON.stringify([{ key, ...item }, ...favs]))
  return !exists
}
function isFav(item) {
  return !!getFavs().find(f => f.key === item.type + ':' + item.id)
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────
const GlobalSearch = ({ clinics }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [history, setHistory] = useState(getHistory())
  const [, forceUpdate] = useState(0)
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClickOut = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const [clinicRes, leadsRes, procRes, profRes, scriptRes, faqRes] = await Promise.all([
      supabase.from('clinics').select('id, name').ilike('name', `%${q}%`).limit(5),
      supabase.from('leads').select('id, nome, sobrenome, whatsapp, clinic_id').or(`nome.ilike.%${q}%,sobrenome.ilike.%${q}%,whatsapp.ilike.%${q}%`).limit(5),
      supabase.from('procedures').select('id, name, clinic_id').ilike('name', `%${q}%`).limit(5),
      supabase.from('professionals').select('id, name, clinic_id').ilike('name', `%${q}%`).limit(5),
      supabase.from('scripts').select('id, occasion, clinic_id').ilike('occasion', `%${q}%`).limit(5),
      supabase.from('faq').select('id, question, clinic_id').ilike('question', `%${q}%`).limit(5),
    ])
    const grouped = []
    if ((clinicRes.data||[]).length) grouped.push({ type: 'Clínicas', items: clinicRes.data.map(c => ({ type:'clinica', id:c.id, label:c.name })) })
    if ((leadsRes.data||[]).length) grouped.push({ type: 'Leads', items: leadsRes.data.map(l => ({ type:'lead', id:l.id, label:`${l.nome} ${l.sobrenome||''}`, sub:l.whatsapp })) })
    if ((procRes.data||[]).length) grouped.push({ type: 'Procedimentos', items: procRes.data.map(p => ({ type:'procedimento', id:p.id, label:p.name, sub:'Procedimento' })) })
    if ((profRes.data||[]).length) grouped.push({ type: 'Profissionais', items: profRes.data.map(p => ({ type:'profissional', id:p.id, label:p.name, sub:'Profissional' })) })
    if ((scriptRes.data||[]).length) grouped.push({ type: 'Scripts', items: scriptRes.data.map(s => ({ type:'script', id:s.id, label:s.occasion, sub:'Script' })) })
    if ((faqRes.data||[]).length) grouped.push({ type: 'FAQ', items: faqRes.data.map(f => ({ type:'faq', id:f.id, label:f.question, sub:'Pergunta frequente' })) })
    setResults(grouped)
    setSearching(false)
  }

  useEffect(() => {
    const t = setTimeout(() => { if (query) doSearch(query) }, 350)
    return () => clearTimeout(t)
  }, [query])

  const handleSubmit = (q) => {
    saveHistory(q || query)
    setHistory(getHistory())
  }

  const favs = getFavs()

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, background:C.input, border:`1px solid ${C.borda}`, borderRadius:10, padding:'6px 12px', minWidth:280 }}>
        <span style={{ color:C.cinza, fontSize:14 }}>🔍</span>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(query) }}
          placeholder="Buscar clínicas, leads, procedimentos..."
          style={{ background:'transparent', border:'none', outline:'none', fontSize:13, color:C.creme, fontFamily:'inherit', flex:1 }}
        />
        {query && <button onClick={() => { setQuery(''); setResults([]) }} style={{ background:'none', border:'none', cursor:'pointer', color:C.cinza, fontSize:16, lineHeight:1 }}>×</button>}
      </div>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, right:0, background:'#1a1a1a', border:`1px solid ${C.borda}`, borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,0.6)', zIndex:500, maxHeight:420, overflowY:'auto', minWidth:320 }}>
          {searching && <div style={{ padding:'16px', textAlign:'center', color:C.cinza, fontSize:13 }}>Buscando...</div>}

          {!searching && query && results.length === 0 && (
            <div style={{ padding:'16px', textAlign:'center', color:C.cinza, fontSize:13 }}>Nenhum resultado para "{query}"</div>
          )}

          {!searching && results.map(group => (
            <div key={group.type}>
              <div style={{ padding:'8px 14px 4px', fontSize:10, fontWeight:700, color:C.cinza, letterSpacing:'0.08em' }}>{group.type.toUpperCase()}</div>
              {group.items.map(item => {
                const faved = isFav(item)
                return (
                  <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', cursor:'pointer', transition:'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,111,71,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:C.creme, fontWeight:500 }}>{item.label}</div>
                      {item.sub && <div style={{ fontSize:11, color:C.cinza }}>{item.sub}</div>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleFav(item); forceUpdate(n => n+1) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color: faved ? '#F59E0B' : C.cinza }}>
                      {faved ? '★' : '☆'}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}

          {!query && (
            <>
              {favs.length > 0 && (
                <div>
                  <div style={{ padding:'8px 14px 4px', fontSize:10, fontWeight:700, color:'#F59E0B', letterSpacing:'0.08em' }}>FAVORITOS</div>
                  {favs.slice(0, 5).map(f => (
                    <div key={f.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px' }}>
                      <span style={{ fontSize:11, color:'#F59E0B' }}>★</span>
                      <span style={{ fontSize:13, color:C.creme }}>{f.label}</span>
                      {f.sub && <span style={{ fontSize:11, color:C.cinza }}>{f.sub}</span>}
                    </div>
                  ))}
                </div>
              )}
              {history.length > 0 && (
                <div>
                  <div style={{ padding:'8px 14px 4px', fontSize:10, fontWeight:700, color:C.cinza, letterSpacing:'0.08em' }}>BUSCAS RECENTES</div>
                  {history.map((h, i) => (
                    <div key={i} onClick={() => { setQuery(h); doSearch(h) }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', cursor:'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontSize:12, color:C.cinza }}>↺</span>
                      <span style={{ fontSize:13, color:C.cinza }}>{h}</span>
                    </div>
                  ))}
                </div>
              )}
              {favs.length === 0 && history.length === 0 && (
                <div style={{ padding:'16px', textAlign:'center', color:C.cinza, fontSize:13 }}>Digite para buscar clínicas, leads, procedimentos, profissionais, scripts e FAQ</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CARD COM BADGE DE TAREFAS ────────────────────────────────
const ClinicCard = ({ clinic, onClick }) => {
  const tarefasPendentes = useTarefasPendentes(clinic.id)

  return (
    <div onClick={onClick}
      style={{ background:C.card, border:`1px solid ${C.borda}`, borderRadius:16, padding:24, cursor:'pointer', transition:'all 0.2s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 40px rgba(139,111,71,0.15)`; e.currentTarget.style.borderColor=C.marrom }}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; e.currentTarget.style.borderColor=C.borda }}>

      {tarefasPendentes > 0 && (
        <div style={{ position:'absolute', top:14, right:14, background:C.vermelho, color:C.branco, borderRadius:99, minWidth:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, padding:'0 6px' }}>
          {tarefasPendentes}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
        {clinic.foto_url || clinic.icon_url
          ? <img src={clinic.foto_url || clinic.icon_url} style={{ width:52, height:52, borderRadius:12, objectFit:'cover', border:`2px solid ${C.borda}` }} />
          : <div style={{ width:52, height:52, borderRadius:12, background:C.marrom+'22', border:`1px solid ${C.marrom}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:C.marrom }}>
              {clinic.name[0].toUpperCase()}
            </div>
        }
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:C.creme, letterSpacing:'-0.01em' }}>{clinic.name}</div>
          {tarefasPendentes > 0
            ? <div style={{ fontSize:12, color:C.vermelho, fontWeight:600, marginTop:2 }}>⚠ {tarefasPendentes} tarefa{tarefasPendentes>1?'s':''} pendente{tarefasPendentes>1?'s':''}</div>
            : <div style={{ fontSize:12, color:C.verde, fontWeight:500, marginTop:2 }}>✓ Sem pendências</div>
          }
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:12, color:C.cinza }}>
          {clinic.ativo ? <span style={{ color:C.verde, fontWeight:600 }}>● Ativo</span> : <span style={{ color:C.cinza }}>● Inativo</span>}
        </div>
        <div style={{ fontSize:12, color:C.marrom, fontWeight:600 }}>Visualizar guia →</div>
      </div>
    </div>
  )
}

// ─── MODAL NOVA CLÍNICA (2 passos) ───────────────────────────
const NovaClinicaModal = ({ onClose, onCreated }) => {
  const [nome, setNome] = useState('')
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [token, setToken] = useState('')
  const [instance, setInstance] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [inboxId, setInboxId] = useState('')
  const [accountId, setAccountId] = useState('1')
  const [horarioInicio, setHorarioInicio] = useState('08:00')
  const [horarioFim, setHorarioFim] = useState('18:00')
  const [diasSemana, setDiasSemana] = useState([1, 2, 3, 4, 5])
  const [frequencia, setFrequencia] = useState('diario')
  const [msgFora, setMsgFora] = useState('Olá! Estamos fora do horário de atendimento.')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleCreate = async () => {
    if (!nome.trim()) return setErro('Nome obrigatório')
    setSaving(true)
    setErro('')

    let foto_url = null
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop()
      const path = `clinic-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('clinic-photos').upload(path, fotoFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('clinic-photos').getPublicUrl(path)
        foto_url = urlData?.publicUrl || null
      }
    }

    // 1. Insert into clinics
    const { data: clinic, error: clinicErr } = await supabase.from('clinics').insert({
      name: nome.trim(),
      foto_url,
      numero_whatsapp: whatsapp.trim() || null,
      chatwoot_inbox_id: inboxId.trim() || null,
      chatwoot_account_id: accountId ? Number(accountId) : null
    }).select().single()
    
    if (clinicErr) { setSaving(false); return setErro('Erro ao criar clínica: ' + clinicErr.message) }

    // 2. Insert into horario_comercial (using correct DB column names)
    const { error: horErr } = await supabase.from('horario_comercial').insert({
      clinic_id: clinic.id,
      uazapi_token: token.trim() || null,
      instancia: instance.trim() || null,
      hora_inicio: horarioInicio,
      hora_fim: horarioFim,
      dias_semana: diasSemana,
      relatorio_periodicidade: frequencia,
      grupo_relatorio: 'geral',
      mensagem_fora: msgFora,
      ativo: true
    })

    if (horErr) {
      // Non-blocking log, but show error
      console.error('Erro ao salvar horario_comercial:', horErr.message)
    }

    // 3. Insert into clinicas_config (for n8n webhook and copiloto routing)
    const { error: confErr } = await supabase.from('clinicas_config').insert({
      nome: nome.trim(),
      numero_whatsapp: whatsapp.trim() || null,
      chatwoot_inbox_id: inboxId ? Number(inboxId) : null,
      chatwoot_account_id: accountId ? Number(accountId) : null,
      uazapi_token: token.trim() || null,
      status: 'ativo'
    })

    if (confErr) {
      console.error('Erro ao salvar clinicas_config:', confErr.message)
    }

    setSaving(false)
    onCreated(clinic)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#1a1a1a', border:`1px solid ${C.borda}`, borderRadius:16, width:'100%', maxWidth:500, boxShadow:'0 30px 80px rgba(0,0,0,0.5)', overflow:'hidden', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.borda}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.creme }}>Adicionar clínica</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.cinza }}>×</button>
        </div>
        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>NOME DA CLÍNICA *</label>
            <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Femme Clinic" style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', fontSize:14, background:C.input, color:C.creme }} />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>WHATSAPP DA CLÍNICA (Apenas números com DDD)</label>
            <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="Ex: 5521999999999" style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', background:C.input, color:C.creme }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>CHATWOOT INBOX ID</label>
              <input value={inboxId} onChange={e=>setInboxId(e.target.value)} placeholder="Ex: 10" style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', background:C.input, color:C.creme }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>CHATWOOT ACCOUNT ID</label>
              <input value={accountId} onChange={e=>setAccountId(e.target.value)} placeholder="Ex: 1" style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', background:C.input, color:C.creme }} />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>UAZAPI TOKEN</label>
              <input value={token} onChange={e=>setToken(e.target.value)} style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', background:C.input, color:C.creme }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>INSTANCE NAME</label>
              <input value={instance} onChange={e=>setInstance(e.target.value)} style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', background:C.input, color:C.creme }} />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>HORÁRIO INÍCIO</label>
              <input type="time" value={horarioInicio} onChange={e=>setHorarioInicio(e.target.value)} style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', background:C.input, color:C.creme }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>HORÁRIO FIM</label>
              <input type="time" value={horarioFim} onChange={e=>setHorarioFim(e.target.value)} style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', background:C.input, color:C.creme }} />
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>MENSAGEM FORA HORÁRIO</label>
            <textarea value={msgFora} onChange={e=>setMsgFora(e.target.value)} style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', background:C.input, color:C.creme, resize:'vertical', minHeight:60 }} />
          </div>

          {erro && <div style={{ fontSize:12, color:C.vermelho, background:C.vermelho+'18', padding:'8px 12px', borderRadius:8 }}>{erro}</div>}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:`1px solid ${C.borda}` }}>
            <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${C.borda}`, background:'transparent', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', color:C.cinza }}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving}
              style={{ padding:'8px 18px', borderRadius:8, border:'none', background:C.marrom, color:C.branco, cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', opacity:saving?0.6:1 }}>
              {saving ? 'Criando...' : 'Criar clínica'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CENTRAL DE CLÍNICAS ──────────────────────────────────────
export default function CentralClinicas({ clinics, onSelectClinic, onNewClinic, onSignOut, onPainelAdmin, onMinhaConta, currentUser }) {
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)

  const clinicsFiltradas = (clinics || []).filter(c => c.name.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div style={{ minHeight:'100vh', background:C.fundo, fontFamily:"'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:99px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>

      {/* Header */}
      <div style={{ background:'#111111', borderBottom:`1px solid ${C.borda}`, padding:'0 32px', height:58, display:'flex', alignItems:'center', gap:16, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:C.marrom, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:C.branco, fontSize:13, fontWeight:800 }}>P</span>
        </div>
        <span style={{ fontWeight:800, fontSize:15, color:C.creme, letterSpacing:'-0.01em' }}>Pluz Tech</span>

        <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
          <GlobalSearch clinics={clinics} />
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {onMinhaConta && (
            <button onClick={onMinhaConta}
              style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.borda}`, background:'transparent', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', color:C.cinza, transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=C.marrom; e.currentTarget.style.color=C.marrom }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.borda; e.currentTarget.style.color=C.cinza }}>
              👤 Minha Conta
            </button>
          )}
          {onPainelAdmin && (
            <button onClick={onPainelAdmin}
              style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.marrom}44`, background:C.marrom+'18', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', color:C.marrom, transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background=C.marrom+'33' }}
              onMouseLeave={e => { e.currentTarget.style.background=C.marrom+'18' }}>
              🛡️ Painel Admin
            </button>
          )}
          <button onClick={onSignOut} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:C.cinza, padding:'6px 10px' }}>Sair</button>
        </div>
      </div>

      <div style={{ maxWidth:1140, margin:'0 auto', padding:'40px 24px' }}>

        {/* Título e ações */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:32, flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ margin:0, fontSize:28, fontWeight:800, color:C.creme, letterSpacing:'-0.03em' }}>Central de Clínicas</h1>
            <p style={{ margin:'6px 0 0', fontSize:13, color:C.cinza }}>Selecione uma clínica para acessar o guia operacional</p>
          </div>
          {(currentUser?.role === 'super_admin' || currentUser?.permissoes?.includes('criar_clinicas')) && (
            <button onClick={() => setShowModal(true)}
              style={{ padding:'10px 22px', borderRadius:10, background:C.marrom, color:C.branco, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background=C.marromHover}
              onMouseLeave={e => e.currentTarget.style.background=C.marrom}>
              + Adicionar clínica
            </button>
          )}
        </div>

        {/* Busca local */}
        <div style={{ marginBottom:28 }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar clínicas..."
            style={{ width:'100%', maxWidth:360, border:`1px solid ${C.borda}`, borderRadius:10, padding:'10px 16px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.input, color:C.creme }} />
        </div>

        {/* Grid de cards */}
        {clinicsFiltradas.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:C.cinza }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🏥</div>
            <div style={{ fontSize:16, fontWeight:600, color:C.creme, marginBottom:6 }}>Nenhuma clínica encontrada</div>
            <div style={{ fontSize:13 }}>Adicione sua primeira clínica para começar</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:16 }}>
            {clinicsFiltradas.map(clinic => (
              <ClinicCard key={clinic.id} clinic={clinic} onClick={() => onSelectClinic(clinic)} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NovaClinicaModal
          onClose={() => setShowModal(false)}
          onCreated={(clinic) => { onNewClinic(clinic); onSelectClinic(clinic) }}
        />
      )}
    </div>
  )
}
