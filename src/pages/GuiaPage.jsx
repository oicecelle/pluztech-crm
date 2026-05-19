import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  useInfoGeral, useRotinas, useMateriais, useScriptsGuia,
  useRegras, useProcedimentos, useProfissionais, useEventos, useFAQ
} from '../hooks/useGuia'

// ─── PALETA DARK ────────────────────────────────────────────
const C = {
  bg:'#0F0F0F', card:'#1a1a1a', cardAlt:'#161616',
  text:'#FAF7F2', sub:'#9ca3af', accent:'#8B6F47', accentHover:'#a07d54',
  border:'#2a2a2a', borderAccent:'rgba(139,111,71,0.2)',
  input:'#222222', success:'#22c55e', danger:'#ef4444',
  marrom:'#8B6F47', creme:'#FAF7F2',
}

// ─── BASE ─────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant='primary', size='md', disabled=false }) => {
  const v = {
    primary:{background:C.accent,color:'#fff',border:'none'},
    secondary:{background:C.card,color:C.text,border:`1px solid ${C.border}`},
    ghost:{background:'transparent',color:C.sub,border:'1px solid transparent'},
    danger:{background:C.danger+'18',color:C.danger,border:`1px solid ${C.danger}44`},
    success:{background:C.success+'18',color:C.success,border:`1px solid ${C.success}44`},
  }
  return <button onClick={onClick} disabled={disabled} style={{ borderRadius:8, fontWeight:600, cursor:disabled?'not-allowed':'pointer', transition:'all 0.15s', fontFamily:'inherit', opacity:disabled?0.5:1, fontSize:size==='sm'?12:13, padding:size==='sm'?'4px 10px':'7px 14px', ...v[variant] }}>{children}</button>
}

const Input = ({ label, value, onChange, type='text', placeholder='', rows }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:'0.05em' }}>{label}</label>}
    {rows
      ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.input, color:C.text, resize:'vertical', boxSizing:'border-box', width:'100%' }} />
      : <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.input, color:C.text }} />
    }
  </div>
)

const Modal = ({ open, onClose, title, children, width=560 }) => {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.sub }}>×</button>
        </div>
        <div style={{ padding:24, overflowY:'auto', flex:1 }}>{children}</div>
      </div>
    </div>
  )
}

const Card = ({ children, style={} }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:18, ...style }}>{children}</div>
)

const Spinner = () => <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}><div style={{ width:24, height:24, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /></div>

const EmptyState = ({ msg }) => <div style={{ textAlign:'center', padding:48, color:C.sub, fontSize:13 }}>{msg}</div>

const SectionHeader = ({ title, onAdd, addLabel='+Adicionar' }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
    <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{title}</h3>
    {onAdd && <Btn size="sm" onClick={onAdd}>{addLabel}</Btn>}
  </div>
)

// ─── INFORMAÇÕES GERAIS (com múltiplos locais) ────────────────
const InfoGeral = ({ clinicId }) => {
  const { info, loading, save } = useInfoGeral(clinicId)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  if (!form && info) setForm({ ...info, locais: info.locais || [] })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await save(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Locais
  const addLocal = () => set('locais', [...(form.locais||[]), { nome:'', endereco:'', bairro:'', cidade:'', cep:'', referencia:'' }])
  const removeLocal = (i) => set('locais', (form.locais||[]).filter((_,idx)=>idx!==i))
  const setLocal = (i, k, v) => set('locais', (form.locais||[]).map((l,idx)=>idx===i?{...l,[k]:v}:l))

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
        <Btn variant={saved?'success':'primary'} onClick={handleSave} disabled={saving}>{saving?'Salvando...':saved?'✓ Salvo!':'Salvar alterações'}</Btn>
      </div>
      <Card>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {campos.map(([k, l]) => <Input key={k} label={l.toUpperCase()} value={form[k]} onChange={v => set(k, v)} />)}
        </div>
      </Card>

      {/* Múltiplos locais */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>Locais da Clínica</div>
            <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>Adicione todos os endereços e unidades</div>
          </div>
          <Btn size="sm" onClick={addLocal}>+ Adicionar local</Btn>
        </div>
        {(form.locais||[]).length === 0 ? (
          <div style={{ textAlign:'center', padding:24, color:C.sub, fontSize:13, border:`1px dashed ${C.border}`, borderRadius:8 }}>
            Nenhum local cadastrado. Clique em "+ Adicionar local" para começar.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {(form.locais||[]).map((loc, i) => (
              <div key={i} style={{ background:C.cardAlt, borderRadius:10, padding:16, border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:C.accent }}>Local {i+1}</span>
                  <button onClick={()=>removeLocal(i)} style={{ background:'none', border:'none', cursor:'pointer', color:C.danger, fontSize:16, lineHeight:1 }}>×</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <Input label="NOME DO LOCAL" value={loc.nome} onChange={v=>setLocal(i,'nome',v)} placeholder="Ex: Unidade Centro" />
                  <Input label="ENDEREÇO COMPLETO" value={loc.endereco} onChange={v=>setLocal(i,'endereco',v)} placeholder="Rua, número" />
                  <Input label="BAIRRO" value={loc.bairro} onChange={v=>setLocal(i,'bairro',v)} />
                  <Input label="CIDADE" value={loc.cidade} onChange={v=>setLocal(i,'cidade',v)} />
                  <Input label="CEP" value={loc.cep} onChange={v=>setLocal(i,'cep',v)} placeholder="00000-000" />
                  <Input label="PONTO DE REFERÊNCIA" value={loc.referencia} onChange={v=>setLocal(i,'referencia',v)} />
                </div>
              </div>
            ))}
          </div>
        )}
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
  const blank = { title:'', description:'', responsible:'', deadline:'', periodicity:'unica', status:'pendente', priority:'normal', tag:'', color:'#8B6F47' }
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    await save(editando ? { ...form, id: editando } : form)
    setShowModal(false); setForm(blank); setEditando(null)
  }

  const statusCor = { pendente:'#F59E0B', em_andamento:'#3B82F6', concluida:C.success }

  if (loading) return <Spinner />
  return (
    <div>
      <SectionHeader title="Rotinas Operacionais" onAdd={() => { setForm(blank); setEditando(null); setShowModal(true) }} />
      {rotinas.length === 0 ? <EmptyState msg="Nenhuma rotina cadastrada" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {rotinas.map(r => (
            <Card key={r.id} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <input type="checkbox" checked={r.status==='concluida'} onChange={() => toggleStatus(r.id, r.status)}
                style={{ width:18, height:18, cursor:'pointer', marginTop:2, accentColor:C.accent }} />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.text, textDecoration:r.status==='concluida'?'line-through':'', opacity:r.status==='concluida'?0.5:1 }}>{r.title}</span>
                  <span style={{ fontSize:10, background:statusCor[r.status]+'20', color:statusCor[r.status], border:`1px solid ${statusCor[r.status]}40`, borderRadius:99, padding:'1px 8px', fontWeight:700 }}>{r.status}</span>
                  {r.priority==='urgente' && <span style={{ fontSize:10, background:C.danger+'18', color:C.danger, border:`1px solid ${C.danger}44`, borderRadius:99, padding:'1px 8px', fontWeight:700 }}>URGENTE</span>}
                </div>
                {r.description && <p style={{ margin:'0 0 4px', fontSize:12, color:C.sub }}>{r.description}</p>}
                <div style={{ display:'flex', gap:12, fontSize:11, color:C.sub }}>
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
                <label style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:'0.05em' }}>{l}</label>
                <select value={form[k]||''} onChange={e=>set(k,e.target.value)} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.input, color:C.text, cursor:'pointer' }}>
                  {opts.map(([v,l2]) => <option key={v} value={v}>{l2}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── ÍCONE POR TIPO DE ARQUIVO ────────────────────────────────
const fileIcon = (type) => {
  if (!type) return '📎'
  if (type.startsWith('image')) return '🖼️'
  if (type === 'application/pdf') return '📄'
  if (type.startsWith('video')) return '🎬'
  if (type.startsWith('audio')) return '🎵'
  return '📎'
}

// ─── UPLOAD ARQUIVO (Supabase Storage) ───────────────────────
const FileUploader = ({ materialId, onUploaded }) => {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file || !materialId) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `mat-${materialId}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('clinic-files').upload(path, file, { upsert: true })
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('clinic-files').getPublicUrl(path)
      const url = urlData?.publicUrl
      await supabase.from('material_files').insert({
        material_id: materialId,
        file_url: url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      })
      onUploaded()
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:8, border:`1px solid ${C.accent}44`, background:C.accent+'18', color:C.accent, cursor:'pointer', fontSize:12, fontWeight:600 }}>
      {uploading ? 'Enviando...' : '+ Arquivo'}
      <input type="file" accept="image/*,application/pdf,video/*,audio/*" onChange={handleFile} style={{ display:'none' }} disabled={uploading} />
    </label>
  )
}

// ─── MATERIAIS ────────────────────────────────────────────────
const Materiais = ({ clinicId }) => {
  const { materiais, loading, save, remove, refetch } = useMateriais(clinicId)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const blank = { title:'', description:'', link:'', tag:'' }
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    await save(editando?{...form,id:editando}:form)
    setShowModal(false); setForm(blank); setEditando(null)
  }

  if (loading) return <Spinner />
  return (
    <div>
      <SectionHeader title="Biblioteca de Materiais" onAdd={() => { setForm(blank); setEditando(null); setShowModal(true) }} addLabel="+ Nova pasta" />
      {materiais.length === 0 ? <EmptyState msg="Nenhum material cadastrado" /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {materiais.map(m => {
            const files = m.material_files || []
            const expanded = expandido === m.id
            return (
              <Card key={m.id} style={{ cursor:'default' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:26 }}>📁</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{m.title}</div>
                      {m.tag && <span style={{ fontSize:11, background:C.accent+'18', borderRadius:99, padding:'1px 8px', color:C.accent }}>{m.tag}</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    <Btn size="sm" variant="secondary" onClick={() => { setForm({...m}); setEditando(m.id); setShowModal(true) }}>Editar</Btn>
                    <Btn size="sm" variant="danger" onClick={() => remove(m.id)}>✕</Btn>
                  </div>
                </div>
                {m.description && <div style={{ fontSize:12, color:C.sub, marginBottom:8 }}>{m.description}</div>}
                {m.link && <div style={{ marginBottom:8 }}><a href={m.link} target="_blank" rel="noreferrer" style={{ fontSize:12, color:C.accent }}>🔗 Abrir link</a></div>}

                {/* Arquivos */}
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <button onClick={()=>setExpandido(expanded?null:m.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:C.sub, fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                      {expanded?'▼':'▶'} {files.length} arquivo{files.length!==1?'s':''}
                    </button>
                    <FileUploader materialId={m.id} onUploaded={refetch} />
                  </div>
                  {expanded && files.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {files.map(f => (
                        <a key={f.id} href={f.file_url} target="_blank" rel="noreferrer"
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:8, background:C.cardAlt, border:`1px solid ${C.border}`, textDecoration:'none', transition:'all 0.15s' }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                          <span style={{ fontSize:16 }}>{fileIcon(f.file_type)}</span>
                          <div style={{ flex:1, overflow:'hidden' }}>
                            <div style={{ fontSize:12, color:C.text, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.file_name}</div>
                            {f.file_size && <div style={{ fontSize:10, color:C.sub }}>{(f.file_size/1024).toFixed(1)} KB</div>}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editando?'Editar Material':'Novo Material'}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="TÍTULO" value={form.title} onChange={v=>set('title',v)} />
          <Input label="DESCRIÇÃO" value={form.description} onChange={v=>set('description',v)} rows={2} />
          <Input label="LINK" value={form.link} onChange={v=>set('link',v)} placeholder="https://..." />
          <Input label="ETIQUETA" value={form.tag} onChange={v=>set('tag',v)} placeholder="Ex: Resultados, Novo..." />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
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
  const { scripts, loading, save, remove, refetch } = useScriptsGuia(clinicId)
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

  // Upload de arquivo para script
  const ScriptFileUploader = ({ scriptId }) => {
    const [uploading, setUploading] = useState(false)
    const handleFile = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      setUploading(true)
      const ext = file.name.split('.').pop()
      const path = `scr-${scriptId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('clinic-files').upload(path, file, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('clinic-files').getPublicUrl(path)
        await supabase.from('script_links').insert({ script_id: scriptId, link_url: urlData?.publicUrl, link_title: file.name, notes: file.type, ordem: 99 })
        refetch()
      }
      setUploading(false)
      e.target.value = ''
    }
    return (
      <label style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:6, border:`1px solid ${C.accent}44`, background:C.accent+'18', color:C.accent, cursor:'pointer', fontSize:11, fontWeight:600 }}>
        {uploading ? 'Enviando...' : '📎 Arquivo'}
        <input type="file" accept="image/*,application/pdf,video/*,audio/*" onChange={handleFile} style={{ display:'none' }} disabled={uploading} />
      </label>
    )
  }

  if (loading) return <Spinner />
  return (
    <div>
      <SectionHeader title="Scripts" onAdd={() => { setForm(blank); setEditando(null); setShowModal(true) }} />
      {scripts.length === 0 ? <EmptyState msg="Nenhum script cadastrado" /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {scripts.map(s => (
            <Card key={s.id} style={{ cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }} onClick={() => setExpandido(expandido===s.id?null:s.id)}>
                <span style={{ fontSize:14, color:C.sub }}>{expandido===s.id?'▼':'▶'}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{s.occasion}</span>
                  {s.shortcut && <span style={{ fontSize:11, marginLeft:8, background:C.input, borderRadius:6, padding:'1px 8px', color:C.sub, fontFamily:'monospace' }}>{s.shortcut}</span>}
                </div>
                <div style={{ display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
                  <ScriptFileUploader scriptId={s.id} />
                  <Btn size="sm" variant="secondary" onClick={() => { setForm({...s}); setEditando(s.id); setShowModal(true) }}>Editar</Btn>
                  <Btn size="sm" variant="danger" onClick={() => remove(s.id)}>✕</Btn>
                </div>
              </div>
              {expandido === s.id && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                    {(s.respostas||[]).map((r,i) => (
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <div style={{ width:20, height:20, borderRadius:6, background:C.accent, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>{i+1}</div>
                        <span style={{ fontSize:13, color:C.text, lineHeight:1.5 }}>{r.response_text}</span>
                      </div>
                    ))}
                  </div>
                  {(s.links||[]).length > 0 && (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {s.links.map((l,i) => (
                        <a key={i} href={l.link_url} target="_blank" rel="noreferrer"
                          style={{ fontSize:12, color:C.accent, background:C.accent+'18', borderRadius:6, padding:'3px 10px', border:`1px solid ${C.accent}33`, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                          {fileIcon(l.notes)} {l.link_title||'Link'}
                        </a>
                      ))}
                    </div>
                  )}
                  {s.notes && <p style={{ margin:'10px 0 0', fontSize:12, color:C.sub, fontStyle:'italic' }}>{s.notes}</p>}
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
              <label style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:'0.05em' }}>RESPOSTAS</label>
              <Btn size="sm" variant="secondary" onClick={addResposta}>+ Adicionar</Btn>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(form.respostas||[]).map((r,i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:C.accent, color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:6 }}>{i+1}</div>
                  <textarea value={r.response_text} onChange={e=>setResposta(i,e.target.value)} rows={2} style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.input, color:C.text, resize:'vertical' }} />
                  <button onClick={() => removeResposta(i)} style={{ background:'none', border:'none', cursor:'pointer', color:C.sub, fontSize:16, marginTop:4 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:'0.05em' }}>LINKS</label>
              <Btn size="sm" variant="secondary" onClick={addLink}>+ Link</Btn>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(form.links||[]).map((l,i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'center' }}>
                  <input value={l.link_title} onChange={e=>setLink(i,'link_title',e.target.value)} placeholder="Título" style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', fontSize:12, outline:'none', fontFamily:'inherit', background:C.input, color:C.text }} />
                  <input value={l.link_url} onChange={e=>setLink(i,'link_url',e.target.value)} placeholder="https://..." style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:'7px 10px', fontSize:12, outline:'none', fontFamily:'inherit', background:C.input, color:C.text }} />
                  <button onClick={() => removeLink(i)} style={{ background:'none', border:'none', cursor:'pointer', color:C.sub, fontSize:16 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <Input label="OBSERVAÇÕES" value={form.notes} onChange={v=>set('notes',v)} rows={2} />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── SEÇÃO GENÉRICA ────────────────────────────────────────────
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
                  {expandivel && <span style={{ cursor:'pointer', fontSize:13, marginTop:2, color:C.sub }} onClick={() => setExpandido(expandido===item.id?null:item.id)}>{expandido===item.id?'▼':'▶'}</span>}
                  {item.color && <div style={{ width:14, height:14, borderRadius:'50%', background:item.color, flexShrink:0, marginTop:3 }} />}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{item[labelCampo.key]}</div>
                    {subCampo && item[subCampo.key] && <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>{Array.isArray(item[subCampo.key]) ? item[subCampo.key].join(', ') : item[subCampo.key]}</div>}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <Btn size="sm" variant="secondary" onClick={() => { setForm({...item}); setEditando(item.id); setShowModal(true) }}>Editar</Btn>
                    <Btn size="sm" variant="danger" onClick={() => onRemove(item.id)}>✕</Btn>
                  </div>
                </div>
                {expandivel && expandido === item.id && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                    {campos.slice(2).map(c => item[c.key] && (
                      <div key={c.key} style={{ marginBottom:8 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:'0.05em', marginBottom:3 }}>{c.label.toUpperCase()}</div>
                        <div style={{ fontSize:13, color:C.text }}>{Array.isArray(item[c.key]) ? item[c.key].join(', ') : item[c.key]}</div>
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
              <label style={{ fontSize:11, fontWeight:700, color:C.sub }}>COR</label>
              <input type="color" value={form.color||'#8B6F47'} onChange={e=>set('color',e.target.value)} style={{ width:36, height:36, border:`1px solid ${C.border}`, borderRadius:8, cursor:'pointer', padding:2, background:C.input }} />
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── PROCEDIMENTOS (card redesenhado) ────────────────────────
const ProcedimentosSection = ({ clinicId }) => {
  const { procedimentos, loading, save, remove } = useProcedimentos(clinicId)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const blank = { name:'', price:'', duration_minutes:'', professionals:'', schedule_days:'', benefits:'', contraindications:'', notes:'', link:'', color:'#8B6F47' }
  const [form, setForm] = useState(blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const payload = { ...form }
    if (typeof payload.professionals === 'string') payload.professionals = payload.professionals.split(',').map(x=>x.trim()).filter(Boolean)
    if (typeof payload.schedule_days === 'string') payload.schedule_days = payload.schedule_days.split(',').map(x=>x.trim()).filter(Boolean)
    await save(editando ? { ...payload, id: editando } : payload)
    setShowModal(false); setForm(blank); setEditando(null)
  }

  if (loading) return <Spinner />
  return (
    <div>
      <SectionHeader title="Procedimentos" onAdd={() => { setForm(blank); setEditando(null); setShowModal(true) }} />
      {procedimentos.length === 0 ? <EmptyState msg="Nenhum procedimento cadastrado" /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {procedimentos.map(p => {
            const profs = Array.isArray(p.professionals) ? p.professionals : (p.professionals ? String(p.professionals).split(',').map(x=>x.trim()) : [])
            const isExpanded = expandido === p.id
            return (
              <div key={p.id} onClick={()=>setExpandido(isExpanded?null:p.id)}
                style={{ background:C.card, border:`1px solid ${isExpanded?C.accent:C.border}`, borderRadius:14, overflow:'hidden', cursor:'pointer', transition:'all 0.2s', boxShadow:isExpanded?`0 4px 24px ${C.accent}22`:'' }}
                onMouseEnter={e=>{if(!isExpanded){e.currentTarget.style.borderColor=C.accent+'88';e.currentTarget.style.transform='translateY(-2px)'}}}
                onMouseLeave={e=>{if(!isExpanded){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform=''}}}>

                {/* Topo colorido */}
                <div style={{ height:4, background:p.color||C.accent }} />

                <div style={{ padding:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:4 }}>{p.name}</div>
                      {p.price && (
                        <div style={{ fontSize:18, fontWeight:700, color:C.accent }}>
                          R$ {Number(p.price).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:4 }} onClick={e=>e.stopPropagation()}>
                      <Btn size="sm" variant="secondary" onClick={()=>{ setForm({...p, professionals: Array.isArray(p.professionals)?p.professionals.join(', '):p.professionals||'', schedule_days: Array.isArray(p.schedule_days)?p.schedule_days.join(', '):p.schedule_days||'' }); setEditando(p.id); setShowModal(true) }}>Editar</Btn>
                      <Btn size="sm" variant="danger" onClick={()=>remove(p.id)}>✕</Btn>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:10 }}>
                    {p.duration_minutes && (
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:12 }}>⏱</span>
                        <span style={{ fontSize:12, color:C.sub, fontWeight:500 }}>{p.duration_minutes} min</span>
                      </div>
                    )}
                    {profs.length > 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:12 }}>👩‍⚕️</span>
                        <span style={{ fontSize:12, color:C.sub }}>{profs.slice(0,2).join(', ')}{profs.length>2?` +${profs.length-2}`:''}</span>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                      {p.benefits && <div style={{ marginBottom:10 }}><div style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:'0.05em', marginBottom:4 }}>BENEFÍCIOS</div><div style={{ fontSize:13, color:C.text }}>{p.benefits}</div></div>}
                      {p.contraindications && <div style={{ marginBottom:10 }}><div style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:'0.05em', marginBottom:4 }}>CONTRAINDICAÇÕES</div><div style={{ fontSize:13, color:C.text }}>{p.contraindications}</div></div>}
                      {p.notes && <div style={{ marginBottom:10 }}><div style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:'0.05em', marginBottom:4 }}>OBSERVAÇÕES</div><div style={{ fontSize:13, color:C.text }}>{p.notes}</div></div>}
                      {p.link && <a href={p.link} target="_blank" rel="noreferrer" style={{ fontSize:12, color:C.accent }}>🔗 Ver mais</a>}
                    </div>
                  )}

                  <div style={{ textAlign:'center', marginTop:8, fontSize:11, color:C.sub }}>
                    {isExpanded ? '▲ menos' : '▼ detalhes'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editando?'Editar Procedimento':'Novo Procedimento'} width={620}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="NOME" value={form.name} onChange={v=>set('name',v)} />
            <Input label="VALOR (R$)" value={form.price} onChange={v=>set('price',v)} type="number" />
            <Input label="DURAÇÃO (min)" value={form.duration_minutes} onChange={v=>set('duration_minutes',v)} type="number" />
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.sub }}>COR</label>
              <input type="color" value={form.color||'#8B6F47'} onChange={e=>set('color',e.target.value)} style={{ width:'100%', height:38, border:`1px solid ${C.border}`, borderRadius:8, cursor:'pointer', padding:3, background:C.input }} />
            </div>
          </div>
          <Input label="PROFISSIONAIS (sep. por vírgula)" value={typeof form.professionals==='string'?form.professionals:(form.professionals||[]).join(', ')} onChange={v=>set('professionals',v)} placeholder="Ana, Maria, João" />
          <Input label="DIAS DE AGENDA (sep. por vírgula)" value={typeof form.schedule_days==='string'?form.schedule_days:(form.schedule_days||[]).join(', ')} onChange={v=>set('schedule_days',v)} />
          <Input label="BENEFÍCIOS" value={form.benefits} onChange={v=>set('benefits',v)} rows={2} />
          <Input label="CONTRAINDICAÇÕES" value={form.contraindications} onChange={v=>set('contraindications',v)} rows={2} />
          <Input label="OBSERVAÇÕES" value={form.notes} onChange={v=>set('notes',v)} rows={2} />
          <Input label="LINK" value={form.link} onChange={v=>set('link',v)} placeholder="https://..." />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={handleSave}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── SEÇÕES DO MENU ────────────────────────────────────────────
const SECOES = [
  { id:'crm',          label:'CRM',                  icon:'📊' },
  { id:'automacoes',   label:'Automações',            icon:'⚡' },
  { id:'info',         label:'Informações Gerais',    icon:'ℹ️', hideFor:['cliente'] },
  { id:'rotinas',      label:'Rotinas Operacionais',  icon:'✅', hideFor:['cliente'] },
  { id:'materiais',    label:'Biblioteca de Materiais',icon:'📁', hideFor:['cliente'] },
  { id:'scripts',      label:'Scripts',               icon:'💬', hideFor:['cliente'] },
  { id:'regras',       label:'Regras Gerais',         icon:'📋', hideFor:['cliente'] },
  { id:'procedimentos',label:'Procedimentos',         icon:'🔬', hideFor:['cliente'] },
  { id:'profissionais',label:'Agenda e Profissionais',icon:'👩‍⚕️', hideFor:['cliente'] },
  { id:'eventos',      label:'Eventos e Campanhas',   icon:'📣', hideFor:['cliente'] },
  { id:'faq',          label:'Perguntas Frequentes',  icon:'❓', hideFor:['cliente'] },
]

// ─── PÁGINA PRINCIPAL DO GUIA ─────────────────────────────────
export default function GuiaPage({ clinic, onVoltar, CRMComponent, AutomacoesComponent, AdminComponent, ContaComponent, currentUser, onPainelAdmin, onMinhaConta, onSignOut }) {
  const [secao, setSecao] = useState('crm')
  const [busca, setBusca] = useState('')
  const [sidebarAberta, setSidebarAberta] = useState(true)

  const { regras, loading: lRegras, save: sRegras, remove: rRegras } = useRegras(clinic.id)
  const { profissionais, loading: lProf, save: sProf, remove: rProf } = useProfissionais(clinic.id)
  const { eventos, loading: lEv, save: sEv, remove: rEv } = useEventos(clinic.id)
  const { faqs, loading: lFaq, save: sFaq, remove: rFaq } = useFAQ(clinic.id)

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin_clinica'
  const secoesFiltradas = SECOES.filter(s => {
    if (s.hideFor?.includes(currentUser?.role)) return false
    if (s.id === 'automacoes' && !currentUser?.permissoes?.includes('ver_automacoes') && currentUser?.role !== 'super_admin') return false
    return (!s.adminOnly || isAdmin) && s.label.toLowerCase().includes(busca.toLowerCase())
  })

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', fontFamily:"'DM Sans','Helvetica Neue',sans-serif", background:C.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} select option{background:#222;color:#FAF7F2}`}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarAberta ? 240 : 56, background:'#111111', display:'flex', flexDirection:'column', transition:'width 0.2s', flexShrink:0, overflow:'hidden', borderRight:`1px solid ${C.border}` }}>
        {/* Header sidebar */}
        <div style={{ padding:'16px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
          {clinic.foto_url || clinic.icon_url
            ? <img src={clinic.foto_url || clinic.icon_url} style={{ width:28, height:28, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
            : <div style={{ width:28, height:28, borderRadius:8, background:C.accent+'33', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:C.accent, flexShrink:0 }}>{clinic.name[0]}</div>
          }
          {sidebarAberta && <span style={{ fontSize:13, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{clinic.name}</span>}
          <button onClick={() => setSidebarAberta(s => !s)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:C.sub, fontSize:16, flexShrink:0 }}>
            {sidebarAberta ? '◀' : '▶'}
          </button>
        </div>

        {/* Voltar */}
        <button onClick={onVoltar} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'none', border:'none', cursor:'pointer', color:C.sub, fontSize:12, borderBottom:`1px solid ${C.border}`, textAlign:'left', fontFamily:'inherit' }}>
          <span>←</span>{sidebarAberta && <span>Central</span>}
        </button>

        {/* Busca */}
        {sidebarAberta && (
          <div style={{ padding:'10px 14px' }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar seção..."
              style={{ width:'100%', background:C.input, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', fontSize:12, color:C.text, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
          </div>
        )}

        {/* Navegação */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 8px' }}>
          {secoesFiltradas.map(s => (
            <button key={s.id} onClick={() => setSecao(s.id)}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:8,
                background: secao===s.id ? C.accent+'22' : 'transparent',
                border: secao===s.id ? `1px solid ${C.accent}33` : '1px solid transparent',
                cursor:'pointer', color: secao===s.id ? C.accent : C.sub,
                fontSize:13, fontWeight: secao===s.id ? 700 : 400, fontFamily:'inherit', textAlign:'left', transition:'all 0.15s', marginBottom:2 }}>
              <span style={{ fontSize:15, flexShrink:0 }}>{s.icon}</span>
              {sidebarAberta && <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.label}</span>}
            </button>
          ))}
        </div>

        {sidebarAberta && (
          <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, color:C.sub, letterSpacing:'0.1em' }}>GUIA INTERATIVO</div>
            <div style={{ fontSize:11, color:C.accent, fontWeight:600 }}>Pluz Tech</div>
          </div>
        )}
      </div>

      {/* Conteúdo principal */}
      <div style={{ flex:1, overflowY:'auto', background:C.bg }}>
        {/* Top bar */}
        <div style={{ background:'#111111', borderBottom:`1px solid ${C.border}`, padding:'0 28px', height:54, display:'flex', alignItems:'center', gap:12, position:'sticky', top:0, zIndex:10 }}>
          <span style={{ fontSize:18 }}>{SECOES.find(s=>s.id===secao)?.icon}</span>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{SECOES.find(s=>s.id===secao)?.label}</span>
          <span style={{ color:C.border, margin:'0 4px' }}>·</span>
          <span style={{ fontSize:13, color:C.sub }}>{clinic.name}</span>
          <div style={{ flex:1 }} />
          {onMinhaConta && (
            <button onClick={onMinhaConta}
              style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', color:C.sub, transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.color=C.accent }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.sub }}>
              👤 Minha Conta
            </button>
          )}
          {onPainelAdmin && (
            <button onClick={onPainelAdmin}
              style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.accent}44`, background:C.accent+'18', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', color:C.accent, transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background=C.accent+'33'}
              onMouseLeave={e => e.currentTarget.style.background=C.accent+'18'}>
              🛡️ Painel Admin
            </button>
          )}
          {onSignOut && (
            <button onClick={onSignOut} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:C.sub, padding:'5px 8px' }}>Sair</button>
          )}
        </div>

        <div style={{ padding:28 }}>
          {secao === 'crm'          && CRMComponent}
          {secao === 'automacoes'   && AutomacoesComponent}
          {secao === 'info'         && <InfoGeral clinicId={clinic.id} />}
          {secao === 'rotinas'      && <Rotinas clinicId={clinic.id} />}
          {secao === 'materiais'    && <Materiais clinicId={clinic.id} />}
          {secao === 'scripts'      && <Scripts clinicId={clinic.id} />}
          {secao === 'regras'       && <SecaoGenerica titulo="Regras Gerais" dados={regras} loading={lRegras} onSave={sRegras} onRemove={rRegras} expandivel campos={[{key:'title',label:'Título'},{key:'content',label:'Conteúdo',rows:3},{key:'exceptions',label:'Exceções',rows:2},{key:'notes',label:'Observações',rows:2}]} />}
          {secao === 'procedimentos'&& <ProcedimentosSection clinicId={clinic.id} />}
          {secao === 'profissionais'&& <SecaoGenerica titulo="Agenda e Profissionais" dados={profissionais} loading={lProf} onSave={sProf} onRemove={rProf} expandivel campos={[{key:'name',label:'Nome'},{key:'specialties',label:'Especialidades',array:true,placeholder:'Sep. por vírgula'},{key:'locations',label:'Locais',array:true,placeholder:'Sep. por vírgula'},{key:'working_days',label:'Dias de atendimento',array:true,placeholder:'Sep. por vírgula'},{key:'non_working_days',label:'Dias que NÃO atende',array:true,placeholder:'Sep. por vírgula'},{key:'reminders',label:'Lembretes',rows:2},{key:'notes',label:'Observações',rows:2},{key:'color',label:'Cor'}]} />}
          {secao === 'eventos'      && <SecaoGenerica titulo="Eventos e Campanhas" dados={eventos} loading={lEv} onSave={sEv} onRemove={rEv} expandivel campos={[{key:'name',label:'Nome'},{key:'type',label:'Tipo'},{key:'dates',label:'Datas',array:true,placeholder:'Sep. por vírgula'},{key:'hours',label:'Horários'},{key:'objective',label:'Objetivo',rows:2},{key:'procedures',label:'Procedimentos',array:true,placeholder:'Sep. por vírgula'},{key:'special_conditions',label:'Condições especiais',rows:2},{key:'values',label:'Valores'},{key:'notes',label:'Observações',rows:2}]} />}
          {secao === 'faq'          && <SecaoGenerica titulo="Perguntas Frequentes" dados={faqs} loading={lFaq} onSave={sFaq} onRemove={rFaq} expandivel campos={[{key:'question',label:'Pergunta'},{key:'answer',label:'Resposta',rows:3},{key:'link',label:'Link'},{key:'notes',label:'Observações',rows:2}]} />}
        </div>
      </div>
    </div>
  )
}
