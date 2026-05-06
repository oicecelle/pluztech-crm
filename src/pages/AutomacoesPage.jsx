import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useHorarios, useScripts, useIAPrompt, useAutomacaoLogs, useFollowupConfig, useFollowupFila, useAgendamentosConfig, useAgendamentos } from '../hooks/useAutomacoes'

// ─── PALETA DARK ─────────────────────────────────────────────
const D = {
  bg:'#0F0F0F', card:'#1a1a1a', cardAlt:'#161616',
  text:'#FAF7F2', sub:'#9ca3af', accent:'#8B6F47',
  border:'#2a2a2a', input:'#222222',
  success:'#22c55e', danger:'#ef4444',
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const TIPO_GATILHO_LABEL = {
  texto_exato:      'Texto exato',
  palavra_chave:    'Palavra-chave',
  primeiro_contato: 'Primeiro contato',
  frase_assistente: 'Frase do assistente',
  status_lead:      'Status do lead',
  estagio_lead:     'Estágio do lead',
}
const ACAO_LABEL = {
  aguardar:          'Aguardar resposta',
  transferir_humano: 'Transferir para humano',
  atualizar_status:  'Atualizar status/estágio',
  iniciar_followup:  'Iniciar follow-up',
}
const TIPO_PARTE_ICON = { texto: '💬', imagem: '🖼️', audio: '🎵', documento: '📄' }
const LOG_TIPO_LABEL = {
  mensagem_recebida:   { label: 'Recebida',    cor: '#3B82F6' },
  resposta_ia:         { label: 'IA respondeu', cor: '#8B5CF6' },
  script_automatico:   { label: 'Script auto',  cor: '#F59E0B' },
  fila_entrada:        { label: 'Fila entrada', cor: '#06B6D4' },
  fila_saida:          { label: 'Fila saída',   cor: '#10B981' },
  followup:            { label: 'Follow-up',    cor: '#F97316' },
  disparo:             { label: 'Disparo',      cor: '#6366F1' },
  transferencia_humano:{ label: 'Transferido',  cor: '#EF4444' },
  erro:                { label: 'Erro',         cor: '#DC2626' },
}

const fmtDateTime = d => d ? new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—'

// ─── COMPONENTES BASE ─────────────────────────────────────────
export const Btn = ({ children, onClick, variant='primary', size='md', disabled=false }) => {
  const v = {
    primary:   { background:D.accent, color:'#fff', border:'none' },
    secondary: { background:D.card, color:D.text, border:`1px solid ${D.border}` },
    ghost:     { background:'transparent', color:D.sub, border:'1px solid transparent' },
    danger:    { background:D.danger+'18', color:D.danger, border:`1px solid ${D.danger}44` },
    success:   { background:D.success+'18', color:D.success, border:`1px solid ${D.success}44` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ borderRadius:8, fontWeight:600, cursor:disabled?'not-allowed':'pointer', transition:'all 0.15s', fontFamily:'inherit', opacity:disabled?0.5:1, fontSize:size==='sm'?12:14, padding:size==='sm'?'5px 12px':'8px 16px', ...v[variant] }}>
      {children}
    </button>
  )
}

const Toggle = ({ value, onChange, label }) => (
  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
    <div onClick={()=>onChange(!value)} style={{ width:40, height:22, borderRadius:99, background:value?D.accent:'#333', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left:value?21:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.4)' }} />
    </div>
    {label && <span style={{ fontSize:13, color:D.text }}>{label}</span>}
  </label>
)

const Input = ({ label, value, onChange, type='text', placeholder='', mono=false }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em' }}>{label}</label>}
    <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ border:`1px solid ${D.border}`, borderRadius:8, padding:'9px 12px', fontSize:13, color:D.text, background:D.input, outline:'none', fontFamily:mono?'monospace':'inherit' }} />
  </div>
)

const Sel = ({ label, value, onChange, options }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em' }}>{label}</label>}
    <select value={value||''} onChange={e=>onChange(e.target.value)} style={{ border:`1px solid ${D.border}`, borderRadius:8, padding:'9px 12px', fontSize:13, color:D.text, background:D.input, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
      <option value=''>Selecionar...</option>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)

const Modal = ({ open, onClose, title, children, width=600 }) => {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${D.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:D.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:D.sub, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24, overflowY:'auto', flex:1 }}>{children}</div>
      </div>
    </div>
  )
}

const Badge = ({ label, color='#9ca3af' }) => (
  <span style={{ background:color+'22', color, border:`1px solid ${color}44`, borderRadius:99, padding:'2px 10px', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>
)

const Card = ({ children, style={} }) => (
  <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:12, padding:20, ...style }}>{children}</div>
)

const Spinner = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
    <div style={{ width:24, height:24, border:`3px solid ${D.border}`, borderTopColor:D.accent, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
  </div>
)

const Toast = ({ msg, type='success' }) => (
  <div style={{ position:'fixed', bottom:24, right:24, background:type==='error'?D.danger+'18':'#14532d', border:`1px solid ${type==='error'?D.danger+'44':'#22c55e44'}`, color:type==='error'?D.danger:D.success, borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:600, zIndex:2000, boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
    {type==='error'?'✕ ':'✓ '}{msg}
  </div>
)

// ─── ABA HORÁRIO ──────────────────────────────────────────────
const HorarioTab = ({ clinicId }) => {
  const { horarios, loading, save, remove } = useHorarios(clinicId)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [testeResult, setTesteResult] = useState(null)
  const [testando, setTestando] = useState(false)

  const testarConexao = async (h) => {
    setTestando(true)
    setTesteResult(null)
    const token = h.uazapi_token || ''
    const resultados = {}
    const body = JSON.stringify({ number: '5521999999999', text: 'teste', textMessage: { text: 'teste' } })
    const hdrs = { 'Content-Type': 'application/json', 'apikey': token }

    // Testa múltiplos servidores possíveis
    const servidores = [
      'https://customix.uazapi.com',
      'https://api.customix.uazapi.com',
      'https://app.customix.uazapi.com',
      'https://api.uazapi.com',
      'https://app.uazapi.com',
    ]

    for (const srv of servidores) {
      try {
        const r = await fetch(`${srv}/message/sendText`, {
          method: 'POST',
          headers: hdrs,
          body,
        })
        const txt = await r.text().catch(() => '')
        resultados[`POST ${srv}/message/sendText`] = `${r.status} → ${txt.slice(0, 200)}`
      } catch (e) {
        resultados[`POST ${srv}/message/sendText`] = `ERRO: ${e.message}`
      }
    }

    // Testa o servidor atual com GET no sendText (talvez seja GET?)
    const base = h.uazapi_base_url || 'https://customix.uazapi.com'
    try {
      const r = await fetch(`${base}/message/sendText?number=5521999999999&text=teste`, {
        method: 'GET',
        headers: hdrs,
      })
      const txt = await r.text().catch(() => '')
      resultados[`GET ${base}/message/sendText?number=...`] = `${r.status} → ${txt.slice(0, 200)}`
    } catch (e) {
      resultados[`GET ${base}/message/sendText?...`] = `ERRO: ${e.message}`
    }

    setTesteResult(resultados)
    setTestando(false)
  }

  const blank = { instancia:'', uazapi_token:'', uazapi_base_url:'https://customix.uazapi.com', n8n_webhook_url:'', hora_inicio:'08:00', hora_fim:'18:00', dias_semana:[1,2,3,4,5], mensagem_fora:'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve! 😊', ativo:true, grupo_whatsapp:'', grupo_relatorio:'', relatorio_periodicidade:'diario', relatorio_hora:'20:00' }
  const [form, setForm] = useState(blank)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const toggleDia = d => set('dias_semana', (form.dias_semana||[]).includes(d) ? (form.dias_semana||[]).filter(x=>x!==d) : [...(form.dias_semana||[]),d])
  const showT = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),2500) }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await save(editando ? {...form, id: editando} : form)
    setSaving(false)
    if (error) showT('Erro ao salvar: ' + error.message, 'error')
    else { showT('Salvo com sucesso!'); setShowModal(false); setForm(blank) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:D.text }}>Horário Comercial</h3>
          <p style={{ margin:'4px 0 0', fontSize:13, color:D.sub }}>Mensagens fora deste horário entram em fila automática</p>
        </div>
        <Btn size="sm" onClick={()=>{ setForm(blank); setEditando(null); setShowModal(true) }}>+ Nova configuração</Btn>
      </div>

      {loading ? <Spinner /> : horarios.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:D.sub, fontSize:13 }}>Nenhum horário configurado</div>
      ) : horarios.map(h => (
        <Card key={h.id}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:700, color:h.instancia?D.text:D.sub, fontFamily:'monospace' }}>{h.instancia || '(instância auto)'}</span>
                <Badge label={h.ativo?'Ativo':'Inativo'} color={h.ativo?'#10B981':'#9CA3AF'} />
                <Badge label={h.uazapi_token?'Token OK':'Sem token'} color={h.uazapi_token?'#10B981':'#EF4444'} />
              </div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:12 }}>
                <span style={{ fontSize:13, color:D.sub }}>🕐 {h.hora_inicio} – {h.hora_fim}</span>
                <div style={{ display:'flex', gap:4 }}>
                  {DIAS.map((d,i)=>(
                    <span key={i} style={{ width:28, height:28, borderRadius:6, background:(h.dias_semana||[]).includes(i)?D.accent:'#2a2a2a', color:(h.dias_semana||[]).includes(i)?'#fff':D.sub, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{d}</span>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:12, color:D.sub, background:D.cardAlt||'#161616', borderRadius:8, padding:'8px 12px', fontStyle:'italic', border:`1px solid ${D.border}` }}>
                "{h.mensagem_fora}"
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <Btn size="sm" variant="ghost" disabled={testando} onClick={()=>testarConexao(h)}>{testando?'Testando...':'Testar API'}</Btn>
              <Btn size="sm" variant="secondary" onClick={()=>{ setForm({...h}); setEditando(h.id); setShowModal(true) }}>Editar</Btn>
              <Btn size="sm" variant="danger" onClick={()=>remove(h.id)}>Excluir</Btn>
            </div>
          </div>
        </Card>
      ))}

      {testeResult && (
        <Card style={{ border:`1px solid ${D.accent}44` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:700, color:D.text }}>Resultado do Teste de Conexão</span>
            <button onClick={()=>setTesteResult(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:D.sub }}>×</button>
          </div>
          {Object.entries(testeResult).map(([label, val]) => (
            <div key={label} style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:D.accent, marginBottom:3 }}>{label}</div>
              <pre style={{ margin:0, fontSize:11, color:D.text, background:'#111', borderRadius:6, padding:'8px 10px', overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all', border:`1px solid ${D.border}` }}>{val}</pre>
            </div>
          ))}
        </Card>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type}/>}

      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editando?'Editar Horário':'Nova Configuração'}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Input label="WEBHOOK N8N PARA DISPAROS (recomendado)" value={form.n8n_webhook_url||''} onChange={v=>set('n8n_webhook_url',v)} placeholder="https://...n8n.cloud/webhook/disparo-mensagem" />
          <div style={{ background:'#1e2a1e', border:'1px solid #2d4a2d', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#86efac' }}>
            Se preenchido, os disparos serão enviados via N8n (recomendado). O N8n deve receber <code style={{background:'#0a1a0a',padding:'1px 5px',borderRadius:4}}>{"{ number, message }"}</code> e encaminhar para a Uazapi.
          </div>
          <Input label="TOKEN DA UAZAPI (apikey) — alternativo" value={form.uazapi_token||''} onChange={v=>set('uazapi_token',v)} placeholder="Usado somente se o webhook N8n não estiver configurado" />
          <Input label="URL BASE DA UAZAPI" value={form.uazapi_base_url||'https://customix.uazapi.com'} onChange={v=>set('uazapi_base_url',v)} placeholder="https://customix.uazapi.com" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="HORA INÍCIO" value={form.hora_inicio} onChange={v=>set('hora_inicio',v)} type="time" />
            <Input label="HORA FIM" value={form.hora_fim} onChange={v=>set('hora_fim',v)} type="time" />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em', display:'block', marginBottom:8 }}>DIAS DE ATENDIMENTO</label>
            <div style={{ display:'flex', gap:6 }}>
              {DIAS.map((d,i)=>(
                <button key={i} onClick={()=>toggleDia(i)} style={{ width:36, height:36, borderRadius:8, border:(form.dias_semana||[]).includes(i)?`1.5px solid ${D.accent}`:`1.5px solid ${D.border}`, background:(form.dias_semana||[]).includes(i)?D.accent:'#2a2a2a', color:(form.dias_semana||[]).includes(i)?'#fff':D.sub, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em', display:'block', marginBottom:5 }}>MENSAGEM FORA DO HORÁRIO</label>
            <textarea value={form.mensagem_fora} onChange={e=>set('mensagem_fora',e.target.value)} rows={3} style={{ width:'100%', border:`1px solid ${D.border}`, borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:D.input, color:D.text, resize:'vertical', boxSizing:'border-box' }} />
          </div>
          <div style={{ borderTop:`1px solid ${D.border}`, paddingTop:16, marginTop:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em', display:'block', marginBottom:10 }}>ALERTAS E RELATÓRIOS (WhatsApp)</label>
            <div style={{ background:'#1a1408', border:'1px solid #3d2c00', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#c9a227', marginBottom:12 }}>
              💡 Coloque o JID do grupo do WhatsApp (ex: <code style={{background:'#0a1a0a',padding:'1px 5px',borderRadius:4}}>5521999@g.us</code>). Para descobrir, veja o chatid no webhook da Uazapi quando uma mensagem for enviada no grupo.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <Input label="GRUPO — ALERTAS SUPERVISÃO (JID)" value={form.grupo_whatsapp||''} onChange={v=>set('grupo_whatsapp',v)} placeholder="5521999000000@g.us" />
              <Input label="GRUPO — RELATÓRIOS (JID)" value={form.grupo_relatorio||''} onChange={v=>set('grupo_relatorio',v)} placeholder="5521999000000@g.us" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Sel label="PERIODICIDADE DO RELATÓRIO" value={form.relatorio_periodicidade||'diario'} onChange={v=>set('relatorio_periodicidade',v)}
                options={[{value:'diario',label:'Diário'},{value:'semanal',label:'Semanal (segunda)'},{value:'quinzenal',label:'Quinzenal'},{value:'mensal',label:'Mensal (dia 1)'}]} />
              <Input label="HORA DO RELATÓRIO DIÁRIO" value={form.relatorio_hora||'20:00'} onChange={v=>set('relatorio_hora',v)} type="time" />
            </div>
          </div>
          <Toggle value={form.ativo} onChange={v=>set('ativo',v)} label="Ativo" />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:`1px solid ${D.border}` }}>
            <Btn variant="secondary" onClick={()=>setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave} disabled={saving}>{saving?'Salvando...':'Salvar'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── MODAL SCRIPT ─────────────────────────────────────────────
const ScriptModal = ({ script, onClose, onSave, saving }) => {
  const blank = { nome:'', tipo_gatilho:'texto_exato', gatilho_valor:'', acao_pos_envio:'aguardar', ativo:true, partes:[] }
  const [form, setForm] = useState(script ? {...script} : blank)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const addParte = () => set('partes', [...(form.partes||[]), { id:'np'+Date.now(), ordem:(form.partes||[]).length+1, tipo:'texto', conteudo:'', delay_ms:1500 }])
  const removeParte = id => set('partes', (form.partes||[]).filter(p=>p.id!==id))
  const updateParte = (id,k,v) => set('partes', (form.partes||[]).map(p=>p.id===id?{...p,[k]:v}:p))

  return (
    <Modal open onClose={onClose} title={script?'Editar Script':'Novo Script Automático'} width={700}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <Input label="NOME DO SCRIPT" value={form.nome} onChange={v=>set('nome',v)} placeholder="Ex: Boas-vindas do anúncio" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Sel label="TIPO DE GATILHO" value={form.tipo_gatilho} onChange={v=>set('tipo_gatilho',v)}
            options={Object.entries(TIPO_GATILHO_LABEL).map(([k,v])=>({value:k,label:v}))} />
          {form.tipo_gatilho !== 'primeiro_contato' && (
            <Input label="VALOR DO GATILHO" value={form.gatilho_valor} onChange={v=>set('gatilho_valor',v)} placeholder="Ex: Quero saber mais" />
          )}
        </div>
        <Sel label="AÇÃO APÓS ENVIAR" value={form.acao_pos_envio} onChange={v=>set('acao_pos_envio',v)}
          options={Object.entries(ACAO_LABEL).map(([k,v])=>({value:k,label:v}))} />

        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em' }}>PARTES DO SCRIPT</label>
            <Btn size="sm" variant="secondary" onClick={addParte}>+ Adicionar parte</Btn>
          </div>
          {(form.partes||[]).length===0 && (
            <div style={{ textAlign:'center', padding:20, color:D.sub, fontSize:13, border:`1px dashed ${D.border}`, borderRadius:8 }}>
              Cada parte é enviada em sequência com delay entre elas
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {(form.partes||[]).sort((a,b)=>a.ordem-b.ordem).map((parte,idx)=>(
              <div key={parte.id} style={{ background:'#161616', borderRadius:10, padding:14, border:`1px solid ${D.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{ width:22, height:22, borderRadius:6, background:D.accent, color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{idx+1}</span>
                  <div style={{ display:'flex', gap:5 }}>
                    {['texto','imagem','audio','documento'].map(t=>(
                      <button key={t} onClick={()=>updateParte(parte.id,'tipo',t)} style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:parte.tipo===t?`1.5px solid ${D.accent}`:`1.5px solid ${D.border}`, background:parte.tipo===t?D.accent+'22':'transparent', color:parte.tipo===t?D.accent:D.sub, fontFamily:'inherit' }}>
                        {TIPO_PARTE_ICON[t]} {t}
                      </button>
                    ))}
                  </div>
                  <div style={{ flex:1 }} />
                  <button onClick={()=>removeParte(parte.id)} style={{ background:'none', border:'none', cursor:'pointer', color:D.sub, fontSize:16 }}>✕</button>
                </div>
                {parte.tipo==='texto'
                  ? <textarea value={parte.conteudo} onChange={e=>updateParte(parte.id,'conteudo',e.target.value)} rows={2} placeholder="Texto da mensagem..." style={{ width:'100%', border:`1px solid ${D.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:D.input, color:D.text, resize:'vertical', boxSizing:'border-box' }} />
                  : <input value={parte.conteudo} onChange={e=>updateParte(parte.id,'conteudo',e.target.value)} placeholder={`URL da ${parte.tipo}...`} style={{ width:'100%', border:`1px solid ${D.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'monospace', background:D.input, color:D.text, boxSizing:'border-box' }} />
                }
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                  <span style={{ fontSize:11, color:D.sub }}>Delay:</span>
                  <input type="number" value={parte.delay_ms} onChange={e=>updateParte(parte.id,'delay_ms',Number(e.target.value))} min={0} max={10000} step={500}
                    style={{ width:80, border:`1px solid ${D.border}`, borderRadius:6, padding:'4px 8px', fontSize:12, outline:'none', fontFamily:'inherit', background:D.input, color:D.text }} />
                  <span style={{ fontSize:11, color:D.sub }}>ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Toggle value={form.ativo} onChange={v=>set('ativo',v)} label="Script ativo" />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:`1px solid ${D.border}` }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={()=>onSave(form)} disabled={saving}>{saving?'Salvando...':'Salvar script'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── ABA SCRIPTS ──────────────────────────────────────────────
const ScriptsTab = ({ clinicId }) => {
  const { scripts, loading, save, remove } = useScripts(clinicId)
  const [editando, setEditando] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showT = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),2500) }

  const handleSave = async (form) => {
    setSaving(true)
    const { error } = await save(form)
    setSaving(false)
    if (error) showT('Erro: '+error.message,'error')
    else { showT('Script salvo!'); setShowModal(false); setEditando(null) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:D.text }}>Scripts Automáticos</h3>
          <p style={{ margin:'4px 0 0', fontSize:13, color:D.sub }}>Respostas em sequência disparadas por gatilho</p>
        </div>
        <Btn size="sm" onClick={()=>{ setEditando(null); setShowModal(true) }}>+ Novo script</Btn>
      </div>

      {loading ? <Spinner /> : scripts.length===0 ? (
        <div style={{ textAlign:'center', padding:40, color:D.sub, fontSize:13 }}>Nenhum script configurado</div>
      ) : scripts.map(s=>(
        <Card key={s.id}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:14, fontWeight:700, color:D.text }}>{s.nome}</span>
                <Badge label={s.ativo?'Ativo':'Inativo'} color={s.ativo?'#10B981':'#9CA3AF'} />
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                <Badge label={TIPO_GATILHO_LABEL[s.tipo_gatilho]||s.tipo_gatilho} color="#3B82F6" />
                {s.gatilho_valor && <span style={{ fontSize:12, color:D.sub, background:D.input, borderRadius:6, padding:'2px 8px', fontFamily:'monospace' }}>"{s.gatilho_valor}"</span>}
                <Badge label={ACAO_LABEL[s.acao_pos_envio]||s.acao_pos_envio} color="#8B5CF6" />
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(s.partes||[]).map((p,i)=>(
                  <span key={p.id} style={{ fontSize:11, color:D.sub, background:'#161616', borderRadius:6, padding:'3px 8px', border:`1px solid ${D.border}` }}>
                    {TIPO_PARTE_ICON[p.tipo]} {i+1}. {p.tipo}
                  </span>
                ))}
                {(s.partes||[]).length===0 && <span style={{ fontSize:12, color:D.sub }}>Sem partes</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <Btn size="sm" variant="secondary" onClick={()=>{ setEditando(s); setShowModal(true) }}>Editar</Btn>
              <Btn size="sm" variant="danger" onClick={()=>remove(s.id)}>Excluir</Btn>
            </div>
          </div>
        </Card>
      ))}

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {showModal && <ScriptModal script={editando} onClose={()=>{ setShowModal(false); setEditando(null) }} onSave={handleSave} saving={saving} />}
    </div>
  )
}

// ─── ABA IA ───────────────────────────────────────────────────
const IATab = ({ clinicId }) => {
  const { prompt, loading, save } = useIAPrompt(clinicId)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!form && prompt) setForm({...prompt})
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await save(form)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(()=>setSaved(false), 2000) }
  }

  if (loading || !form) return <Spinner />

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:D.text }}>Prompt de IA</h3>
          <p style={{ margin:'4px 0 0', fontSize:13, color:D.sub }}>Contexto, tom de voz, limites e exemplos para a IA desta clínica</p>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <Toggle value={form.ativo} onChange={v=>set('ativo',v)} label="IA ativa" />
          <Btn size="sm" variant={saved?'success':'primary'} onClick={handleSave} disabled={saving}>
            {saving?'Salvando...':saved?'✓ Salvo!':'Salvar'}
          </Btn>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
        <Sel label="MODELO" value={form.modelo} onChange={v=>set('modelo',v)}
          options={[{value:'gpt-4o-mini',label:'GPT-4o Mini (rápido)'},{value:'gpt-4o',label:'GPT-4o (melhor)'},{value:'gpt-3.5-turbo',label:'GPT-3.5 (econômico)'}]} />
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em' }}>TEMPERATURA ({form.temperatura})</label>
          <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:10 }}>
            <span style={{ fontSize:10, color:D.sub }}>Preciso</span>
            <input type="range" min={0} max={1} step={0.1} value={form.temperatura} onChange={e=>set('temperatura',parseFloat(e.target.value))} style={{ flex:1, cursor:'pointer', accentColor:D.accent }} />
            <span style={{ fontSize:10, color:D.sub }}>Criativo</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em' }}>TENTATIVAS ATÉ TRANSFERIR</label>
          <input type="number" min={1} max={5} value={form.max_tentativas} onChange={e=>set('max_tentativas',Number(e.target.value))}
            style={{ border:`1px solid ${D.border}`, borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:D.input, color:D.text }} />
        </div>
      </div>

      <Input label="TOKEN CHATWOOT (API Access Token desta clínica)" value={form.chatwoot_token}
        onChange={v=>set('chatwoot_token',v)} mono placeholder="Cole aqui o api_access_token do Chatwoot para esta clínica" />

      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em' }}>SYSTEM PROMPT — Conversacional (IA que responde o lead)</label>
          <span style={{ fontSize:11, color:D.sub }}>{(form.system_prompt||'').length} caracteres</span>
        </div>
        <textarea value={form.system_prompt||''} onChange={e=>set('system_prompt',e.target.value)} rows={14}
          placeholder={`Escreva aqui as instruções completas para a IA:\n\n- Quem ela é e para qual clínica trabalha\n- Tom de voz e como deve se comunicar\n- O que pode e NÃO pode responder\n- Exemplos de perguntas e respostas ideais\n- O que fazer quando não souber responder\n\nIMPORTANTE: quando precisar transferir para humano, inclua [transferir] na resposta.`}
          style={{ width:'100%', border:`1px solid ${D.border}`, borderRadius:10, padding:'12px 14px', fontSize:13, outline:'none', fontFamily:'monospace', background:D.input, color:D.text, resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }} />
      </div>

      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em' }}>SYSTEM PROMPT — Copiloto (sugestões para a assistente humana)</label>
            <p style={{ margin:'3px 0 0', fontSize:11, color:D.sub }}>Se vazio, usa o prompt padrão do Copiloto. Customize para incluir particularidades desta clínica.</p>
          </div>
          <span style={{ fontSize:11, color:D.sub, flexShrink:0, marginLeft:12 }}>{(form.copiloto_system_prompt||'').length} caracteres</span>
        </div>
        <textarea value={form.copiloto_system_prompt||''} onChange={e=>set('copiloto_system_prompt',e.target.value)} rows={8}
          placeholder={`Opcional. Se preenchido, substitui o prompt padrão do Copiloto.\n\nExemplo:\nVocê é um copiloto de vendas da Clínica Bella. Ajude a assistente a responder leads sobre botox, preenchimento e harmonização. Sempre seja acolhedora e mencione as promoções vigentes quando relevante.`}
          style={{ width:'100%', border:`1px solid ${D.border}`, borderRadius:10, padding:'12px 14px', fontSize:13, outline:'none', fontFamily:'monospace', background:D.input, color:D.text, resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }} />
      </div>

      <Card style={{ background:'#1a1408', border:'1px solid #3d2c00' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#d4a017', marginBottom:6 }}>💡 Dicas para um bom prompt</div>
        {['Defina claramente quem é a IA (nome, clínica, papel)','Liste exatamente o que ela pode e NÃO pode responder','Dê exemplos reais de perguntas e respostas ideais','Inclua preços, procedimentos e regras da clínica','Sempre termine com: quando não souber, escreva [transferir]'].map((d,i)=>(
          <div key={i} style={{ fontSize:12, color:'#c9a227', display:'flex', gap:6, marginTop:4 }}><span>•</span><span>{d}</span></div>
        ))}
      </Card>
    </div>
  )
}

// ─── ABA LOGS ─────────────────────────────────────────────────
const LogsTab = ({ clinicId }) => {
  const { logs, loading, refetch } = useAutomacaoLogs(clinicId)
  const thS = { padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em', borderBottom:`1px solid ${D.border}`, whiteSpace:'nowrap' }
  const tdS = { padding:'10px 14px', fontSize:12, color:D.text, borderBottom:`1px solid ${D.border}22` }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:D.text }}>Logs de Automação</h3>
          <p style={{ margin:'4px 0 0', fontSize:13, color:D.sub }}>Histórico das últimas 100 ações automáticas</p>
        </div>
        <Btn size="sm" variant="secondary" onClick={refetch}>↻ Atualizar</Btn>
      </div>

      {loading ? <Spinner /> : logs.length===0 ? (
        <div style={{ textAlign:'center', padding:40, color:D.sub, fontSize:13 }}>Nenhum log ainda</div>
      ) : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead>
                <tr style={{ background:'#161616' }}>
                  {['DATA','WHATSAPP','TIPO','ENTRADA','SAÍDA','STATUS'].map(h=>(
                    <th key={h} style={thS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => {
                  const tipoInfo = LOG_TIPO_LABEL[l.tipo] || { label: l.tipo, cor: D.sub }
                  return (
                    <tr key={l.id}>
                      <td style={{...tdS, color:D.sub, whiteSpace:'nowrap'}}>{fmtDateTime(l.criado_em)}</td>
                      <td style={{...tdS, fontFamily:'monospace'}}>{l.whatsapp}</td>
                      <td style={tdS}><Badge label={tipoInfo.label} color={tipoInfo.cor} /></td>
                      <td style={{...tdS, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{l.entrada||'—'}</td>
                      <td style={{...tdS, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{l.saida||'—'}</td>
                      <td style={tdS}><Badge label={l.sucesso?'OK':'Erro'} color={l.sucesso?'#10B981':'#EF4444'} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── ABA N8N FLUXOS ───────────────────────────────────────────
const N8nTab = ({ clinicId }) => {
  const [fluxos, setFluxos] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const N8N_BASE = 'https://n8n-n8n.rpskbr.easypanel.host'
  const showT = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),2500) }

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)
    supabase.from('clinica_fluxos_n8n').select('*').eq('clinic_id', clinicId).order('tipo')
      .then(({ data }) => { setFluxos(data || []); setLoading(false) })
  }, [clinicId])

  const toggleStatus = async (fluxo) => {
    const novoStatus = fluxo.status === 'ativo' ? 'inativo' : 'ativo'
    const { error } = await supabase.from('clinica_fluxos_n8n').update({ status: novoStatus }).eq('id', fluxo.id)
    if (!error) {
      setFluxos(f => f.map(x => x.id === fluxo.id ? { ...x, status: novoStatus } : x))
      showT(`Fluxo ${novoStatus === 'ativo' ? 'ativado' : 'desativado'}!`)
    } else showT('Erro: ' + error.message, 'error')
  }

  const TIPO_LABEL = {
    boas_vindas: 'Boas-vindas', followup: 'Follow-up', agendamento: 'Agendamento',
    confirmacao: 'Confirmação', pos_atendimento: 'Pós-atendimento',
    disparo: 'Disparo em massa', horario: 'Controle de horário',
  }

  if (loading) return <Spinner />

  if (fluxos.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:D.text }}>Fluxos N8n</h3>
          <p style={{ margin:'4px 0 0', fontSize:13, color:D.sub }}>Automações conectadas ao n8n desta clínica</p>
        </div>
        <div style={{ textAlign:'center', padding:'48px 24px', background:'#161616', borderRadius:12, border:`1px dashed ${D.border}` }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
          <div style={{ fontSize:15, fontWeight:700, color:D.text, marginBottom:6 }}>Nenhum fluxo configurado</div>
          <div style={{ fontSize:13, color:D.sub }}>Fluxos serão criados automaticamente após o onboarding da clínica.</div>
          <a href={N8N_BASE} target="_blank" rel="noreferrer"
            style={{ display:'inline-block', marginTop:16, padding:'8px 18px', borderRadius:8, background:D.accent, color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none' }}>
            Abrir n8n →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:D.text }}>Fluxos N8n</h3>
          <p style={{ margin:'4px 0 0', fontSize:13, color:D.sub }}>{fluxos.length} fluxo{fluxos.length !== 1 ? 's' : ''} configurado{fluxos.length !== 1 ? 's' : ''}</p>
        </div>
        <a href={N8N_BASE} target="_blank" rel="noreferrer"
          style={{ padding:'7px 14px', borderRadius:8, background:D.accent, color:'#fff', fontSize:12, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
          Abrir n8n ↗
        </a>
      </div>

      {fluxos.map(fluxo => (
        <Card key={fluxo.id}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:D.text }}>
                  {TIPO_LABEL[fluxo.tipo] || fluxo.tipo || 'Fluxo'}
                </span>
                <Badge label={fluxo.status === 'ativo' ? 'Ativo' : 'Inativo'} color={fluxo.status === 'ativo' ? '#10B981' : '#9CA3AF'} />
              </div>
              {fluxo.descricao && <div style={{ fontSize:12, color:D.sub, marginBottom:4 }}>{fluxo.descricao}</div>}
              {fluxo.workflow_id && <div style={{ fontSize:11, color:D.sub, fontFamily:'monospace' }}>ID: {fluxo.workflow_id}</div>}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
              {fluxo.workflow_id && (
                <a href={`${N8N_BASE}/workflow/${fluxo.workflow_id}`} target="_blank" rel="noreferrer"
                  style={{ padding:'5px 12px', borderRadius:7, background:'#222', color:D.text, fontSize:12, fontWeight:600, textDecoration:'none', border:`1px solid ${D.border}`, whiteSpace:'nowrap' }}>
                  Ver no n8n ↗
                </a>
              )}
              <button onClick={() => toggleStatus(fluxo)}
                style={{ padding:'5px 14px', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  border: fluxo.status === 'ativo' ? `1px solid ${D.danger}44` : `1px solid ${D.success}44`,
                  background: fluxo.status === 'ativo' ? D.danger+'18' : D.success+'18',
                  color: fluxo.status === 'ativo' ? D.danger : D.success,
                  whiteSpace:'nowrap' }}>
                {fluxo.status === 'ativo' ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>
        </Card>
      ))}

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  )
}

// ─── ABA FOLLOW-UP ────────────────────────────────────────────
const FollowUpTab = ({ clinicId }) => {
  const { config, loading: lcfg, save: saveCfg } = useFollowupConfig(clinicId)
  const { fila, loading: lfila, refetch: refetchFila, updateMensagem, remove: removeFila } = useFollowupFila(clinicId)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [editMsgId, setEditMsgId] = useState(null)
  const [editMsgVal, setEditMsgVal] = useState('')
  const showT = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),2500) }

  if (!form && config) setForm({...config})
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await saveCfg(form)
    setSaving(false)
    if (error) showT('Erro: '+error.message, 'error')
    else showT('Configuração salva!')
  }

  const handleEditMsg = async (id) => {
    const { error } = await updateMensagem(id, editMsgVal)
    if (error) showT('Erro ao salvar mensagem', 'error')
    else { showT('Mensagem atualizada!'); setEditMsgId(null) }
  }

  const STATUS_COLOR = { pendente:'#F59E0B', enviado:'#10B981', removido:'#9CA3AF', respondeu:'#3B82F6' }
  const STATUS_LABEL = { pendente:'Pendente', enviado:'Enviado', removido:'Removido', respondeu:'Respondeu' }

  if (lcfg || !form) return <Spinner />

  const fu1Fila = fila.filter(f=>f.tipo==='fu1')
  const fu2Fila = fila.filter(f=>f.tipo==='fu2')

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h3 style={{margin:0,fontSize:15,fontWeight:700,color:D.text}}>Follow-up Automático</h3>
          <p style={{margin:'4px 0 0',fontSize:13,color:D.sub}}>Reengajamento de leads que não responderam</p>
        </div>
        <Btn size="sm" variant={saving?'ghost':'primary'} onClick={handleSave} disabled={saving}>{saving?'Salvando...':'Salvar configuração'}</Btn>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* FU1 */}
        <Card>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <span style={{fontSize:14,fontWeight:700,color:D.text}}>Follow-up 1 — Pergunta sem resposta</span>
            <Toggle value={form.fu1_ativo} onChange={v=>set('fu1_ativo',v)} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12,opacity:form.fu1_ativo?1:0.4,transition:'opacity 0.2s'}}>
            <Input label="HORÁRIO DE ENVIO (Seg–Sex)" value={form.fu1_hora} onChange={v=>set('fu1_hora',v)} type="time" />
            <div>
              <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.06em',display:'block',marginBottom:5}}>MENSAGEM DE FOLLOW-UP</label>
              <textarea value={form.fu1_mensagem||''} onChange={e=>set('fu1_mensagem',e.target.value)} rows={3}
                placeholder="Ex: Olá! Vi que você ficou com uma dúvida, posso ajudar? 😊"
                style={{width:'100%',border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text,resize:'vertical',boxSizing:'border-box'}} />
            </div>
            <div style={{fontSize:12,color:D.sub,background:'#161616',borderRadius:8,padding:'8px 12px',border:`1px solid ${D.border}`}}>
              A fila aparece 1h antes do envio. O sistema detecta automaticamente perguntas (mensagens com "?") enviadas ontem pela equipe ou bot sem resposta do lead.
            </div>
          </div>
        </Card>

        {/* FU2 */}
        <Card>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <span style={{fontSize:14,fontWeight:700,color:D.text}}>Follow-up 2 — Mensagem específica</span>
            <Toggle value={form.fu2_ativo} onChange={v=>set('fu2_ativo',v)} />
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12,opacity:form.fu2_ativo?1:0.4,transition:'opacity 0.2s'}}>
            <Input label="HORÁRIO DE ENVIO (Seg–Sáb)" value={form.fu2_hora} onChange={v=>set('fu2_hora',v)} type="time" />
            <Input label="TEXTO-GATILHO (quando a equipe envia esta frase, entra na fila)" value={form.fu2_pergunta_gatilho||''} onChange={v=>set('fu2_pergunta_gatilho',v)} placeholder="Ex: Você tem interesse no procedimento?" />
            <div>
              <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.06em',display:'block',marginBottom:5}}>MENSAGEM DE FOLLOW-UP</label>
              <textarea value={form.fu2_mensagem||''} onChange={e=>set('fu2_mensagem',e.target.value)} rows={3}
                placeholder="Ex: Olá! Ficou com alguma dúvida sobre o procedimento? Estou aqui para ajudar! 😊"
                style={{width:'100%',border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text,resize:'vertical',boxSizing:'border-box'}} />
            </div>
          </div>
        </Card>
      </div>

      {/* Fila FU1 */}
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:13,fontWeight:700,color:D.text}}>Fila FU1 — hoje ({fu1Fila.length})</span>
          <Btn size="sm" variant="secondary" onClick={refetchFila}>↻ Atualizar</Btn>
        </div>
        {lfila ? <Spinner /> : fu1Fila.length===0 ? (
          <div style={{textAlign:'center',padding:24,color:D.sub,fontSize:13,border:`1px dashed ${D.border}`,borderRadius:10}}>Fila vazia — será populada 1h antes do envio</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {fu1Fila.map(item=>(
              <Card key={item.id} style={{padding:'12px 16px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:700,color:D.text,fontFamily:'monospace'}}>{item.whatsapp}</span>
                      {item.nome_lead && <span style={{fontSize:12,color:D.sub}}>{item.nome_lead}</span>}
                      <Badge label={STATUS_LABEL[item.status]||item.status} color={STATUS_COLOR[item.status]||D.sub} />
                    </div>
                    {item.mensagem_original && (
                      <div style={{fontSize:12,color:D.sub,marginBottom:6}}>
                        <span style={{fontWeight:700}}>Msg original: </span>"{item.mensagem_original}"
                      </div>
                    )}
                    {editMsgId===item.id ? (
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <input value={editMsgVal} onChange={e=>setEditMsgVal(e.target.value)}
                          style={{flex:1,border:`1px solid ${D.accent}`,borderRadius:6,padding:'6px 10px',fontSize:12,background:D.input,color:D.text,outline:'none',fontFamily:'inherit'}} />
                        <Btn size="sm" onClick={()=>handleEditMsg(item.id)}>OK</Btn>
                        <Btn size="sm" variant="secondary" onClick={()=>setEditMsgId(null)}>✕</Btn>
                      </div>
                    ) : (
                      <div style={{fontSize:12,color:D.text}}>
                        <span style={{fontWeight:700,color:D.sub}}>Msg FU: </span>"{item.mensagem_followup}"
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    {editMsgId!==item.id && <Btn size="sm" variant="ghost" onClick={()=>{setEditMsgId(item.id);setEditMsgVal(item.mensagem_followup||'')}}>Editar msg</Btn>}
                    {item.status==='pendente' && <Btn size="sm" variant="danger" onClick={()=>removeFila(item.id)}>Remover</Btn>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Fila FU2 */}
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:13,fontWeight:700,color:D.text}}>Fila FU2 — hoje ({fu2Fila.length})</span>
        </div>
        {lfila ? null : fu2Fila.length===0 ? (
          <div style={{textAlign:'center',padding:24,color:D.sub,fontSize:13,border:`1px dashed ${D.border}`,borderRadius:10}}>Fila vazia — populada em tempo real quando a equipe envia o texto-gatilho</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {fu2Fila.map(item=>(
              <Card key={item.id} style={{padding:'12px 16px'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:700,color:D.text,fontFamily:'monospace'}}>{item.whatsapp}</span>
                      {item.nome_lead && <span style={{fontSize:12,color:D.sub}}>{item.nome_lead}</span>}
                      <Badge label={STATUS_LABEL[item.status]||item.status} color={STATUS_COLOR[item.status]||D.sub} />
                    </div>
                    {item.mensagem_original && (
                      <div style={{fontSize:12,color:D.sub,marginBottom:6}}>
                        <span style={{fontWeight:700}}>Gatilho detectado: </span>"{item.mensagem_original}"
                      </div>
                    )}
                    {editMsgId===item.id ? (
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <input value={editMsgVal} onChange={e=>setEditMsgVal(e.target.value)}
                          style={{flex:1,border:`1px solid ${D.accent}`,borderRadius:6,padding:'6px 10px',fontSize:12,background:D.input,color:D.text,outline:'none',fontFamily:'inherit'}} />
                        <Btn size="sm" onClick={()=>handleEditMsg(item.id)}>OK</Btn>
                        <Btn size="sm" variant="secondary" onClick={()=>setEditMsgId(null)}>✕</Btn>
                      </div>
                    ) : (
                      <div style={{fontSize:12,color:D.text}}>
                        <span style={{fontWeight:700,color:D.sub}}>Msg FU: </span>"{item.mensagem_followup}"
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    {editMsgId!==item.id && <Btn size="sm" variant="ghost" onClick={()=>{setEditMsgId(item.id);setEditMsgVal(item.mensagem_followup||'')}}>Editar msg</Btn>}
                    {item.status==='pendente' && <Btn size="sm" variant="danger" onClick={()=>removeFila(item.id)}>Remover</Btn>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  )
}

// ─── ABA AGENDAMENTOS ─────────────────────────────────────────
const AgendamentosTab = ({ clinicId }) => {
  const { config, loading: lcfg, save: saveCfg } = useAgendamentosConfig(clinicId)
  const { agendamentos, loading: lag, refetch, save: saveAg, updateStatus, remove } = useAgendamentos(clinicId)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editAg, setEditAg] = useState(null)
  const showT = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),2500) }

  if (!form && config) setForm({...config})
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSaveCfg = async () => {
    setSaving(true)
    const { error } = await saveCfg(form)
    setSaving(false)
    if (error) showT('Erro: '+error.message,'error')
    else showT('Configuração salva!')
  }

  const blankAg = { whatsapp:'', nome_lead:'', data_agendamento:'', hora_agendamento:'', procedimento:'', mensagem_detectada:'', status:'pendente' }
  const [agForm, setAgForm] = useState(blankAg)
  const setAg = (k,v) => setAgForm(f=>({...f,[k]:v}))

  const handleSaveAg = async () => {
    const { error } = await saveAg(editAg ? {...agForm, id: editAg} : agForm)
    if (error) showT('Erro: '+error.message,'error')
    else { showT(editAg?'Agendamento atualizado!':'Agendamento criado!'); setShowModal(false); setAgForm(blankAg); setEditAg(null) }
  }

  const STATUS_COLOR = { pendente:'#F59E0B', confirmacao_enviada:'#10B981', cancelado:'#EF4444', compareceu:'#3B82F6', faltou:'#9CA3AF' }
  const STATUS_LABEL = { pendente:'Pendente', confirmacao_enviada:'Confirmação enviada', cancelado:'Cancelado', compareceu:'Compareceu', faltou:'Faltou' }
  const STATUS_OPTS = Object.entries(STATUS_LABEL).map(([k,v])=>({value:k,label:v}))

  const fmtDate = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—'

  if (lcfg || !form) return <Spinner />

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h3 style={{margin:0,fontSize:15,fontWeight:700,color:D.text}}>Confirmação de Agendamentos</h3>
          <p style={{margin:'4px 0 0',fontSize:13,color:D.sub}}>Envia confirmação automática para agendamentos de amanhã</p>
        </div>
        <Btn size="sm" variant={saving?'ghost':'primary'} onClick={handleSaveCfg} disabled={saving}>{saving?'Salvando...':'Salvar configuração'}</Btn>
      </div>

      <Card>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <span style={{fontSize:14,fontWeight:700,color:D.text}}>Configurações</span>
          <Toggle value={form.ativo} onChange={v=>set('ativo',v)} label="Confirmação ativa" />
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12,opacity:form.ativo?1:0.4,transition:'opacity 0.2s'}}>
          <Input label="HORÁRIO DE ENVIO" value={form.hora_envio} onChange={v=>set('hora_envio',v)} type="time" />
          <div>
            <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.06em',display:'block',marginBottom:5}}>MENSAGEM DE CONFIRMAÇÃO</label>
            <textarea value={form.mensagem_confirmacao||''} onChange={e=>set('mensagem_confirmacao',e.target.value)} rows={3}
              style={{width:'100%',border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text,resize:'vertical',boxSizing:'border-box'}} />
            <div style={{fontSize:11,color:D.sub,marginTop:4}}>Variáveis: <code style={{background:'#111',padding:'1px 5px',borderRadius:3}}>{'{nome}'}</code> <code style={{background:'#111',padding:'1px 5px',borderRadius:3}}>{'{hora}'}</code> <code style={{background:'#111',padding:'1px 5px',borderRadius:3}}>{'{data}'}</code> <code style={{background:'#111',padding:'1px 5px',borderRadius:3}}>{'{procedimento}'}</code></div>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.06em',display:'block',marginBottom:5}}>PALAVRAS-GATILHO (vírgula separando)</label>
            <input value={form.palavras_gatilho||''} onChange={e=>set('palavras_gatilho',e.target.value)}
              placeholder="agendado,remarcado,confirmei,horário confirmado"
              style={{width:'100%',border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text,boxSizing:'border-box'}} />
            <div style={{fontSize:11,color:D.sub,marginTop:4}}>Quando a equipe envia uma mensagem contendo essas palavras, o agendamento é detectado automaticamente.</div>
          </div>
        </div>
      </Card>

      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:13,fontWeight:700,color:D.text}}>Agendamentos ({agendamentos.length})</span>
          <div style={{display:'flex',gap:8}}>
            <Btn size="sm" variant="secondary" onClick={refetch}>↻ Atualizar</Btn>
            <Btn size="sm" onClick={()=>{setAgForm(blankAg);setEditAg(null);setShowModal(true)}}>+ Adicionar</Btn>
          </div>
        </div>

        {lag ? <Spinner /> : agendamentos.length===0 ? (
          <div style={{textAlign:'center',padding:32,color:D.sub,fontSize:13,border:`1px dashed ${D.border}`,borderRadius:10}}>
            Nenhum agendamento — serão detectados automaticamente quando a equipe mencionar palavras-gatilho
          </div>
        ) : (
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:700}}>
                <thead>
                  <tr style={{background:'#161616'}}>
                    {['DATA','HORA','LEAD','WHATSAPP','PROCEDIMENTO','MENSAGEM DETECTADA','STATUS','AÇÕES'].map(h=>(
                      <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.06em',borderBottom:`1px solid ${D.border}`,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agendamentos.map(ag=>(
                    <tr key={ag.id} style={{borderBottom:`1px solid ${D.border}22`}}>
                      <td style={{padding:'10px 12px',fontSize:12,color:D.text,whiteSpace:'nowrap'}}>{fmtDate(ag.data_agendamento)}</td>
                      <td style={{padding:'10px 12px',fontSize:12,color:D.text,whiteSpace:'nowrap'}}>{ag.hora_agendamento||'—'}</td>
                      <td style={{padding:'10px 12px',fontSize:12,color:D.text}}>{ag.nome_lead||'—'}</td>
                      <td style={{padding:'10px 12px',fontSize:12,color:D.text,fontFamily:'monospace'}}>{ag.whatsapp}</td>
                      <td style={{padding:'10px 12px',fontSize:12,color:D.text}}>{ag.procedimento||'—'}</td>
                      <td style={{padding:'10px 12px',fontSize:12,color:D.sub,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={ag.mensagem_detectada||''}>
                        {ag.mensagem_detectada ? `"${ag.mensagem_detectada.slice(0,60)}${ag.mensagem_detectada.length>60?'...':''}"` : '—'}
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <select value={ag.status} onChange={e=>updateStatus(ag.id,e.target.value)}
                          style={{border:`1px solid ${STATUS_COLOR[ag.status]||D.border}44`,borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:600,background:D.input,color:STATUS_COLOR[ag.status]||D.text,cursor:'pointer',fontFamily:'inherit'}}>
                          {STATUS_OPTS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:4}}>
                          <Btn size="sm" variant="secondary" onClick={()=>{setAgForm({...ag});setEditAg(ag.id);setShowModal(true)}}>Editar</Btn>
                          <Btn size="sm" variant="danger" onClick={()=>remove(ag.id)}>✕</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Modal open={showModal} onClose={()=>{setShowModal(false);setEditAg(null);setAgForm(blankAg)}} title={editAg?'Editar Agendamento':'Novo Agendamento'}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Input label="WHATSAPP" value={agForm.whatsapp} onChange={v=>setAg('whatsapp',v)} placeholder="5511999999999" />
            <Input label="NOME DO LEAD" value={agForm.nome_lead||''} onChange={v=>setAg('nome_lead',v)} placeholder="Nome completo" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Input label="DATA DO AGENDAMENTO" value={agForm.data_agendamento||''} onChange={v=>setAg('data_agendamento',v)} type="date" />
            <Input label="HORA" value={agForm.hora_agendamento||''} onChange={v=>setAg('hora_agendamento',v)} type="time" />
          </div>
          <Input label="PROCEDIMENTO" value={agForm.procedimento||''} onChange={v=>setAg('procedimento',v)} placeholder="Ex: Botox, Harmonização facial..." />
          <div>
            <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.06em',display:'block',marginBottom:5}}>MENSAGEM DETECTADA (opcional)</label>
            <textarea value={agForm.mensagem_detectada||''} onChange={e=>setAg('mensagem_detectada',e.target.value)} rows={2}
              placeholder="Mensagem original da equipe que gerou este agendamento"
              style={{width:'100%',border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text,resize:'vertical',boxSizing:'border-box'}} />
          </div>
          <Sel label="STATUS" value={agForm.status} onChange={v=>setAg('status',v)} options={STATUS_OPTS} />
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:8,borderTop:`1px solid ${D.border}`}}>
            <Btn variant="secondary" onClick={()=>{setShowModal(false);setEditAg(null);setAgForm(blankAg)}}>Cancelar</Btn>
            <Btn onClick={handleSaveAg}>{editAg?'Atualizar':'Criar agendamento'}</Btn>
          </div>
        </div>
      </Modal>

      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────
export default function AutomacoesPage({ clinic, clinics, onChangeClinic }) {
  const [tab, setTab] = useState('horario')
  const tabs = [
    { id:'horario',      label:'🕐 Horário' },
    { id:'scripts',      label:'⚡ Scripts' },
    { id:'ia',           label:'🤖 IA' },
    { id:'followup',     label:'🔁 Follow-up' },
    { id:'agendamentos', label:'📅 Agendamentos' },
    { id:'n8n',          label:'🔗 Fluxos N8n' },
    { id:'logs',         label:'📋 Logs' },
  ]
  const tabS = a => ({
    padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer', border:'none',
    borderBottom:a?`2px solid ${D.accent}`:'2px solid transparent',
    color:a?D.text:D.sub, background:'none', fontFamily:'inherit',
    transition:'all 0.15s', whiteSpace:'nowrap'
  })

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:24 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:D.text, letterSpacing:'-0.03em' }}>Automações</h1>
        <p style={{ margin:'4px 0 0', fontSize:13, color:D.sub }}>Configure o comportamento automático do WhatsApp — <strong style={{color:D.text}}>{clinic?.name || '...'}</strong></p>
      </div>

      <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:'12px 12px 0 0', borderBottom:'none', display:'flex', gap:0, overflowX:'auto' }}>
        {tabs.map(t=>(
          <button key={t.id} style={tabS(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div style={{ background:D.card, border:`1px solid ${D.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', padding:24 }}>
        {tab==='horario'      && <HorarioTab clinicId={clinic?.id} />}
        {tab==='scripts'      && <ScriptsTab clinicId={clinic?.id} />}
        {tab==='ia'           && <IATab clinicId={clinic?.id} />}
        {tab==='followup'     && <FollowUpTab clinicId={clinic?.id} />}
        {tab==='agendamentos' && <AgendamentosTab clinicId={clinic?.id} />}
        {tab==='n8n'          && <N8nTab clinicId={clinic?.id} />}
        {tab==='logs'         && <LogsTab clinicId={clinic?.id} />}
      </div>
    </div>
  )
}
