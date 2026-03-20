import { useState } from 'react'
import { PainelAdmin, MinhaConta } from './AdminPage'
import {
  useInfoGeral, useRotinas, useMateriais, useScriptsGuia,
  useRegras, useProcedimentos, useProfissionais, useEventos, useFAQ
} from '../hooks/useGuia'

const C = { preto:'#0F0F0F', branco:'#FFFFFF', marrom:'#8B6F47', creme:'#FAF7F2', cremeMedio:'#F0EAE0', cinza:'#6B7280', cinzaClaro:'#F3F4F6', borda:'#E5E7EB' }

// ─── BASE ─────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant='primary', size='md', disabled=false }) => {
  const v = { primary:{background:C.preto,color:C.branco,border:'none'}, secondary:{background:C.cinzaClaro,color:'#374151',border:`1px solid ${C.borda}`}, ghost:{background:'transparent',color:C.cinza,border:'1px solid transparent'}, danger:{background:'#FEF2F2',color:'#DC2626',border:'1px solid #FCA5A5'} }
  return <button onClick={onClick} disabled={disabled} style={{ borderRadius:8, fontWeight:600, cursor:disabled?'not-allowed':'pointer', transition:'all 0.15s', fontFamily:'inherit', opacity:disabled?0.5:1, fontSize:size==='sm'?12:13, padding:size==='sm'?'4px 10px':'7px 14px', ...v[variant] }}>{children}</button>
}

const Input = ({ label, value, onChange, type='text', placeholder='', rows }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>{label}</label>}
    {rows
      ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.creme, resize:'vertical', boxSizing:'border-box', width:'100%' }} />
      : <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.creme }} />
    }
  </div>
)

const Modal = ({ open, onClose, title, children, width=560 }) => {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.branco, borderRadius:16, width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 25px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${C.borda}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.cinza }}>×</button>
        </div>
        <div style={{ padding:24, overflowY:'auto', flex:1 }}>{children}</div>
      </div>
    </div>
  )
}

const Card = ({ children, style={} }) => (
  <div style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:12, padding:18, ...style }}>{children}</div>
)

const Spinner = () => <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}><div style={{ width:24, height:24, border:`3px solid ${C.borda}`, borderTopColor:C.preto, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /></div>

const EmptyState = ({ msg }) => <div style={{ textAlign:'center', padding:48, color:C.cinza, fontSize:13 }}>{msg}</div>

const SectionHeader = ({ title, onAdd, addLabel='+Adicionar' }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
    <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.preto }}>{title}</h3>
    {onAdd && <Btn size="sm" onClick={onAdd}>{addLabel}</Btn>}
  </div>
)

// ─── INFORMAÇÕES GERAIS ───────────────────────────────────────
const InfoGeral = ({ clinicId }) => {
  const { info, loading, save } = useInfoGeral(clinicId)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  if (!form && info) setForm({ ...info })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await save(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading || !form) return <Spinner />

  const campos = [
    ['clinic_name','Nome da clínica'],['responsible_professional','Profissional responsável'],
    ['whatsapp_clinic','WhatsApp da clínica'],['whatsapp_responsible','WhatsApp responsável'],
    ['website_link','Link do site'],['instagram_link','Link do Instagram'],
    ['working_days','Dias de funcionamento'],['working_hours','Horários de funcionamento'],
    ['lunch_time','Horário de almoço'],['pix_key','Chave Pix'],
    ['payment_methods','Formas de pagamento'],['specialties','Especialidades'],
  ]
  const camposTexto = [
    ['scheduling_rules','Regras de agendamento'],
    ['important_information','Informações importantes'],
    ['support_contacts','Suportes e contatos'],
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <Btn variant={saved?'secondary':'primary'} onClick={handleSave} disabled={saving}>{saving?'Salvando...':saved?'✓ Salvo!':'Salvar alterações'}</Btn>
      </div>
      <Card>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {campos.map(([k, l]) => <Input key={k} label={l.toUpperCase()} value={form[k]} onChange={v => set(k, v)} />)}
        </div>
      </Card>
      <Card>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {camposTexto.map(([k, l]) => <Input key={k} label={l.toUpperCase()} value={form[k]} onChange={v => set(k, v)} rows={3} />)}
        </div>
      </Card>
    </div>
  )
}

// ─── ROTINAS OPERACIONAIS ─────────────────────────────────────
const Rotinas = ({ clinicId }) => {
  const { rotinas, loading, save, toggleStatus, remove } = useRotinas(clinicId)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const blank = { title:'', description:'', responsible:'', deadline:'', periodicity:'unica', status:'pendente', priority:'normal', tag:'', color:'#6B7280' }
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    await save(editando ? { ...form, id: editando } : form)
    setShowModal(false); setForm(blank); setEditando(null)
  }

  const prioridadeCor = { urgente:'#EF4444', normal:'#6B7280' }
  const statusCor = { pendente:'#F59E0B', em_andamento:'#3B82F6', concluida:'#10B981' }

  if (loading) return <Spinner />
  return (
    <div>
      <SectionHeader title="Rotinas Operacionais" onAdd={() => { setForm(blank); setEditando(null); setShowModal(true) }} />
      {rotinas.length === 0 ? <EmptyState msg="Nenhuma rotina cadastrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rotinas.map(r => (
            <Card key={r.id} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <input type="checkbox" checked={r.status==='concluida'} onChange={() => toggleStatus(r.id, r.status)}
                style={{ width:18, height:18, cursor:'pointer', marginTop:2, accentColor:C.preto }} />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.preto, textDecoration:r.status==='concluida'?'line-through':'' }}>{r.title}</span>
                  <span style={{ fontSize:10, background:statusCor[r.status]+'20', color:statusCor[r.status], border:`1px solid ${statusCor[r.status]}40`, borderRadius:99, padding:'1px 8px', fontWeight:700 }}>{r.status}</span>
                  {r.priority==='urgente' && <span style={{ fontSize:10, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FCA5A5', borderRadius:99, padding:'1px 8px', fontWeight:700 }}>URGENTE</span>}
                </div>
                {r.description && <p style={{ margin:'0 0 4px', fontSize:12, color:C.cinza }}>{r.description}</p>}
                <div style={{ display:'flex', gap:12, fontSize:11, color:C.cinza }}>
                  {r.responsible && <span>👤 {r.responsible}</span>}
                  {r.deadline && <span>📅 {new Date(r.deadline).toLocaleDateString('pt-BR')}</span>}
                  {r.periodicity && r.periodicity!=='unica' && <span>🔁 {r.periodicity}</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <Btn size="sm" variant="secondary" onClick={() => { setForm({ ...r }); setEditando(r.id); setShowModal(true) }}>Editar</Btn>
                <Btn size="sm" variant="danger" onClick={() => remove(r.id)}>✕</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editando?'Editar Rotina':'Nova Rotina'}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="TÍTULO" value={form.title} onChange={v=>set('title',v)} />
          <Input label="DESCRIÇÃO" value={form.description} onChange={v=>set('description',v)} rows={2} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="RESPONSÁVEL" value={form.responsible} onChange={v=>set('responsible',v)} />
            <Input label="PRAZO" value={form.deadline} onChange={v=>set('deadline',v)} type="date" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            {[['periodicity','PERIODICIDADE',[['unica','Única'],['diaria','Diária'],['semanal','Semanal'],['quinzenal','Quinzenal'],['mensal','Mensal']]],
              ['status','STATUS',[['pendente','Pendente'],['em_andamento','Em andamento'],['concluida','Concluída']]],
              ['priority','PRIORIDADE',[['normal','Normal'],['urgente','Urgente']]]
            ].map(([k,l,opts]) => (
              <div key={k} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>{l}</label>
                <select value={form[k]||''} onChange={e=>set(k,e.target.value)} style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.creme, cursor:'pointer' }}>
                  {opts.map(([v,l2]) => <option key={v} value={v}>{l2}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.borda}` }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── MATERIAIS ────────────────────────────────────────────────
const Materiais = ({ clinicId }) => {
  const { materiais, loading, save, remove } = useMateriais(clinicId)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const blank = { title:'', description:'', link:'', tag:'' }
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => { await save(editando?{...form,id:editando}:form); setShowModal(false); setForm(blank); setEditando(null) }

  if (loading) return <Spinner />
  return (
    <div>
      <SectionHeader title="Biblioteca de Materiais" onAdd={() => { setForm(blank); setEditando(null); setShowModal(true) }} addLabel="+ Nova pasta" />
      {materiais.length === 0 ? <EmptyState msg="Nenhum material cadastrado" /> : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
          {materiais.map(m => (
            <Card key={m.id}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:28 }}>📁</div>
                <div style={{ display:'flex', gap:4 }}>
                  <Btn size="sm" variant="secondary" onClick={() => { setForm({...m}); setEditando(m.id); setShowModal(true) }}>Editar</Btn>
                  <Btn size="sm" variant="danger" onClick={() => remove(m.id)}>✕</Btn>
                </div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:C.preto, marginBottom:4 }}>{m.title}</div>
              {m.description && <div style={{ fontSize:12, color:C.cinza, marginBottom:6 }}>{m.description}</div>}
              {m.tag && <span style={{ fontSize:11, background:C.cinzaClaro, borderRadius:99, padding:'2px 8px', color:C.cinza }}>{m.tag}</span>}
              {m.link && <div style={{ marginTop:8 }}><a href={m.link} target="_blank" rel="noreferrer" style={{ fontSize:12, color:C.marrom }}>🔗 Abrir link</a></div>}
              {(m.material_files||[]).length > 0 && <div style={{ marginTop:6, fontSize:11, color:C.cinza }}>{m.material_files.length} arquivo(s)</div>}
            </Card>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editando?'Editar Material':'Novo Material'}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="TÍTULO" value={form.title} onChange={v=>set('title',v)} />
          <Input label="DESCRIÇÃO" value={form.description} onChange={v=>set('description',v)} rows={2} />
          <Input label="LINK" value={form.link} onChange={v=>set('link',v)} placeholder="https://..." />
          <Input label="ETIQUETA" value={form.tag} onChange={v=>set('tag',v)} placeholder="Ex: Resultados, Novo..." />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.borda}` }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── SCRIPTS ──────────────────────────────────────────────────
const Scripts = ({ clinicId }) => {
  const { scripts, loading, save, remove } = useScriptsGuia(clinicId)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const blank = { occasion:'', shortcut:'', notes:'', respostas:[{ response_text:'' }], links:[] }
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addResposta = () => set('respostas', [...(form.respostas||[]), { response_text:'' }])
  const removeResposta = i => set('respostas', (form.respostas||[]).filter((_,idx)=>idx!==i))
  const setResposta = (i, v) => set('respostas', (form.respostas||[]).map((r,idx)=>idx===i?{...r,response_text:v}:r))
  const addLink = () => set('links', [...(form.links||[]), { link_title:'', link_url:'', notes:'' }])
  const removeLink = i => set('links', (form.links||[]).filter((_,idx)=>idx!==i))
  const setLink = (i, k, v) => set('links', (form.links||[]).map((l,idx)=>idx===i?{...l,[k]:v}:l))

  const handleSave = async () => { await save(editando?{...form,id:editando}:form); setShowModal(false); setForm(blank); setEditando(null) }

  if (loading) return <Spinner />
  return (
    <div>
      <SectionHeader title="Scripts" onAdd={() => { setForm(blank); setEditando(null); setShowModal(true) }} />
      {scripts.length === 0 ? <EmptyState msg="Nenhum script cadastrado" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {scripts.map(s => (
            <Card key={s.id} style={{ cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }} onClick={() => setExpandido(expandido===s.id?null:s.id)}>
                <span style={{ fontSize:14 }}>{expandido===s.id?'▼':'▶'}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.preto }}>{s.occasion}</span>
                  {s.shortcut && <span style={{ fontSize:11, marginLeft:8, background:C.cinzaClaro, borderRadius:6, padding:'1px 8px', color:C.cinza, fontFamily:'monospace' }}>{s.shortcut}</span>}
                </div>
                <div style={{ display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
                  <Btn size="sm" variant="secondary" onClick={() => { setForm({...s}); setEditando(s.id); setShowModal(true) }}>Editar</Btn>
                  <Btn size="sm" variant="danger" onClick={() => remove(s.id)}>✕</Btn>
                </div>
              </div>
              {expandido === s.id && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.borda}` }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                    {(s.respostas||[]).map((r,i) => (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div style={{ width:20, height:20, borderRadius:6, background:C.preto, color:C.branco, fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>{i+1}</div>
                        <span style={{ fontSize:13, color:'#374151' }}>{r.response_text}</span>
                      </div>
                    ))}
                  </div>
                  {(s.links||[]).length > 0 && (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {s.links.map((l,i) => <a key={i} href={l.link_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:C.marrom, background:C.creme, borderRadius:6, padding:'3px 10px', border:`1px solid ${C.cremeMedio}` }}>🔗 {l.link_title||'Link'}</a>)}
                    </div>
                  )}
                  {s.notes && <p style={{ margin:'10px 0 0', fontSize:12, color:C.cinza, fontStyle:'italic' }}>{s.notes}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editando?'Editar Script':'Novo Script'} width={640}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="OCASIÃO" value={form.occasion} onChange={v=>set('occasion',v)} placeholder="Ex: Semana da Mulher" />
            <Input label="ATALHO" value={form.shortcut} onChange={v=>set('shortcut',v)} placeholder="Ex: /semana" />
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>RESPOSTAS (em sequência)</label>
              <Btn size="sm" variant="secondary" onClick={addResposta}>+ Adicionar</Btn>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(form.respostas||[]).map((r,i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:C.preto, color:C.branco, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:6 }}>{i+1}</div>
                  <textarea value={r.response_text} onChange={e=>setResposta(i,e.target.value)} rows={2} style={{ flex:1, border:`1px solid ${C.borda}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.creme, resize:'vertical' }} />
                  <button onClick={() => removeResposta(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#D1D5DB', fontSize:16, marginTop:4 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>LINKS</label>
              <Btn size="sm" variant="secondary" onClick={addLink}>+ Link</Btn>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(form.links||[]).map((l,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'center' }}>
                  <input value={l.link_title} onChange={e=>setLink(i,'link_title',e.target.value)} placeholder="Título do link" style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'7px 10px', fontSize:12, outline:'none', fontFamily:'inherit', background:C.creme }} />
                  <input value={l.link_url} onChange={e=>setLink(i,'link_url',e.target.value)} placeholder="https://..." style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'7px 10px', fontSize:12, outline:'none', fontFamily:'inherit', background:C.creme }} />
                  <button onClick={() => removeLink(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#D1D5DB', fontSize:16 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <Input label="OBSERVAÇÕES" value={form.notes} onChange={v=>set('notes',v)} rows={2} />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.borda}` }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── SEÇÃO GENÉRICA (Regras, Procedimentos, Profissionais, Eventos, FAQ) ──
const SecaoGenerica = ({ titulo, dados, loading, onSave, onRemove, campos, expandivel=false }) => {
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const blank = Object.fromEntries(campos.map(c => [c.key, c.default||'']))
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSave = async () => { await onSave(editando?{...form,id:editando}:form); setShowModal(false); setForm(blank); setEditando(null) }

  if (loading) return <Spinner />
  return (
    <div>
      <SectionHeader title={titulo} onAdd={() => { setForm(blank); setEditando(null); setShowModal(true) }} />
      {dados.length === 0 ? <EmptyState msg={`Nenhum(a) ${titulo.toLowerCase()} cadastrado(a)`} /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {dados.map(item => {
            const labelCampo = campos[0]
            const subCampo = campos[1]
            return (
              <Card key={item.id}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  {expandivel && <span style={{ cursor:'pointer', fontSize:13, marginTop:2 }} onClick={() => setExpandido(expandido===item.id?null:item.id)}>{expandido===item.id?'▼':'▶'}</span>}
                  {item.color && <div style={{ width:14, height:14, borderRadius:'50%', background:item.color, flexShrink:0, marginTop:3 }} />}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.preto }}>{item[labelCampo.key]}</div>
                    {subCampo && item[subCampo.key] && <div style={{ fontSize:12, color:C.cinza, marginTop:2 }}>{Array.isArray(item[subCampo.key]) ? item[subCampo.key].join(', ') : item[subCampo.key]}</div>}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <Btn size="sm" variant="secondary" onClick={() => { setForm({...item}); setEditando(item.id); setShowModal(true) }}>Editar</Btn>
                    <Btn size="sm" variant="danger" onClick={() => onRemove(item.id)}>✕</Btn>
                  </div>
                </div>
                {expandivel && expandido === item.id && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.borda}` }}>
                    {campos.slice(2).map(c => item[c.key] && (
                      <div key={c.key} style={{ marginBottom:8 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em', marginBottom:3 }}>{c.label.toUpperCase()}</div>
                        <div style={{ fontSize:13, color:'#374151' }}>{Array.isArray(item[c.key]) ? item[c.key].join(', ') : item[c.key]}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editando?`Editar`:`Novo(a)`} width={580}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {campos.map(c => (
            <Input key={c.key} label={c.label.toUpperCase()} value={Array.isArray(form[c.key]) ? form[c.key].join(', ') : form[c.key]||''}
              onChange={v => set(c.key, c.array ? v.split(',').map(x=>x.trim()).filter(Boolean) : v)}
              rows={c.rows} placeholder={c.placeholder||''} />
          ))}
          {campos.some(c => c.key === 'color') && (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.cinza }}>COR</label>
              <input type="color" value={form.color||'#6B7280'} onChange={e=>set('color',e.target.value)} style={{ width:36, height:36, border:`1px solid ${C.borda}`, borderRadius:8, cursor:'pointer', padding:2 }} />
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.borda}` }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL DO GUIA ─────────────────────────────────
const SECOES = [
  { id:'crm',          label:'CRM',                  icon:'📊' },
  { id:'automacoes',   label:'Automações',            icon:'⚡' },
  { id:'info',         label:'Informações Gerais',    icon:'ℹ️' },
  { id:'rotinas',      label:'Rotinas Operacionais',  icon:'✅' },
  { id:'materiais',    label:'Biblioteca de Materiais',icon:'📁' },
  { id:'scripts',      label:'Scripts',               icon:'💬' },
  { id:'regras',       label:'Regras Gerais',         icon:'📋' },
  { id:'procedimentos',label:'Procedimentos',         icon:'🔬' },
  { id:'profissionais',label:'Agenda e Profissionais',icon:'👩‍⚕️' },
  { id:'eventos',      label:'Eventos e Campanhas',   icon:'📣' },
  { id:'faq',          label:'Perguntas Frequentes',  icon:'❓' },
  { id:'admin',        label:'Painel Admin',          icon:'🛡️', adminOnly:true },
  { id:'conta',        label:'Minha Conta',           icon:'👤' },
]

export default function GuiaPage({ clinic, onVoltar, CRMComponent, AutomacoesComponent, AdminComponent, ContaComponent, currentUser }) {
  const [secao, setSecao] = useState('crm')
  const [busca, setBusca] = useState('')
  const [sidebarAberta, setSidebarAberta] = useState(true)

  const { regras, loading: lRegras, save: sRegras, remove: rRegras } = useRegras(clinic.id)
  const { procedimentos, loading: lProc, save: sProc, remove: rProc } = useProcedimentos(clinic.id)
  const { profissionais, loading: lProf, save: sProf, remove: rProf } = useProfissionais(clinic.id)
  const { eventos, loading: lEv, save: sEv, remove: rEv } = useEventos(clinic.id)
  const { faqs, loading: lFaq, save: sFaq, remove: rFaq } = useFAQ(clinic.id)

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin_clinica'
  const secoesFiltradas = SECOES.filter(s => (!s.adminOnly || isAdmin) && s.label.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarAberta ? 240 : 56, background:C.preto, display:'flex', flexDirection:'column', transition:'width 0.2s', flexShrink:0, overflow:'hidden' }}>
        {/* Header sidebar */}
        <div style={{ padding:'16px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', gap:10 }}>
          {clinic.icon_url
            ? <img src={clinic.icon_url} style={{ width:28, height:28, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
            : <div style={{ width:28, height:28, borderRadius:8, background:C.marrom, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:C.branco, flexShrink:0 }}>{clinic.name[0]}</div>
          }
          {sidebarAberta && <span style={{ fontSize:13, fontWeight:700, color:C.branco, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{clinic.name}</span>}
          <button onClick={() => setSidebarAberta(s => !s)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:16, flexShrink:0 }}>
            {sidebarAberta ? '◀' : '▶'}
          </button>
        </div>

        {/* Voltar */}
        <button onClick={onVoltar} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', fontSize:12, borderBottom:'1px solid rgba(255,255,255,0.08)', textAlign:'left' }}>
          <span>←</span>{sidebarAberta && <span>Central</span>}
        </button>

        {/* Busca */}
        {sidebarAberta && (
          <div style={{ padding:'10px 14px' }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar seção..." style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 10px', fontSize:12, color:C.branco, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
          </div>
        )}

        {/* Navegação */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 8px' }}>
          {secoesFiltradas.map(s => (
            <button key={s.id} onClick={() => setSecao(s.id)}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:8, background: secao===s.id ? 'rgba(255,255,255,0.1)' : 'transparent', border:'none', cursor:'pointer', color: secao===s.id ? C.branco : 'rgba(255,255,255,0.5)', fontSize:13, fontWeight: secao===s.id ? 600 : 400, fontFamily:'inherit', textAlign:'left', transition:'all 0.15s', marginBottom:2 }}>
              <span style={{ fontSize:15, flexShrink:0 }}>{s.icon}</span>
              {sidebarAberta && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.label}</span>}
            </button>
          ))}
        </div>

        {/* Label guia */}
        {sidebarAberta && (
          <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em' }}>GUIA INTERATIVO</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>Pluz Tech</div>
          </div>
        )}
      </div>

      {/* Conteúdo principal */}
      <div style={{ flex:1, overflowY:'auto', background:'#F7F7F7' }}>
        {/* Top bar */}
        <div style={{ background:C.branco, borderBottom:`1px solid ${C.borda}`, padding:'12px 28px', display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:10 }}>
          <span style={{ fontSize:18 }}>{SECOES.find(s=>s.id===secao)?.icon}</span>
          <span style={{ fontSize:15, fontWeight:700, color:C.preto }}>{SECOES.find(s=>s.id===secao)?.label}</span>
          <span style={{ color:'#D1D5DB', margin:'0 4px' }}>·</span>
          <span style={{ fontSize:13, color:C.cinza }}>{clinic.name}</span>
        </div>

        <div style={{ padding:28 }}>
          {secao === 'crm'          && CRMComponent}
          {secao === 'automacoes'   && AutomacoesComponent}
          {secao === 'info'         && <InfoGeral clinicId={clinic.id} />}
          {secao === 'rotinas'      && <Rotinas clinicId={clinic.id} />}
          {secao === 'materiais'    && <Materiais clinicId={clinic.id} />}
          {secao === 'scripts'      && <Scripts clinicId={clinic.id} />}
          {secao === 'regras'       && <SecaoGenerica titulo="Regras Gerais" dados={regras} loading={lRegras} onSave={sRegras} onRemove={rRegras} expandivel campos={[{key:'title',label:'Título'},{key:'content',label:'Conteúdo',rows:3},{key:'exceptions',label:'Exceções',rows:2},{key:'notes',label:'Observações',rows:2}]} />}
          {secao === 'procedimentos'&& <SecaoGenerica titulo="Procedimentos" dados={procedimentos} loading={lProc} onSave={sProc} onRemove={rProc} expandivel campos={[{key:'name',label:'Nome'},{key:'price',label:'Valor (R$)'},{key:'duration_minutes',label:'Duração (min)'},{key:'professionals',label:'Profissionais',array:true,placeholder:'Sep. por vírgula'},{key:'schedule_days',label:'Dias de agenda',array:true,placeholder:'Sep. por vírgula'},{key:'benefits',label:'Benefícios',rows:2},{key:'contraindications',label:'Contraindicações',rows:2},{key:'notes',label:'Observações',rows:2},{key:'link',label:'Link'},{key:'color',label:'Cor'}]} />}
          {secao === 'profissionais'&& <SecaoGenerica titulo="Agenda e Profissionais" dados={profissionais} loading={lProf} onSave={sProf} onRemove={rProf} expandivel campos={[{key:'name',label:'Nome'},{key:'specialties',label:'Especialidades',array:true,placeholder:'Sep. por vírgula'},{key:'locations',label:'Locais',array:true,placeholder:'Sep. por vírgula'},{key:'working_days',label:'Dias de atendimento',array:true,placeholder:'Sep. por vírgula'},{key:'non_working_days',label:'Dias que NÃO atende',array:true,placeholder:'Sep. por vírgula'},{key:'reminders',label:'Lembretes',rows:2},{key:'notes',label:'Observações',rows:2},{key:'color',label:'Cor'}]} />}
          {secao === 'eventos'      && <SecaoGenerica titulo="Eventos e Campanhas" dados={eventos} loading={lEv} onSave={sEv} onRemove={rEv} expandivel campos={[{key:'name',label:'Nome'},{key:'type',label:'Tipo'},{key:'dates',label:'Datas',array:true,placeholder:'Sep. por vírgula'},{key:'hours',label:'Horários'},{key:'objective',label:'Objetivo',rows:2},{key:'procedures',label:'Procedimentos',array:true,placeholder:'Sep. por vírgula'},{key:'special_conditions',label:'Condições especiais',rows:2},{key:'values',label:'Valores'},{key:'notes',label:'Observações',rows:2}]} />}
          {secao === 'faq'          && <SecaoGenerica titulo="Perguntas Frequentes" dados={faqs} loading={lFaq} onSave={sFaq} onRemove={rFaq} expandivel campos={[{key:'question',label:'Pergunta'},{key:'answer',label:'Resposta',rows:3},{key:'link',label:'Link'},{key:'notes',label:'Observações',rows:2}]} />}
          {secao === 'admin'        && AdminComponent}
          {secao === 'conta'        && ContaComponent}
        </div>
      </div>
    </div>
  )
}
