import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useHorarios, useScripts, useIAPrompt, useAutomacaoLogs } from '../hooks/useAutomacoes'

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

  const blank = { instancia:'', hora_inicio:'08:00', hora_fim:'18:00', dias_semana:[1,2,3,4,5], mensagem_fora:'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve! 😊', ativo:true }
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
                <span style={{ fontSize:13, fontWeight:700, color:D.text, fontFamily:'monospace' }}>{h.instancia}</span>
                <Badge label={h.ativo?'Ativo':'Inativo'} color={h.ativo?'#10B981':'#9CA3AF'} />
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
              <Btn size="sm" variant="secondary" onClick={()=>{ setForm({...h}); setEditando(h.id); setShowModal(true) }}>Editar</Btn>
              <Btn size="sm" variant="danger" onClick={()=>remove(h.id)}>Excluir</Btn>
            </div>
          </div>
        </Card>
      ))}

      {toast && <Toast msg={toast.msg} type={toast.type}/>}

      <Modal open={showModal} onClose={()=>setShowModal(false)} title={editando?'Editar Horário':'Nova Configuração'}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Input label="INSTÂNCIA (nome no Uazapi)" value={form.instancia} onChange={v=>set('instancia',v)} placeholder="ex: femme_principal" mono />
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

      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <label style={{ fontSize:11, fontWeight:700, color:D.sub, letterSpacing:'0.06em' }}>SYSTEM PROMPT</label>
          <span style={{ fontSize:11, color:D.sub }}>{(form.system_prompt||'').length} caracteres</span>
        </div>
        <textarea value={form.system_prompt||''} onChange={e=>set('system_prompt',e.target.value)} rows={18}
          placeholder={`Escreva aqui as instruções completas para a IA:\n\n- Quem ela é e para qual clínica trabalha\n- Tom de voz e como deve se comunicar\n- O que pode e NÃO pode responder\n- Exemplos de perguntas e respostas ideais\n- O que fazer quando não souber responder\n\nIMPORTANTE: quando precisar transferir para humano, inclua [transferir] na resposta.`}
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

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────
export default function AutomacoesPage({ clinic, clinics, onChangeClinic }) {
  const [tab, setTab] = useState('horario')
  const tabs = [
    { id:'horario', label:'🕐 Horário' },
    { id:'scripts', label:'⚡ Scripts' },
    { id:'ia',      label:'🤖 IA' },
    { id:'n8n',     label:'🔗 Fluxos N8n' },
    { id:'logs',    label:'📋 Logs' },
  ]
  const tabS = a => ({
    padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer', border:'none',
    borderBottom:a?`2px solid ${D.accent}`:'2px solid transparent',
    color:a?D.text:D.sub, background:'none', fontFamily:'inherit',
    transition:'all 0.15s', whiteSpace:'nowrap'
  })

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:D.text, letterSpacing:'-0.03em' }}>Automações</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:D.sub }}>Configure o comportamento automático do WhatsApp por clínica</p>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {(clinics||[]).map(c => {
            const isAtual = clinic?.id === c.id
            return (
              <button key={c.id}
                onClick={isAtual ? undefined : () => onChangeClinic(c)}
                disabled={!isAtual}
                style={{
                  padding:'5px 14px', borderRadius:99, fontSize:12, fontWeight:600,
                  cursor: isAtual ? 'default' : 'not-allowed',
                  border: isAtual ? `1.5px solid ${D.accent}` : `1.5px solid ${D.border}`,
                  background: isAtual ? D.accent : '#161616',
                  color: isAtual ? '#fff' : D.sub,
                  fontFamily:'inherit', transition:'all 0.15s',
                  opacity: isAtual ? 1 : 0.4,
                  pointerEvents: isAtual ? 'auto' : 'none',
                }}>
                {c.name}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:'12px 12px 0 0', borderBottom:'none', display:'flex', gap:0, overflowX:'auto' }}>
        {tabs.map(t=>(
          <button key={t.id} style={tabS(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div style={{ background:D.card, border:`1px solid ${D.border}`, borderTop:'none', borderRadius:'0 0 12px 12px', padding:24 }}>
        {tab==='horario' && <HorarioTab clinicId={clinic?.id} />}
        {tab==='scripts' && <ScriptsTab clinicId={clinic?.id} />}
        {tab==='ia'      && <IATab clinicId={clinic?.id} />}
        {tab==='n8n'     && <N8nTab clinicId={clinic?.id} />}
        {tab==='logs'    && <LogsTab clinicId={clinic?.id} />}
      </div>
    </div>
  )
}
