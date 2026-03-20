import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTarefasPendentes } from '../hooks/useGuia'

const C = { preto:'#0F0F0F', branco:'#FFFFFF', marrom:'#8B6F47', marromClaro:'#C4A882', creme:'#FAF7F2', cinza:'#6B7280', borda:'#E5E7EB', cinzaClaro:'#F3F4F6' }

// ─── CARD COM BADGE DE TAREFAS ────────────────────────────────
const ClinicCard = ({ clinic, onClick }) => {
  const tarefasPendentes = useTarefasPendentes(clinic.id)

  return (
    <div onClick={onClick}
      style={{ background:C.branco, border:`1px solid ${C.borda}`, borderRadius:16, padding:24, cursor:'pointer', transition:'all 0.2s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor='#D1D5DB' }}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; e.currentTarget.style.borderColor=C.borda }}>

      {/* Badge de tarefas pendentes */}
      {tarefasPendentes > 0 && (
        <div style={{ position:'absolute', top:14, right:14, background:'#EF4444', color:C.branco, borderRadius:99, minWidth:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, padding:'0 6px' }}>
          {tarefasPendentes}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
        {clinic.icon_url
          ? <img src={clinic.icon_url} style={{ width:48, height:48, borderRadius:12, objectFit:'cover' }} />
          : <div style={{ width:48, height:48, borderRadius:12, background:C.preto, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:C.branco }}>
              {clinic.name[0].toUpperCase()}
            </div>
        }
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:C.preto, letterSpacing:'-0.01em' }}>{clinic.name}</div>
          {tarefasPendentes > 0
            ? <div style={{ fontSize:12, color:'#EF4444', fontWeight:600, marginTop:2 }}>⚠️ {tarefasPendentes} tarefa{tarefasPendentes>1?'s':''} pendente{tarefasPendentes>1?'s':''}</div>
            : <div style={{ fontSize:12, color:'#10B981', fontWeight:500, marginTop:2 }}>✓ Sem pendências</div>
          }
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:12, color:C.cinza }}>
          {clinic.ativo ? <span style={{ color:'#10B981', fontWeight:600 }}>● Ativo</span> : <span style={{ color:'#9CA3AF' }}>● Inativo</span>}
        </div>
        <div style={{ fontSize:12, color:C.marrom, fontWeight:600 }}>Visualizar guia →</div>
      </div>
    </div>
  )
}

// ─── MODAL NOVA CLÍNICA ───────────────────────────────────────
const NovaClinicaModal = ({ onClose, onCreated }) => {
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const handleCreate = async () => {
    if (!nome.trim()) return setErro('Nome obrigatório')
    setSaving(true)
    const { data, error } = await supabase.from('clinics').insert({ name: nome.trim() }).select().single()
    setSaving(false)
    if (error) return setErro('Erro ao criar clínica: ' + error.message)
    onCreated(data)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.branco, borderRadius:16, width:'100%', maxWidth:440, boxShadow:'0 25px 60px rgba(0,0,0,0.2)', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.borda}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Adicionar clínica</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:C.cinza }}>×</button>
        </div>
        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:C.cinza, letterSpacing:'0.05em' }}>NOME DA CLÍNICA</label>
            <input value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleCreate()} placeholder="Ex: Femme Clinic" autoFocus
              style={{ border:`1px solid ${C.borda}`, borderRadius:8, padding:'9px 12px', fontSize:14, outline:'none', fontFamily:'inherit', background:C.creme }} />
          </div>
          {erro && <div style={{ fontSize:12, color:'#DC2626', background:'#FEF2F2', padding:'8px 12px', borderRadius:8 }}>{erro}</div>}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:`1px solid ${C.borda}` }}>
            <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:`1px solid ${C.borda}`, background:C.cinzaClaro, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', color:'#374151' }}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:C.preto, color:C.branco, cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', opacity:saving?0.6:1 }}>
              {saving ? 'Criando...' : 'Criar clínica'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CENTRAL DE CLÍNICAS ──────────────────────────────────────
export default function CentralClinicas({ clinics, onSelectClinic, onNewClinic, onSignOut }) {
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)

  const clinicsFiltradas = (clinics || []).filter(c => c.name.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div style={{ minHeight:'100vh', background:'#F7F7F7', fontFamily:"'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{ background:C.branco, borderBottom:`1px solid ${C.borda}`, padding:'0 32px', height:56, display:'flex', alignItems:'center', gap:16, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:C.preto, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:C.branco, fontSize:12, fontWeight:800 }}>P</span>
        </div>
        <span style={{ fontWeight:800, fontSize:14, color:C.preto, letterSpacing:'-0.01em' }}>Pluz Tech</span>
        <div style={{ flex:1 }} />
        <button onClick={onSignOut} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:C.cinza }}>Sair</button>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 24px' }}>

        {/* Título e ações */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
          <div>
            <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:C.preto, letterSpacing:'-0.03em' }}>Central de Clínicas</h1>
            <p style={{ margin:'6px 0 0', fontSize:13, color:C.cinza }}>Selecione uma clínica para acessar o guia operacional</p>
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ padding:'10px 20px', borderRadius:10, background:C.preto, color:C.branco, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit', display:'flex', alignItems:'center', gap:8 }}>
            + Adicionar clínica
          </button>
        </div>

        {/* Busca */}
        <div style={{ marginBottom:24 }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar clínicas..."
            style={{ width:'100%', maxWidth:360, border:`1px solid ${C.borda}`, borderRadius:10, padding:'10px 16px', fontSize:13, outline:'none', fontFamily:'inherit', background:C.branco }} />
        </div>

        {/* Grid de cards */}
        {clinicsFiltradas.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:C.cinza }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏥</div>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>Nenhuma clínica encontrada</div>
            <div style={{ fontSize:13 }}>Adicione sua primeira clínica para começar</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
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
