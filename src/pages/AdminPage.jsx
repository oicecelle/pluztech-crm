import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── CORES DARK ────────────────────────────────────────────────
const C = {
  preto:'#FAF7F2',    // texto principal (claro)
  branco:'#1a1a1a',   // fundo card/modal (escuro)
  marrom:'#8B6F47',
  creme:'#222222',    // fundo input (escuro)
  cinza:'#9ca3af',    // texto secundário
  borda:'#2a2a2a',    // borda
  cinzaClaro:'#161616', // fundo alternativo
  verde:'#22c55e', vermelho:'#ef4444',
  azul:'#3B82F6', amarelo:'#F59E0B',
  bg:'#0F0F0F',
}

// ── PERMISSÕES ────────────────────────────────────────────────
const ROLES = [
  { value:'super_admin',    label:'Super Admin',         desc:'Acesso total ao sistema',                          cor:'#8B5CF6' },
  { value:'admin_clinica',  label:'Admin da Clínica',    desc:'Edita conteúdo de clínicas específicas',           cor:'#3B82F6' },
  { value:'supervisor',     label:'Supervisor',          desc:'Revisa mensagens, sem editar configurações',        cor:'#F59E0B' },
  { value:'assistente',     label:'Assistente',          desc:'Visualiza guia, marca tarefas',                    cor:'#10B981' },
  { value:'cliente',        label:'Cliente',             desc:'Acesso restrito ao CRM da própria clínica',        cor:'#6B7280' },
]

const PERMISSOES = [
  { key:'criar_usuarios',    label:'Criar / editar usuários' },
  { key:'criar_tarefas',     label:'Criar / editar tarefas' },
  { key:'criar_clinicas',    label:'Criar / editar clínicas' },
  { key:'editar_conteudo',   label:'Editar conteúdo do Guia' },
  { key:'ver_crm',           label:'Visualizar CRM' },
  { key:'editar_crm',        label:'Editar leads no CRM' },
  { key:'ver_automacoes',    label:'Visualizar Automações' },
  { key:'editar_automacoes', label:'Editar Automações' },
  { key:'ver_historico',     label:'Ver histórico de edições' },
  { key:'fazer_disparos',    label:'Criar e executar disparos' },
]

const ROLE_PERMISSOES_PADRAO = {
  super_admin:   PERMISSOES.map(p => p.key),
  admin_clinica: ['criar_tarefas','editar_conteudo','ver_crm','editar_crm','ver_automacoes','editar_automacoes','fazer_disparos'],
  supervisor:    ['ver_crm','ver_automacoes','ver_historico'],
  assistente:    ['criar_tarefas','editar_conteudo','ver_crm'],
  cliente:       ['ver_crm'],
}

// ── BASE ──────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant='primary', size='md', disabled=false }) => {
  const v = {
    primary:   { background:C.marrom, color:'#fff', border:'none' },
    secondary: { background:C.cinzaClaro, color:C.preto, border:`1px solid ${C.borda}` },
    ghost:     { background:'transparent', color:C.cinza, border:'1px solid transparent' },
    danger:    { background:C.vermelho+'18', color:C.vermelho, border:`1px solid ${C.vermelho}44` },
    success:   { background:C.verde+'18', color:C.verde, border:`1px solid ${C.verde}44` },
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ borderRadius:8, fontWeight:600, cursor:disabled?'not-allowed':'pointer', transition:'all 0.15s', fontFamily:'inherit', opacity:disabled?0.5:1, fontSize:size==='sm'?12:13, padding:size==='sm'?'4px 10px':'8px 16px', ...v[variant] }}>
      {children}
    </button>
  )
}

const Input = ({ label, value, onChange, type='text', placeholder='', required=false }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>{label}{required && <span style={{ color:C.vermelho }}> *</span>}</label>}
    <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', fontSize:13, color:C.preto, background:C.creme, outline:'none', fontFamily:'inherit' }} />
  </div>
)

const Badge = ({ label, cor }) => (
  <span style={{ background:cor+'18', color:cor, border:`1px solid ${cor}33`, borderRadius:99, padding:'2px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>{label}</span>
)

const Modal = ({ open, onClose, title, children, width=600 }) => {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:16, width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.borda}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.preto }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:C.cinza }}>×</button>
        </div>
        <div style={{ padding:24, overflowY:'auto', flex:1 }}>{children}</div>
      </div>
    </div>
  )
}

const Spinner = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:48 }}>
    <div style={{ width:24, height:24, border:`3px solid ${C.borda}`, borderTopColor:C.preto, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
  </div>
)

const Toast = ({ msg, type='success', onClose }) => (
  <div style={{ position:'fixed', bottom:24, right:24, background:type==='error'?C.vermelho+'18':'#14532d', border:`1px solid ${type==='error'?C.vermelho+'44':'#22c55e44'}`, color:type==='error'?C.vermelho:C.verde, borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:600, zIndex:2000, boxShadow:'0 4px 20px rgba(0,0,0,0.4)', cursor:'pointer' }} onClick={onClose}>
    {type==='error'?'✕ ':'✓ '}{msg}
  </div>
)

const fmtDateTime = d => d ? new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

// ── MODAL USUÁRIO ─────────────────────────────────────────────
const UsuarioModal = ({ usuario, clinics, onClose, onSave, saving }) => {
  const isNew = !usuario?.id
  const [form, setForm] = useState({
    name: usuario?.name || '',
    email: usuario?.email || '',
    role: usuario?.role || 'assistente',
    senha: '',
    ativo: usuario?.ativo !== false,
    permissoes: usuario?.permissoes || ROLE_PERMISSOES_PADRAO['assistente'],
    clinicas: usuario?.clinicas || [],
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const togglePerm = (key) => set('permissoes', form.permissoes.includes(key) ? form.permissoes.filter(p=>p!==key) : [...form.permissoes, key])
  const toggleClinica = (id) => set('clinicas', form.clinicas.includes(id) ? form.clinicas.filter(c=>c!==id) : [...form.clinicas, id])
  const aplicarRolePadrao = (role) => { set('role', role); set('permissoes', ROLE_PERMISSOES_PADRAO[role] || []) }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Novo Usuário' : `Editar — ${usuario.name}`} width={680}>
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Dados básicos */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.06em', marginBottom:12 }}>DADOS DO USUÁRIO</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Input label="Nome completo" value={form.name} onChange={v=>set('name',v)} required />
            <Input label="Email" value={form.email} onChange={v=>set('email',v)} type="email" required />
            {isNew && <Input label="Senha inicial" value={form.senha} onChange={v=>set('senha',v)} type="password" placeholder="Mínimo 8 caracteres" required />}
          </div>
        </div>

        {/* Função / Role */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.06em', marginBottom:12 }}>FUNÇÃO</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {ROLES.map(r => (
              <button key={r.value} onClick={() => aplicarRolePadrao(r.value)}
                style={{ padding:'8px 14px', borderRadius:10, border:`2px solid ${form.role===r.value ? r.cor : C.borda}`, background:form.role===r.value ? r.cor+'18' : C.cinzaClaro, cursor:'pointer', fontFamily:'inherit', textAlign:'left', transition:'all 0.15s' }}>
                <div style={{ fontSize:12, fontWeight:700, color:form.role===r.value ? r.cor : C.preto }}>{r.label}</div>
                <div style={{ fontSize:11, color:C.cinza, marginTop:2, maxWidth:140 }}>{r.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize:11, color:C.cinza, marginTop:8 }}>Selecionar uma função pré-define as permissões abaixo. Você pode ajustar manualmente.</div>
        </div>

        {/* Permissões manuais */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.06em', marginBottom:12 }}>PERMISSÕES</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {PERMISSOES.map(p => (
              <label key={p.key} onClick={() => togglePerm(p.key)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:`1px solid ${form.permissoes.includes(p.key) ? C.marrom : C.borda}`, background:form.permissoes.includes(p.key) ? C.marrom+'18' : C.cinzaClaro, cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${form.permissoes.includes(p.key) ? C.marrom : C.borda}`, background:form.permissoes.includes(p.key) ? C.marrom : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                  {form.permissoes.includes(p.key) && <span style={{ color:'#fff', fontSize:11, fontWeight:900 }}>✓</span>}
                </div>
                <span style={{ fontSize:12, color:C.preto, fontWeight:form.permissoes.includes(p.key)?600:400 }}>{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Acesso às clínicas */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.06em' }}>ACESSO ÀS CLÍNICAS</div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn size="sm" variant="ghost" onClick={() => set('clinicas', clinics.map(c=>c.id))}>Selecionar todas</Btn>
              <Btn size="sm" variant="ghost" onClick={() => set('clinicas', [])}>Limpar</Btn>
            </div>
          </div>
          {clinics.length === 0
            ? <div style={{ fontSize:13, color:C.cinza }}>Nenhuma clínica cadastrada</div>
            : <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {clinics.map(c => (
                  <label key={c.id} onClick={() => toggleClinica(c.id)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:`1px solid ${form.clinicas.includes(c.id) ? C.marrom : C.borda}`, background:form.clinicas.includes(c.id) ? C.marrom+'18' : C.cinzaClaro, cursor:'pointer', transition:'all 0.15s' }}>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${form.clinicas.includes(c.id) ? C.marrom : C.borda}`, background:form.clinicas.includes(c.id) ? C.marrom : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {form.clinicas.includes(c.id) && <span style={{ color:'#fff', fontSize:11, fontWeight:900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, color:C.preto, fontWeight:form.clinicas.includes(c.id)?600:400 }}>{c.name}</span>
                  </label>
                ))}
              </div>
          }
        </div>

        {/* Ativo */}
        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <div onClick={() => set('ativo', !form.ativo)} style={{ width:40, height:22, borderRadius:99, background:form.ativo ? C.marrom : '#333', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
            <div style={{ position:'absolute', top:3, left:form.ativo?21:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.4)' }} />
          </div>
          <span style={{ fontSize:13, color:C.preto }}>Usuário ativo</span>
        </label>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:16, borderTop:`1px solid ${C.borda}` }}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={() => onSave(form)} disabled={saving}>{saving ? 'Salvando...' : isNew ? 'Criar usuário' : 'Salvar alterações'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ── PAINEL ADMINISTRATIVO ─────────────────────────────────────
export function PainelAdmin({ clinics, currentUser }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [busca, setBusca] = useState('')
  const [tabAtiva, setTabAtiva] = useState('usuarios')

  const showT = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('users').select(`*, clinic_users(clinic_id)`).order('name')
    if (!error) {
      setUsuarios((data || []).map(u => ({ ...u, clinicas: (u.clinic_users || []).map(cu => cu.clinic_id) })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsuarios() }, [fetchUsuarios])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      if (editando) {
        const { clinicas, senha, ...userData } = form
        const { error } = await supabase.from('users').update({ name:userData.name, email:userData.email, role:userData.role, ativo:userData.ativo, permissoes:userData.permissoes }).eq('id', editando.id)
        if (error) throw error
        await supabase.from('clinic_users').delete().eq('user_id', editando.id)
        if (clinicas?.length) await supabase.from('clinic_users').insert(clinicas.map(cid => ({ user_id: editando.id, clinic_id: cid })))
      } else {
        const { data: res, error: invokeError } = await supabase.functions.invoke('create-user', { body: { email: form.email, password: form.senha } })
        if (invokeError) throw invokeError
        if (res?.error) throw new Error(res.error)
        const authData = { user: res.user }
        const { data: newUser, error: dbError } = await supabase.from('users').insert({ auth_id: authData.user.id, name: form.name, email: form.email, role: form.role, ativo: form.ativo, permissoes: form.permissoes }).select().single()
        if (dbError) throw dbError
        if (form.clinicas?.length) await supabase.from('clinic_users').insert(form.clinicas.map(cid => ({ user_id: newUser.id, clinic_id: cid })))
      }
      await fetchUsuarios()
      showT(editando ? 'Usuário atualizado!' : 'Usuário criado!')
      setShowModal(false); setEditando(null)
    } catch (e) { showT('Erro: ' + e.message, 'error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Deseja desativar este usuário?')) return
    await supabase.from('users').update({ ativo: false }).eq('id', id)
    await fetchUsuarios()
    showT('Usuário desativado')
  }

  const usuariosFiltrados = usuarios.filter(u => u.name?.toLowerCase().includes(busca.toLowerCase()) || u.email?.toLowerCase().includes(busca.toLowerCase()))

  const tabS = (a) => ({ padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', borderBottom:a?`2px solid ${C.marrom}`:'2px solid transparent', color:a?C.preto:C.cinza, background:'none', border:'none', fontFamily:'inherit' })

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.preto, letterSpacing:'-0.02em' }}>Painel Administrativo</h2>
          <p style={{ margin:'4px 0 0', fontSize:13, color:C.cinza }}>Gerencie usuários, permissões e acessos</p>
        </div>
        <Btn onClick={() => { setEditando(null); setShowModal(true) }}>+ Novo usuário</Btn>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.borda}`, marginBottom:24 }}>
        <button style={tabS(tabAtiva==='usuarios')} onClick={() => setTabAtiva('usuarios')}>👥 Usuários</button>
        <button style={tabS(tabAtiva==='historico')} onClick={() => setTabAtiva('historico')}>📋 Histórico de Edições</button>
      </div>

      {tabAtiva === 'usuarios' && (
        <>
          <div style={{ marginBottom:16 }}>
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou email..."
              style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'8px 14px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.creme, color:C.preto, width:280 }} />
          </div>

          {loading ? <Spinner /> : (
            <div style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.cinzaClaro }}>
                    {['USUÁRIO','EMAIL','FUNÇÃO','CLÍNICAS','STATUS','ÚLTIMO ACESSO','AÇÕES'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.06em', borderBottom:`1px solid ${C.borda}`, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.length === 0 && (
                    <tr><td colSpan={7} style={{ padding:48, textAlign:'center', color:C.cinza, fontSize:13 }}>Nenhum usuário encontrado</td></tr>
                  )}
                  {usuariosFiltrados.map(u => {
                    const role = ROLES.find(r => r.value === u.role)
                    const clinicasDoUsuario = (u.clinicas || []).map(id => clinics.find(c => c.id === id)?.name).filter(Boolean)
                    return (
                      <tr key={u.id} style={{ borderBottom:`1px solid ${C.borda}22` }}>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:'50%', background:role?.cor+'20', border:`2px solid ${role?.cor+'40'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:role?.cor, flexShrink:0 }}>
                              {u.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:700, color:C.preto }}>{u.name}</div>
                              {u.auth_id === currentUser?.id && <div style={{ fontSize:10, color:C.marrom, fontWeight:700 }}>VOCÊ</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:C.cinza }}>{u.email}</td>
                        <td style={{ padding:'12px 16px' }}>{role && <Badge label={role.label} cor={role.cor} />}</td>
                        <td style={{ padding:'12px 16px' }}>
                          {u.role === 'super_admin'
                            ? <span style={{ fontSize:12, color:C.cinza }}>Todas</span>
                            : <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                                {clinicasDoUsuario.slice(0,2).map(n => <span key={n} style={{ fontSize:11, background:C.cinzaClaro, borderRadius:99, padding:'2px 8px', color:C.cinza }}>{n}</span>)}
                                {clinicasDoUsuario.length > 2 && <span style={{ fontSize:11, color:C.cinza }}>+{clinicasDoUsuario.length-2}</span>}
                                {clinicasDoUsuario.length === 0 && <span style={{ fontSize:11, color:C.cinza }}>Nenhuma</span>}
                              </div>
                          }
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:11, fontWeight:600, color:u.ativo?C.verde:C.cinza }}>
                            {u.ativo ? '● Ativo' : '● Inativo'}
                          </span>
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:C.cinza }}>{fmtDateTime(u.updated_at || u.created_at)}</td>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', gap:6 }}>
                            <Btn size="sm" variant="secondary" onClick={() => { setEditando(u); setShowModal(true) }}>Editar</Btn>
                            {u.auth_id !== currentUser?.id && <Btn size="sm" variant="danger" onClick={() => handleDelete(u.id)}>Desativar</Btn>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tabAtiva === 'historico' && <HistoricoEdições clinics={clinics} showAll />}

      {showModal && (
        <UsuarioModal
          usuario={editando}
          clinics={clinics}
          onClose={() => { setShowModal(false); setEditando(null) }}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

// ── HISTÓRICO DE EDIÇÕES ──────────────────────────────────────
export function HistoricoEdições({ clinics, currentUserId, showAll = false }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ usuario:'', clinica:'', tipo:'', dataInicio:'', dataFim:'' })
  const [usuarios, setUsuarios] = useState([])

  const TIPOS_ACAO = [
    { value:'create', label:'Criação',   cor:C.verde },
    { value:'update', label:'Edição',    cor:C.azul },
    { value:'delete', label:'Exclusão',  cor:C.vermelho },
    { value:'login',  label:'Login',     cor:C.amarelo },
  ]

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      let query = supabase.from('activity_logs').select(`*, users(name, email)`).order('timestamp', { ascending: false }).limit(200)
      if (!showAll && currentUserId) query = query.eq('user_id', currentUserId)
      if (filtros.clinica) query = query.eq('clinic_id', filtros.clinica)
      if (filtros.tipo) query = query.eq('action_type', filtros.tipo)
      if (filtros.dataInicio) query = query.gte('timestamp', filtros.dataInicio)
      if (filtros.dataFim) query = query.lte('timestamp', filtros.dataFim + 'T23:59:59')
      const { data } = await query
      let filtered = data || []
      if (filtros.usuario) filtered = filtered.filter(l => l.users?.name?.toLowerCase().includes(filtros.usuario.toLowerCase()))
      setLogs(filtered)
      setLoading(false)
    }
    fetchLogs()
  }, [filtros, showAll, currentUserId])

  useEffect(() => {
    supabase.from('users').select('id, name').order('name').then(({ data }) => setUsuarios(data || []))
  }, [])

  const setF = (k, v) => setFiltros(f => ({ ...f, [k]: v }))

  const selS = { border:`1px solid ${C.borda}`, borderRadius:8, padding:'7px 12px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.creme, color:C.preto, cursor:'pointer' }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Filtros */}
      <div style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:12, padding:'14px 18px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
        {showAll && (
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>USUÁRIO</label>
            <input value={filtros.usuario} onChange={e=>setF('usuario',e.target.value)} placeholder="Buscar usuário..." style={{ ...selS, minWidth:160 }} />
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>CLÍNICA</label>
          <select value={filtros.clinica} onChange={e=>setF('clinica',e.target.value)} style={selS}>
            <option value=''>Todas</option>
            {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>TIPO DE AÇÃO</label>
          <select value={filtros.tipo} onChange={e=>setF('tipo',e.target.value)} style={selS}>
            <option value=''>Todas</option>
            {TIPOS_ACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>DE</label>
          <input type="date" value={filtros.dataInicio} onChange={e=>setF('dataInicio',e.target.value)} style={selS} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>ATÉ</label>
          <input type="date" value={filtros.dataFim} onChange={e=>setF('dataFim',e.target.value)} style={selS} />
        </div>
        <Btn size="sm" variant="ghost" onClick={() => setFiltros({ usuario:'', clinica:'', tipo:'', dataInicio:'', dataFim:'' })}>Limpar</Btn>
      </div>

      {/* Tabela */}
      {loading ? <Spinner /> : (
        <div style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.cinzaClaro }}>
                {['DATA/HORA', showAll&&'USUÁRIO', 'TIPO', 'SEÇÃO', 'CLÍNICA', 'DETALHE'].filter(Boolean).map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.06em', borderBottom:`1px solid ${C.borda}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={6} style={{ padding:48, textAlign:'center', color:C.cinza, fontSize:13 }}>Nenhum registro encontrado</td></tr>
              )}
              {logs.map(log => {
                const tipoInfo = TIPOS_ACAO.find(t => t.value === log.action_type) || { label: log.action_type, cor: C.cinza }
                const clinicaNome = clinics.find(c => c.id === log.clinic_id)?.name || '—'
                return (
                  <tr key={log.id} style={{ borderBottom:`1px solid #F9F9F9` }}>
                    <td style={{ padding:'10px 16px', fontSize:12, color:C.cinza, whiteSpace:'nowrap' }}>{fmtDateTime(log.timestamp)}</td>
                    {showAll && <td style={{ padding:'10px 16px' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.preto }}>{log.users?.name || '—'}</div>
                      <div style={{ fontSize:11, color:C.cinza }}>{log.users?.email}</div>
                    </td>}
                    <td style={{ padding:'10px 16px' }}><Badge label={tipoInfo.label} cor={tipoInfo.cor} /></td>
                    <td style={{ padding:'10px 16px', fontSize:13, color:C.preto }}>{log.entity_type || '—'}</td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:C.cinza }}>{clinicaNome}</td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:C.cinza, maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {log.new_value ? JSON.stringify(log.new_value).slice(0, 80) + '...' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding:'10px 16px', borderTop:`1px solid ${C.borda}`, fontSize:12, color:C.cinza }}>{logs.length} registros</div>
        </div>
      )}
    </div>
  )
}

// ── MINHA CONTA ───────────────────────────────────────────────
export function MinhaConta({ currentUser, clinics }) {
  const [tab, setTab] = useState('perfil')
  const [form, setForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '' })
  const [senhaForm, setSenhaForm] = useState({ nova:'', confirmar:'' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showT = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const handleSavePerfil = async () => {
    setSaving(true)
    const { error } = await supabase.from('users').update({ name: form.name }).eq('auth_id', currentUser?.id)
    setSaving(false)
    if (error) showT('Erro ao salvar: ' + error.message, 'error')
    else showT('Perfil atualizado!')
  }

  const handleSaveSenha = async () => {
    if (!senhaForm.nova || senhaForm.nova.length < 8) return showT('Senha deve ter mínimo 8 caracteres', 'error')
    if (senhaForm.nova !== senhaForm.confirmar) return showT('As senhas não conferem', 'error')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: senhaForm.nova })
    setSaving(false)
    if (error) showT('Erro: ' + error.message, 'error')
    else { showT('Senha alterada com sucesso!'); setSenhaForm({ nova:'', confirmar:'' }) }
  }

  const role = ROLES.find(r => r.value === currentUser?.role)
  const tabS = (a) => ({ padding:'9px 18px', fontSize:13, fontWeight:600, cursor:'pointer', borderBottom:a?`2px solid ${C.marrom}`:'2px solid transparent', color:a?C.preto:C.cinza, background:'none', border:'none', fontFamily:'inherit' })

  return (
    <div style={{ fontFamily:"'DM Sans','Helvetica Neue',sans-serif", maxWidth:720 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.preto, letterSpacing:'-0.02em' }}>Minha Conta</h2>
        <p style={{ margin:'4px 0 0', fontSize:13, color:C.cinza }}>Gerencie seu perfil e preferências</p>
      </div>

      {/* Card do perfil */}
      <div style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:14, padding:20, marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:role?.cor+'20', border:`3px solid ${role?.cor+'40'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:role?.cor, flexShrink:0 }}>
          {currentUser?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:C.preto }}>{currentUser?.name}</div>
          <div style={{ fontSize:13, color:C.cinza, marginTop:2 }}>{currentUser?.email}</div>
          <div style={{ marginTop:6 }}>{role && <Badge label={role.label} cor={role.cor} />}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.borda}`, marginBottom:24 }}>
        <button style={tabS(tab==='perfil')} onClick={()=>setTab('perfil')}>👤 Perfil</button>
        <button style={tabS(tab==='senha')} onClick={()=>setTab('senha')}>🔒 Senha</button>
        <button style={tabS(tab==='historico')} onClick={()=>setTab('historico')}>📋 Meu Histórico</button>
      </div>

      {tab === 'perfil' && (
        <div style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:12, padding:24, display:'flex', flexDirection:'column', gap:16 }}>
          <Input label="Nome completo" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} />
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>EMAIL</label>
            <input value={form.email} disabled style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', fontSize:13, color:C.cinza, background:C.cinzaClaro, outline:'none', fontFamily:'inherit', cursor:'not-allowed' }} />
            <span style={{ fontSize:11, color:C.cinza }}>O email não pode ser alterado por aqui. Entre em contato com o administrador.</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>CLÍNICAS COM ACESSO</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {currentUser?.role === 'super_admin'
                ? <span style={{ fontSize:13, color:C.cinza }}>Todas as clínicas</span>
                : clinics.filter(c => currentUser?.clinicas?.includes(c.id)).map(c => (
                    <span key={c.id} style={{ fontSize:12, background:C.creme, borderRadius:99, padding:'3px 12px', color:C.marrom, border:`1px solid ${C.borda}` }}>{c.name}</span>
                  ))
              }
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn onClick={handleSavePerfil} disabled={saving}>{saving?'Salvando...':'Salvar perfil'}</Btn>
          </div>
        </div>
      )}

      {tab === 'senha' && (
        <div style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:12, padding:24, display:'flex', flexDirection:'column', gap:16 }}>
          <Input label="Nova senha" value={senhaForm.nova} onChange={v=>setSenhaForm(f=>({...f,nova:v}))} type="password" placeholder="Mínimo 8 caracteres" />
          <Input label="Confirmar nova senha" value={senhaForm.confirmar} onChange={v=>setSenhaForm(f=>({...f,confirmar:v}))} type="password" placeholder="Repita a senha" />
          {senhaForm.nova && senhaForm.confirmar && senhaForm.nova !== senhaForm.confirmar && (
            <div style={{ fontSize:12, color:C.vermelho, background:C.vermelho+'18', border:`1px solid ${C.vermelho}33`, padding:'8px 12px', borderRadius:8 }}>As senhas não conferem</div>
          )}
          <div style={{ background:C.cinzaClaro, border:`1px solid ${C.borda}`, borderRadius:8, padding:'12px 14px', fontSize:12, color:C.cinza }}>
            A senha deve ter pelo menos 8 caracteres. Após alterar, você precisará fazer login novamente.
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <Btn onClick={handleSaveSenha} disabled={saving||senhaForm.nova!==senhaForm.confirmar}>{saving?'Alterando...':'Alterar senha'}</Btn>
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <HistoricoEdições clinics={clinics} currentUserId={currentUser?.id} showAll={false} />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  )
}
