import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { useClinics, useCRMConfig, useLeads, useTemplates, useDisparos } from './hooks/useCRM'
import CentralClinicas from './pages/CentralClinicas'
import GuiaPage from './pages/GuiaPage'
import AutomacoesPage from './pages/AutomacoesPage'
import { PainelAdmin, MinhaConta } from './pages/AdminPage'

const fmtDate = d => d ? new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'
const fmtDateTime = d => d ? new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'
const timeAgo = d => { if(!d) return '—'; const days=Math.floor((Date.now()-new Date(d).getTime())/86400000); if(days===0) return 'hoje'; if(days===1) return 'ontem'; return `há ${days} dias` }

// ─── PALETA DARK ────────────────────────────────────────────
const D = {
  bg:'#0F0F0F', card:'#1a1a1a', cardAlt:'#161616',
  text:'#FAF7F2', sub:'#9ca3af', accent:'#8B6F47', accentHover:'#a07d54',
  border:'#2a2a2a', borderAccent:'rgba(139,111,71,0.2)',
  input:'#222222', success:'#22c55e', danger:'#ef4444',
}

const Badge=({cor,label})=><span style={{background:cor+'22',color:cor,border:`1px solid ${cor}44`,borderRadius:99,padding:'2px 10px',fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>{label}</span>
const Tag=({cor,label})=><span style={{background:cor+'18',color:cor,border:`1px solid ${cor}33`,borderRadius:99,padding:'1px 8px',fontSize:11,fontWeight:500}}>{label}</span>

const Btn=({children,onClick,variant='primary',size='md',disabled=false})=>{
  const v={
    primary:{background:D.accent,color:'#fff',border:'none'},
    secondary:{background:D.card,color:D.text,border:`1px solid ${D.border}`},
    ghost:{background:'transparent',color:D.sub,border:'1px solid transparent'},
    danger:{background:D.danger+'18',color:D.danger,border:`1px solid ${D.danger}44`},
    success:{background:D.success+'18',color:D.success,border:`1px solid ${D.success}44`},
    dark:{background:D.bg,color:'#fff',border:`1px solid ${D.border}`},
  }
  return <button onClick={onClick} disabled={disabled} style={{borderRadius:8,fontWeight:600,cursor:disabled?'not-allowed':'pointer',transition:'all 0.15s',fontFamily:'inherit',opacity:disabled?0.5:1,fontSize:size==='sm'?12:14,padding:size==='sm'?'5px 12px':'8px 18px',...v[variant]}}>{children}</button>
}

const Input=({label,value,onChange,type='text',placeholder='',required=false})=>(
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:D.sub,letterSpacing:'0.04em'}}>{label}{required&&<span style={{color:D.danger}}> *</span>}</label>}
    <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,color:D.text,background:D.input,outline:'none',fontFamily:'inherit'}}/>
  </div>
)

const Sel=({label,value,onChange,options,placeholder='Selecionar...'})=>(
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:D.sub,letterSpacing:'0.04em'}}>{label}</label>}
    <select value={value||''} onChange={e=>onChange(e.target.value)}
      style={{border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,color:D.text,background:D.input,outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
      <option value=''>{placeholder}</option>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)

const Modal=({open,onClose,title,children,width=580})=>{
  if(!open) return null
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:16,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 30px 80px rgba(0,0,0,0.6)'}}>
        <div style={{padding:'20px 24px 16px',borderBottom:`1px solid ${D.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:D.text}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:D.sub,lineHeight:1}}>×</button>
        </div>
        <div style={{padding:24,overflowY:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  )
}

const Spinner=()=><div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60}}><div style={{width:28,height:28,border:`3px solid ${D.border}`,borderTopColor:D.accent,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/></div>
const Toast=({msg,type='success'})=><div style={{position:'fixed',bottom:24,right:24,background:type==='error'?D.danger+'18':'#14532d',border:`1px solid ${type==='error'?D.danger+'44':'#22c55e44'}`,color:type==='error'?D.danger:D.success,borderRadius:10,padding:'12px 18px',fontSize:13,fontWeight:600,zIndex:2000,boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}}>{type==='error'?'✕ ':'✓ '}{msg}</div>

// ─── DASHBOARD MÉTRICAS ─────────────────────────────────────
const Dashboard=({leads})=>{
  const total=leads.length,novos=leads.filter(l=>(Date.now()-new Date(l.data_cadastro).getTime())<30*86400000).length
  const conv=leads.filter(l=>l.fechou).length,aguard=leads.filter(l=>l.aguardando_retorno).length
  return(
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}>
      {[{label:'Total de Leads',value:total,sub:'na clínica',color:D.text},
        {label:'Novos (30 dias)',value:novos,sub:'cadastrados',color:'#3B82F6'},
        {label:'Conversões',value:conv,sub:`${total>0?Math.round(conv/total*100):0}% de taxa`,color:D.success},
        {label:'Aguardando',value:aguard,sub:'em aberto',color:'#F59E0B'}
      ].map(c=>(
        <div key={c.label} style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:12,padding:'18px 20px',flex:1,minWidth:130}}>
          <div style={{fontSize:28,fontWeight:800,color:c.color,letterSpacing:'-0.03em'}}>{c.value}</div>
          <div style={{fontSize:12,fontWeight:600,color:D.text,marginTop:2}}>{c.label}</div>
          <div style={{fontSize:11,color:D.sub,marginTop:1}}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ─── LEAD MODAL ──────────────────────────────────────────────
const LeadModal=({lead,onClose,estagios,statusList,etiquetas,interesses,onSave,saving})=>{
  const blank={nome:'',sobrenome:'',whatsapp:'',email:'',origem:'',estagio_id:'',status_id:'',interesses:[],etiquetas:[],aguardando_retorno:false,fechou:false,sinal_pago:false,valor:'',valor_sinal:'',proximo_agendamento_data:'',proximo_agendamento_horario:'',proximo_agendamento_local:'',proximo_agendamento_procedimento:'',ultima_interacao_contexto:'',observacoes:'',como_conheceu:'',cidade_bairro:'',indicado_por:'',numero_sessoes:'',ja_foi_cliente:false}
  const [form,setForm]=useState(lead?{...lead}:blank)
  const [tab,setTab]=useState('dados')
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const toggleArr=(arr,val)=>(arr||[]).includes(val)?(arr||[]).filter(x=>x!==val):[...(arr||[]),val]
  const tabS=a=>({padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',borderBottom:a?`2px solid ${D.accent}`:'2px solid transparent',color:a?D.text:D.sub,background:'none',border:'none',fontFamily:'inherit'})

  const inputStyle={border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,color:D.text,background:D.input,outline:'none',fontFamily:'inherit',width:'100%',boxSizing:'border-box'}
  const labelStyle={fontSize:12,fontWeight:600,color:D.sub,letterSpacing:'0.04em',display:'block',marginBottom:5}

  return(
    <Modal open onClose={onClose} title={lead?`${lead.nome} ${lead.sobrenome||''}`:'Novo Lead'} width={680}>
      <div style={{display:'flex',borderBottom:`1px solid ${D.border}`,marginBottom:20,marginTop:-8}}>
        {[['dados','Dados'],['agendamento','Agendamento'],['extras','Extras']].map(([k,l])=><button key={k} style={tabS(tab===k)} onClick={()=>setTab(k)}>{l}</button>)}
      </div>
      {tab==='dados'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Input label="Nome" value={form.nome} onChange={v=>set('nome',v)} required/>
          <Input label="Sobrenome" value={form.sobrenome} onChange={v=>set('sobrenome',v)}/>
          <Input label="WhatsApp" value={form.whatsapp} onChange={v=>set('whatsapp',v)} required placeholder="5521999990000"/>
          <Input label="Email" value={form.email} onChange={v=>set('email',v)} type="email"/>
          <Sel label="Estágio" value={form.estagio_id} onChange={v=>set('estagio_id',v)} options={estagios.map(e=>({value:e.id,label:e.nome}))}/>
          <Sel label="Status" value={form.status_id} onChange={v=>set('status_id',v)} options={statusList.map(s=>({value:s.id,label:s.nome}))}/>
          <Sel label="Origem" value={form.origem} onChange={v=>set('origem',v)} options={['WhatsApp','Instagram','Indicação','Google','Outro'].map(o=>({value:o,label:o}))}/>
          <Input label="Valor (R$)" value={form.valor} onChange={v=>set('valor',v)} type="number"/>
          <div style={{gridColumn:'1/-1'}}>
            <label style={labelStyle}>INTERESSES</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {interesses.map(i=><button key={i.id} onClick={()=>set('interesses',toggleArr(form.interesses,i.id))}
                style={{padding:'5px 12px',borderRadius:99,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
                  border:(form.interesses||[]).includes(i.id)?`1.5px solid ${D.accent}`:`1.5px solid ${D.border}`,
                  background:(form.interesses||[]).includes(i.id)?D.accent+'22':'transparent',
                  color:(form.interesses||[]).includes(i.id)?D.accent:D.sub}}>{i.nome}</button>)}
            </div>
          </div>
          <div style={{gridColumn:'1/-1'}}>
            <label style={labelStyle}>ETIQUETAS</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {etiquetas.map(t=><button key={t.id} onClick={()=>set('etiquetas',toggleArr(form.etiquetas,t.id))}
                style={{padding:'5px 12px',borderRadius:99,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
                  border:(form.etiquetas||[]).includes(t.id)?`1.5px solid ${t.cor}`:`1.5px solid ${D.border}`,
                  background:(form.etiquetas||[]).includes(t.id)?t.cor+'18':'transparent',
                  color:(form.etiquetas||[]).includes(t.id)?t.cor:D.sub}}>{t.nome}</button>)}
            </div>
          </div>
          <div style={{gridColumn:'1/-1',display:'flex',gap:20,flexWrap:'wrap'}}>
            {[['aguardando_retorno','Aguardando retorno'],['fechou','Fechou negócio'],['sinal_pago','Sinal pago']].map(([k,l])=>(
              <label key={k} style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:D.text,cursor:'pointer'}}>
                <input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)} style={{width:15,height:15,cursor:'pointer',accentColor:D.accent}}/>{l}
              </label>
            ))}
          </div>
          <div style={{gridColumn:'1/-1'}}><label style={labelStyle}>ÚLTIMA INTERAÇÃO</label><textarea value={form.ultima_interacao_contexto||''} onChange={e=>set('ultima_interacao_contexto',e.target.value)} rows={2} style={{...inputStyle,resize:'vertical'}}/></div>
          <div style={{gridColumn:'1/-1'}}><label style={labelStyle}>OBSERVAÇÕES</label><textarea value={form.observacoes||''} onChange={e=>set('observacoes',e.target.value)} rows={2} style={{...inputStyle,resize:'vertical'}}/></div>
        </div>
      )}
      {tab==='agendamento'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <Input label="Data/hora" value={form.proximo_agendamento_data?form.proximo_agendamento_data.slice(0,16):''} onChange={v=>set('proximo_agendamento_data',v)} type="datetime-local"/>
        <Input label="Horário" value={form.proximo_agendamento_horario} onChange={v=>set('proximo_agendamento_horario',v)} placeholder="14:00"/>
        <Input label="Procedimento" value={form.proximo_agendamento_procedimento} onChange={v=>set('proximo_agendamento_procedimento',v)}/>
        <Input label="Local" value={form.proximo_agendamento_local} onChange={v=>set('proximo_agendamento_local',v)}/>
        {form.sinal_pago&&<Input label="Valor do sinal (R$)" value={form.valor_sinal} onChange={v=>set('valor_sinal',v)} type="number"/>}
      </div>)}
      {tab==='extras'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <Input label="Como conheceu" value={form.como_conheceu} onChange={v=>set('como_conheceu',v)}/>
        <Input label="Cidade / Bairro" value={form.cidade_bairro} onChange={v=>set('cidade_bairro',v)}/>
        <Input label="Indicado por" value={form.indicado_por} onChange={v=>set('indicado_por',v)}/>
        <Input label="Nº de sessões" value={form.numero_sessoes} onChange={v=>set('numero_sessoes',v)} type="number"/>
        <div style={{gridColumn:'1/-1'}}><label style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:D.text,cursor:'pointer'}}><input type="checkbox" checked={!!form.ja_foi_cliente} onChange={e=>set('ja_foi_cliente',e.target.checked)} style={{width:15,height:15,accentColor:D.accent}}/>Já foi cliente antes</label></div>
      </div>)}
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:`1px solid ${D.border}`}}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={()=>onSave(form)} disabled={saving}>{saving?'Salvando...':'Salvar lead'}</Btn>
      </div>
    </Modal>
  )
}

// ─── IMPORTAR LEADS VIA CSV/EXCEL ────────────────────────────
const ImportarLeadsModal=({onClose,onImport})=>{
  const [rows,setRows]=useState([])
  const [headers,setHeaders]=useState([])
  const [mapeamento,setMapeamento]=useState({})
  const [importing,setImporting]=useState(false)
  const [step,setStep]=useState(1)

  const CAMPOS_LEAD=[
    {value:'nome',label:'Nome'},
    {value:'sobrenome',label:'Sobrenome'},
    {value:'whatsapp',label:'WhatsApp'},
    {value:'email',label:'Email'},
    {value:'cidade_bairro',label:'Cidade/Bairro'},
    {value:'origem',label:'Origem'},
    {value:'observacoes',label:'Observações'},
    {value:'_ignorar',label:'— Ignorar —'},
  ]

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/)
    const hdrs = lines[0].split(/[,;\t]/).map(h => h.replace(/^"|"$/g,'').trim())
    const data = lines.slice(1).map(line => {
      const cols = line.split(/[,;\t]/).map(c => c.replace(/^"|"$/g,'').trim())
      const obj = {}
      hdrs.forEach((h,i) => { obj[h] = cols[i]||'' })
      return obj
    }).filter(r => Object.values(r).some(v=>v))
    return { hdrs, data }
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    const { hdrs, data } = parseCSV(text)
    setHeaders(hdrs)
    setRows(data)
    // Auto-mapear por nome
    const autoMap = {}
    hdrs.forEach(h => {
      const hl = h.toLowerCase()
      if (hl.includes('nome') && !hl.includes('sobre')) autoMap[h]='nome'
      else if (hl.includes('sobre')) autoMap[h]='sobrenome'
      else if (hl.includes('whats')||hl.includes('fone')||hl.includes('tel')) autoMap[h]='whatsapp'
      else if (hl.includes('email')) autoMap[h]='email'
      else if (hl.includes('cidad')||hl.includes('bairro')) autoMap[h]='cidade_bairro'
      else if (hl.includes('origem')) autoMap[h]='origem'
      else autoMap[h]='_ignorar'
    })
    setMapeamento(autoMap)
    setStep(2)
  }

  const handleImport = async () => {
    setImporting(true)
    const leadsData = rows.map(row => {
      const lead = {}
      Object.entries(mapeamento).forEach(([col, campo]) => {
        if (campo !== '_ignorar' && row[col]) lead[campo] = row[col]
      })
      return lead
    }).filter(l => l.nome || l.whatsapp)
    await onImport(leadsData)
    setImporting(false)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Importar Leads via CSV/Excel" width={720}>
      {step===1 && (
        <div style={{display:'flex',flexDirection:'column',gap:20,alignItems:'center',padding:'20px 0'}}>
          <div style={{fontSize:48}}>📊</div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:15,fontWeight:700,color:D.text,marginBottom:6}}>Selecione o arquivo</div>
            <div style={{fontSize:13,color:D.sub}}>Formatos suportados: CSV, TSV (exportado do Excel)</div>
          </div>
          <label style={{padding:'10px 24px',borderRadius:10,border:`1px solid ${D.accent}`,background:D.accent+'18',color:D.accent,cursor:'pointer',fontSize:13,fontWeight:600}}>
            Selecionar arquivo
            <input type="file" accept=".csv,.tsv,.txt" onChange={handleFile} style={{display:'none'}}/>
          </label>
          <div style={{fontSize:12,color:D.sub,background:D.input,borderRadius:8,padding:'10px 16px',width:'100%'}}>
            <strong style={{color:D.text}}>Dica:</strong> No Excel, vá em Arquivo → Salvar como → CSV (separado por vírgulas)
          </div>
        </div>
      )}
      {step===2 && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{fontSize:13,color:D.sub}}>{rows.length} registros encontrados. Mapeie as colunas:</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {headers.map(h => (
              <div key={h} style={{display:'flex',flexDirection:'column',gap:4}}>
                <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.04em'}}>{h.toUpperCase()}</label>
                <select value={mapeamento[h]||'_ignorar'} onChange={e=>setMapeamento(m=>({...m,[h]:e.target.value}))}
                  style={{border:`1px solid ${D.border}`,borderRadius:8,padding:'7px 10px',fontSize:12,color:D.text,background:D.input,outline:'none',fontFamily:'inherit'}}>
                  {CAMPOS_LEAD.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{background:D.input,borderRadius:8,overflow:'hidden',maxHeight:200,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr>{headers.map(h=><th key={h} style={{padding:'8px 10px',textAlign:'left',color:D.sub,borderBottom:`1px solid ${D.border}`,fontWeight:700,fontSize:11,letterSpacing:'0.04em'}}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0,5).map((r,i)=>(
                  <tr key={i}>{headers.map(h=><td key={h} style={{padding:'6px 10px',color:D.text,borderBottom:`1px solid ${D.border}22`,fontSize:12}}>{r[h]||''}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length>5&&<div style={{fontSize:12,color:D.sub,textAlign:'center'}}>Mostrando 5 de {rows.length} registros</div>}
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:12,borderTop:`1px solid ${D.border}`}}>
            <Btn variant="secondary" onClick={()=>setStep(1)}>Voltar</Btn>
            <Btn variant="primary" onClick={handleImport} disabled={importing}>{importing?'Importando...`':`Importar ${rows.length} leads`}</Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── CONFIGURAR CRM (Estágios, Status, Etiquetas, Interesses)
const CRMConfigModal=({onClose,clinicId,estagios,statusList,etiquetas,interesses,configActions})=>{
  const {addEstagio,addStatus,addEtiqueta,addInteresse,deleteEstagio,deleteStatus,deleteEtiqueta,deleteInteresse}=configActions
  const [tab,setTab]=useState('estagios')
  const [newNome,setNewNome]=useState('')
  const [newCor,setNewCor]=useState('#8B6F47')

  const tabData={
    estagios:{label:'Estágios',data:estagios,add:()=>addEstagio(newNome,newCor),del:deleteEstagio,hasCor:true},
    status:{label:'Status',data:statusList,add:()=>addStatus(newNome,newCor),del:deleteStatus,hasCor:true},
    etiquetas:{label:'Etiquetas',data:etiquetas,add:()=>addEtiqueta(newNome,newCor),del:deleteEtiqueta,hasCor:true},
    interesses:{label:'Interesses',data:interesses,add:()=>addInteresse(newNome),del:deleteInteresse,hasCor:false},
  }
  const cur=tabData[tab]

  const handleAdd=async()=>{
    if(!newNome.trim())return
    await cur.add()
    setNewNome('');setNewCor('#8B6F47')
  }

  const tabStyle=a=>({padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer',borderBottom:a?`2px solid ${D.accent}`:'2px solid transparent',color:a?D.text:D.sub,background:'none',border:'none',fontFamily:'inherit'})

  return(
    <Modal open onClose={onClose} title="Configurar CRM" width={560}>
      <div style={{display:'flex',borderBottom:`1px solid ${D.border}`,marginBottom:20,marginTop:-8}}>
        {Object.entries(tabData).map(([k,v])=><button key={k} style={tabStyle(tab===k)} onClick={()=>setTab(k)}>{v.label}</button>)}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <Input label={`Novo ${cur.label.slice(0,-1)}`} value={newNome} onChange={setNewNome} placeholder={`Nome do ${cur.label.slice(0,-1).toLowerCase()}`}/>
          </div>
          {cur.hasCor&&(
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <label style={{fontSize:12,fontWeight:600,color:D.sub}}>COR</label>
              <input type="color" value={newCor} onChange={e=>setNewCor(e.target.value)}
                style={{width:42,height:38,border:`1px solid ${D.border}`,borderRadius:8,cursor:'pointer',padding:3,background:D.input}}/>
            </div>
          )}
          <Btn onClick={handleAdd}>Adicionar</Btn>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:320,overflowY:'auto'}}>
          {cur.data.length===0&&<div style={{textAlign:'center',padding:24,color:D.sub,fontSize:13}}>Nenhum item cadastrado</div>}
          {cur.data.map(item=>(
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,background:D.input,borderRadius:8,padding:'10px 12px',border:`1px solid ${D.border}`}}>
              {cur.hasCor&&<div style={{width:14,height:14,borderRadius:'50%',background:item.cor,flexShrink:0}}/>}
              <span style={{flex:1,fontSize:13,color:D.text,fontWeight:500}}>{item.nome}</span>
              {cur.hasCor&&<span style={{fontSize:11,color:item.cor,background:item.cor+'18',borderRadius:99,padding:'1px 8px'}}>{item.cor}</span>}
              <button onClick={()=>cur.del(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:D.danger,fontSize:16,lineHeight:1}}>×</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ─── MODELOS DE MENSAGEM ─────────────────────────────────────
const ModelosModal=({onClose,templates,clinicId,createTemplate,deleteTemplate})=>{
  const [newNome,setNewNome]=useState('')
  const [newConteudo,setNewConteudo]=useState('')
  const [saving,setSaving]=useState(false)

  const VARIAVEIS=['{{nome}}','{{sobrenome}}','{{data}}','{{horario}}','{{procedimento}}','{{local}}','{{valor}}']

  const handleSave=async()=>{
    if(!newNome.trim()||!newConteudo.trim())return
    setSaving(true)
    await createTemplate(newNome,newConteudo)
    setSaving(false)
    setNewNome('');setNewConteudo('')
  }

  return(
    <Modal open onClose={onClose} title="Modelos de Mensagem" width={640}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{background:D.input,borderRadius:10,padding:14,border:`1px solid ${D.border}`}}>
          <div style={{fontSize:12,fontWeight:700,color:D.sub,marginBottom:10,letterSpacing:'0.05em'}}>NOVO MODELO</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <Input label="Nome do modelo" value={newNome} onChange={setNewNome} placeholder="Ex: Confirmação de agendamento"/>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <label style={{fontSize:12,fontWeight:600,color:D.sub}}>MENSAGEM</label>
              <textarea value={newConteudo} onChange={e=>setNewConteudo(e.target.value)} rows={4}
                placeholder="Olá {{nome}}! Confirmando seu agendamento de {{procedimento}} no dia {{data}} às {{horario}}."
                style={{border:`1px solid ${D.border}`,borderRadius:8,padding:'9px 12px',fontSize:13,color:D.text,background:D.cardAlt,outline:'none',fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',width:'100%'}}/>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:11,color:D.sub}}>Variáveis:</span>
              {VARIAVEIS.map(v=>(
                <button key={v} onClick={()=>setNewConteudo(c=>c+v)}
                  style={{padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',border:`1px solid ${D.accent}44`,background:D.accent+'18',color:D.accent,fontFamily:'inherit'}}>
                  {v}
                </button>
              ))}
            </div>
            <div style={{fontSize:11,color:D.sub,background:D.bg,borderRadius:6,padding:'6px 10px',border:`1px solid ${D.border}`}}>
              💡 Use {'{{nome}}'}, {'{{data}}'}, {'{{horario}}'}, {'{{procedimento}}'}, {'{{local}}'}, {'{{valor}}'} — serão substituídas pelos dados do lead automaticamente.
            </div>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <Btn onClick={handleSave} disabled={saving}>{saving?'Salvando...':'Salvar modelo'}</Btn>
            </div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:280,overflowY:'auto'}}>
          {templates.length===0&&<div style={{textAlign:'center',padding:24,color:D.sub,fontSize:13}}>Nenhum modelo criado</div>}
          {templates.map(t=>(
            <div key={t.id} style={{background:D.input,borderRadius:10,padding:14,border:`1px solid ${D.border}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:700,color:D.text}}>{t.nome}</span>
                <button onClick={()=>deleteTemplate(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:D.danger,fontSize:16,lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:12,color:D.sub,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{t.conteudo}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ─── LOGIN ────────────────────────────────────────────────────
const Login=({onLogin})=>{
  const [email,setEmail]=useState(''),[senha,setSenha]=useState(''),[loading,setLoading]=useState(false),[erro,setErro]=useState('')
  const handleLogin=async()=>{
    if(!email||!senha)return setErro('Preencha email e senha.')
    setLoading(true);setErro('')
    const{error}=await supabase.auth.signInWithPassword({email,password:senha})
    if(error)setErro('Email ou senha incorretos.')
    else onLogin()
    setLoading(false)
  }
  return(
    <div style={{minHeight:'100vh',background:D.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:16,padding:40,width:380,boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:36}}>
          <div style={{width:38,height:38,borderRadius:10,background:D.accent,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:15,fontWeight:800}}>P</span></div>
          <div><div style={{fontSize:16,fontWeight:800,color:D.text}}>Pluz Tech</div><div style={{fontSize:11,color:D.sub}}>Sistema de Gestão</div></div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="seu@email.com"/>
          <Input label="Senha" value={senha} onChange={setSenha} type="password" placeholder="••••••••"/>
          {erro&&<div style={{fontSize:12,color:D.danger,background:D.danger+'18',padding:'8px 12px',borderRadius:8}}>{erro}</div>}
          <button onClick={handleLogin} disabled={loading}
            style={{padding:'10px',borderRadius:8,background:D.accent,color:'#fff',border:'none',cursor:loading?'not-allowed':'pointer',fontSize:14,fontWeight:700,fontFamily:'inherit',opacity:loading?0.6:1,marginTop:4}}>
            {loading?'Entrando...':'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── VARIÁVEIS ────────────────────────────────────────────────
// Retorna os valores padrão de cada variável a partir dos dados do lead
const defaultVarValues=(lead)=>({
  nome: lead.nome||'',
  sobrenome: lead.sobrenome||'',
  procedimento: lead.proximo_agendamento_procedimento||'',
  data: lead.proximo_agendamento_data?new Date(lead.proximo_agendamento_data).toLocaleDateString('pt-BR'):'',
  horario: lead.proximo_agendamento_horario||'',
  local: lead.proximo_agendamento_local||'',
  valor: lead.valor?('R$ '+Number(lead.valor).toLocaleString('pt-BR')):'',
})

// Substitui variáveis usando overrides por lead (ou valor padrão do lead)
const substituirVariaveis=(texto,lead,overrides={})=>{
  if(!texto||!lead) return texto||''
  const v={...defaultVarValues(lead),...overrides}
  return texto
    .replace(/\{\{nome\}\}|\{nome\}/gi, v.nome)
    .replace(/\{\{sobrenome\}\}|\{sobrenome\}/gi, v.sobrenome)
    .replace(/\{\{procedimento\}\}|\{procedimento\}/gi, v.procedimento)
    .replace(/\{\{data\}\}|\{data\}/gi, v.data)
    .replace(/\{\{horario\}\}|\{horario\}/gi, v.horario)
    .replace(/\{\{local\}\}|\{local\}/gi, v.local)
    .replace(/\{\{valor\}\}|\{valor\}/gi, v.valor)
}

// Detecta quais variáveis estão sendo usadas em um texto
const detectarVariaveis=(texto)=>{
  const todas=['nome','sobrenome','data','horario','procedimento','local','valor']
  return todas.filter(v=>new RegExp(`\\{\\{${v}\\}\\}|\\{${v}\\}`,'i').test(texto))
}

// ─── DISPARO MODAL ───────────────────────────────────────────
function DisparoModal({leads,selected,templates,onClose,onCreateDisparo,onExecutarDisparo,onCancelarExecucao}){
  const leadsAlvo=leads.filter(l=>selected.includes(l.id))
  const [templateId,setTemplateId]=useState(templates[0]?.id||'')
  const [mensagemCustom,setMensagemCustom]=useState('')
  const [usarCustom,setUsarCustom]=useState(false)
  const [agendadoPara,setAgendadoPara]=useState('')
  const [intervalo,setIntervalo]=useState('aleatorio')
  const [intervaloFixo,setIntervaloFixo]=useState(60)
  const [previewIdx,setPreviewIdx]=useState(0)
  const [showVarTable,setShowVarTable]=useState(false)
  // { [leadId]: { nome:'', horario:'', ... } } — overrides por lead
  const [varValues,setVarValues]=useState(()=>{
    const init={}
    leads.filter(l=>selected.includes(l.id)).forEach(l=>{init[l.id]=defaultVarValues(l)})
    return init
  })

  // Fases: 'config' | 'executando' | 'concluido'
  const [fase,setFase]=useState('config')
  const [progresso,setProgresso]=useState({total:0,enviados:0,erros:0,idx:0,atual:null})
  const [resultado,setResultado]=useState(null)
  const [erroMsg,setErroMsg]=useState(null)

  const VARIAVEIS=['{{nome}}','{{sobrenome}}','{{data}}','{{horario}}','{{procedimento}}','{{local}}','{{valor}}']
  const template=templates.find(t=>t.id===templateId)
  const textoBase=usarCustom?mensagemCustom:(template?.conteudo||'')
  const varsDetectadas=detectarVariaveis(textoBase)
  const leadPreview=leadsAlvo[previewIdx]
  const msgPreview=substituirVariaveis(textoBase,leadPreview,varValues[leadPreview?.id])

  const setVar=(leadId,varName,value)=>setVarValues(prev=>({...prev,[leadId]:{...prev[leadId],[varName]:value}}))

  const handleConfirm=async()=>{
    if(!textoBase.trim()){alert('Selecione um template ou escreva uma mensagem.');return}
    const msgPorLead={}
    leadsAlvo.forEach(l=>{msgPorLead[l.id]={whatsapp:l.whatsapp,mensagem:substituirVariaveis(textoBase,l,varValues[l.id])}})
    const disparoData={
      template_id:usarCustom?null:templateId,
      mensagem_base:textoBase,
      agendado_para:agendadoPara||null,
      intervalo_tipo:intervalo,
      intervalo_segundos:intervalo==='fixo'?intervaloFixo:null,
      status:'pendente',
    }

    // Salvar no banco
    const {data,error}=await onCreateDisparo(disparoData,selected,msgPorLead)
    if(error){setErroMsg('Erro ao criar disparo: '+error.message);return}

    // Se agendado: só salva, não executa agora
    if(agendadoPara){
      setResultado({agendado:true,agendadoPara,total:leadsAlvo.length})
      setFase('concluido')
      return
    }

    // Executar imediatamente
    setFase('executando')
    setProgresso({total:leadsAlvo.length,enviados:0,erros:0,idx:0,atual:null})
    const res=await onExecutarDisparo(data.id,(prog)=>setProgresso(prog))
    if(res?.error){setErroMsg(res.error);setFase('config');return}
    setResultado(res)
    setFase('concluido')
  }

  const handleCancelar=()=>{
    onCancelarExecucao?.()
  }

  const pct=progresso.total>0?Math.round((progresso.idx/progresso.total)*100):0
  const btnToggle=(ativo)=>({padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',border:ativo?`1.5px solid ${D.accent}`:`1.5px solid ${D.border}`,background:ativo?D.accent+'22':'transparent',color:ativo?D.accent:D.sub})
  const rowS={padding:'12px 0',borderBottom:`1px solid ${D.border}`,display:'flex',alignItems:'center',gap:10}

  // ── Fase: executando ─────────────────────────────────────────
  if(fase==='executando') return(
    <Modal open onClose={()=>{}} title="Disparando mensagens..." width={480}>
      <div style={{display:'flex',flexDirection:'column',gap:20,padding:'8px 0'}}>
        <div style={{background:D.input,borderRadius:10,padding:16,border:`1px solid ${D.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <span style={{fontSize:13,fontWeight:600,color:D.text}}>{progresso.idx} / {progresso.total} enviados</span>
            <span style={{fontSize:13,fontWeight:700,color:D.accent}}>{pct}%</span>
          </div>
          <div style={{background:D.border,borderRadius:99,height:6,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:99,background:D.accent,width:pct+'%',transition:'width 0.4s ease'}}/>
          </div>
        </div>

        <div style={{display:'flex',gap:16}}>
          <div style={{flex:1,background:'#14532d22',border:'1px solid #22c55e33',borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:D.success}}>{progresso.enviados}</div>
            <div style={{fontSize:11,color:D.sub,marginTop:2}}>ENVIADOS</div>
          </div>
          <div style={{flex:1,background:D.danger+'18',border:`1px solid ${D.danger}33`,borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:D.danger}}>{progresso.erros}</div>
            <div style={{fontSize:11,color:D.sub,marginTop:2}}>ERROS</div>
          </div>
          <div style={{flex:1,background:D.input,border:`1px solid ${D.border}`,borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:800,color:D.sub}}>{progresso.total-progresso.idx}</div>
            <div style={{fontSize:11,color:D.sub,marginTop:2}}>RESTANTES</div>
          </div>
        </div>

        {progresso.atual&&(
          <div style={{fontSize:12,color:D.sub,textAlign:'center'}}>
            Enviando para <strong style={{color:D.text}}>{progresso.atual.whatsapp}</strong>...
          </div>
        )}

        <div style={{background:'#F59E0B18',border:'1px solid #F59E0B33',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#F59E0B'}}>
          Não feche esta janela enquanto o disparo estiver em andamento.
        </div>

        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <Btn variant="danger" size="sm" onClick={handleCancelar}>Interromper envio</Btn>
        </div>
      </div>
    </Modal>
  )

  // ── Fase: concluído ──────────────────────────────────────────
  if(fase==='concluido') return(
    <Modal open onClose={onClose} title={resultado?.agendado?'Disparo agendado!':resultado?.cancelado?'Disparo interrompido':'Disparo concluído!'} width={440}>
      <div style={{display:'flex',flexDirection:'column',gap:20,padding:'8px 0'}}>
        {resultado?.agendado?(
          <div style={{textAlign:'center',padding:16}}>
            <div style={{fontSize:40,marginBottom:12}}>🗓</div>
            <div style={{fontSize:15,fontWeight:700,color:D.text,marginBottom:6}}>Mensagens agendadas</div>
            <div style={{fontSize:13,color:D.sub}}>{resultado.total} mensagens programadas para {new Date(resultado.agendadoPara).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
            <div style={{fontSize:12,color:'#F59E0B',marginTop:10}}>Para executar no horário, abra o sistema e clique em "Executar" no Histórico de Disparos.</div>
          </div>
        ):(
          <div style={{display:'flex',gap:12}}>
            <div style={{flex:1,background:'#14532d22',border:'1px solid #22c55e33',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:800,color:D.success}}>{resultado?.enviados??0}</div>
              <div style={{fontSize:11,color:D.sub,marginTop:2}}>ENVIADOS</div>
            </div>
            <div style={{flex:1,background:D.danger+'18',border:`1px solid ${D.danger}33`,borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:800,color:D.danger}}>{resultado?.erros??0}</div>
              <div style={{fontSize:11,color:D.sub,marginTop:2}}>ERROS</div>
            </div>
          </div>
        )}
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <Btn variant="primary" onClick={onClose}>Fechar</Btn>
        </div>
      </div>
    </Modal>
  )

  // ── Fase: config (padrão) ────────────────────────────────────
  return(
    <Modal open onClose={onClose} title="Novo Disparo" width={720}>
      {erroMsg&&<div style={{background:D.danger+'18',border:`1px solid ${D.danger}44`,borderRadius:8,padding:'10px 14px',fontSize:13,color:D.danger,marginBottom:16}}>{erroMsg}</div>}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.05em',display:'block',marginBottom:6}}>MENSAGEM</label>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <button onClick={()=>setUsarCustom(false)} style={btnToggle(!usarCustom)}>Template</button>
              <button onClick={()=>setUsarCustom(true)} style={btnToggle(usarCustom)}>Personalizada</button>
            </div>
            {!usarCustom?(
              <select value={templateId} onChange={e=>setTemplateId(e.target.value)}
                style={{width:'100%',border:`1px solid ${D.border}`,borderRadius:8,padding:'8px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text}}>
                <option value=''>— selecione —</option>
                {templates.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            ):(
              <div>
                <textarea value={mensagemCustom} onChange={e=>setMensagemCustom(e.target.value)} rows={5}
                  placeholder={'Olá {{nome}}, tudo bem?\n\nUse {{nome}}, {{data}}, {{horario}}, {{procedimento}}, {{local}}, {{valor}}'}
                  style={{width:'100%',border:`1px solid ${D.border}`,borderRadius:8,padding:'8px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text,resize:'vertical',boxSizing:'border-box'}}/>
                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:6}}>
                  {VARIAVEIS.map(v=>(
                    <button key={v} onClick={()=>setMensagemCustom(c=>c+v)}
                      style={{padding:'2px 7px',borderRadius:5,fontSize:10,fontWeight:600,cursor:'pointer',border:`1px solid ${D.accent}44`,background:D.accent+'18',color:D.accent,fontFamily:'inherit'}}>{v}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.05em',display:'block',marginBottom:6}}>AGENDAMENTO</label>
            <input type="datetime-local" value={agendadoPara} onChange={e=>setAgendadoPara(e.target.value)}
              style={{width:'100%',border:`1px solid ${D.border}`,borderRadius:8,padding:'8px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text}}/>
            <div style={{fontSize:11,color:D.sub,marginTop:4}}>Vazio = disparar imediatamente</div>
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.05em',display:'block',marginBottom:6}}>INTERVALO ENTRE MENSAGENS</label>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              {[['aleatorio','Aleatório (1–4 min)'],['fixo','Fixo']].map(([v,l])=>(
                <button key={v} onClick={()=>setIntervalo(v)} style={btnToggle(intervalo===v)}>{l}</button>
              ))}
            </div>
            {intervalo==='fixo'&&(
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="number" value={intervaloFixo} onChange={e=>setIntervaloFixo(Number(e.target.value))} min={10} max={600}
                  style={{width:80,border:`1px solid ${D.border}`,borderRadius:8,padding:'7px 10px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text}}/>
                <span style={{fontSize:13,color:D.sub}}>segundos</span>
              </div>
            )}
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:D.input,borderRadius:10,padding:14,border:`1px solid ${D.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.05em',marginBottom:8}}>{'PRÉVIA ('+(leadsAlvo.length>1?('lead '+(previewIdx+1)+'/'+leadsAlvo.length):(leadPreview?.nome||'—'))+')'}</div>
            {leadsAlvo.length>1&&(
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <button onClick={()=>setPreviewIdx(i=>Math.max(0,i-1))} disabled={previewIdx===0}
                  style={{padding:'2px 8px',fontSize:12,cursor:'pointer',borderRadius:6,border:`1px solid ${D.border}`,background:D.cardAlt,color:D.text,fontFamily:'inherit'}}>‹</button>
                <button onClick={()=>setPreviewIdx(i=>Math.min(leadsAlvo.length-1,i+1))} disabled={previewIdx===leadsAlvo.length-1}
                  style={{padding:'2px 8px',fontSize:12,cursor:'pointer',borderRadius:6,border:`1px solid ${D.border}`,background:D.cardAlt,color:D.text,fontFamily:'inherit'}}>›</button>
              </div>
            )}
            <div style={{fontSize:13,color:D.text,lineHeight:1.6,whiteSpace:'pre-wrap',minHeight:80}}>{msgPreview||<span style={{color:D.sub}}>Selecione um template para ver a prévia</span>}</div>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.05em',marginBottom:8}}>LEADS SELECIONADOS ({leadsAlvo.length})</div>
            <div style={{maxHeight:180,overflowY:'auto',display:'flex',flexDirection:'column'}}>
              {leadsAlvo.map((l,i)=>(
                <div key={l.id} style={{...rowS,opacity:i===previewIdx?1:0.5}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:i===previewIdx?D.success:D.border,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:D.text}}>{l.nome} {l.sobrenome}</div>
                    <div style={{fontSize:11,color:D.sub}}>{l.whatsapp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de variáveis por lead */}
      {textoBase&&varsDetectadas.length>0&&(
        <div style={{marginTop:20,borderTop:`1px solid ${D.border}`,paddingTop:16}}>
          <button onClick={()=>setShowVarTable(v=>!v)}
            style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',padding:0,marginBottom:showVarTable?12:0,fontFamily:'inherit'}}>
            <span style={{fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.05em'}}>PERSONALIZAR VARIÁVEIS POR LEAD</span>
            <span style={{fontSize:11,color:D.sub}}>{showVarTable?'▲':'▼'}</span>
            <span style={{fontSize:11,color:D.accent,background:D.accent+'18',border:`1px solid ${D.accent}33`,borderRadius:99,padding:'1px 8px'}}>
              {varsDetectadas.map(v=>`{{${v}}}`).join(' ')}
            </span>
          </button>
          {showVarTable&&(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr>
                    <th style={{padding:'7px 10px',textAlign:'left',fontWeight:700,color:D.sub,fontSize:11,letterSpacing:'0.05em',borderBottom:`1px solid ${D.border}`,background:D.cardAlt,whiteSpace:'nowrap'}}>LEAD</th>
                    {varsDetectadas.map(v=>(
                      <th key={v} style={{padding:'7px 10px',textAlign:'left',fontWeight:700,color:D.accent,fontSize:11,letterSpacing:'0.05em',borderBottom:`1px solid ${D.border}`,background:D.cardAlt,whiteSpace:'nowrap'}}>{`{{${v}}}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leadsAlvo.map((l,i)=>(
                    <tr key={l.id} style={{background:i===previewIdx?D.accent+'10':'transparent'}} onClick={()=>setPreviewIdx(i)}>
                      <td style={{padding:'6px 10px',borderBottom:`1px solid ${D.border}22`,whiteSpace:'nowrap',cursor:'pointer'}}>
                        <div style={{fontWeight:600,color:D.text}}>{l.nome} {l.sobrenome}</div>
                        <div style={{fontSize:11,color:D.sub}}>{l.whatsapp}</div>
                      </td>
                      {varsDetectadas.map(varName=>(
                        <td key={varName} style={{padding:'4px 6px',borderBottom:`1px solid ${D.border}22`}}>
                          <input
                            value={varValues[l.id]?.[varName]??''}
                            onChange={e=>setVar(l.id,varName,e.target.value)}
                            onClick={e=>e.stopPropagation()}
                            placeholder={defaultVarValues(l)[varName]||`${varName}...`}
                            style={{width:'100%',minWidth:90,border:`1px solid ${D.border}`,borderRadius:6,padding:'5px 8px',fontSize:12,background:D.input,color:D.text,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20,paddingTop:16,borderTop:`1px solid ${D.border}`}}>
        <span style={{fontSize:12,color:D.sub}}>{leadsAlvo.length} mensagem{leadsAlvo.length!==1?'s':''} {agendadoPara?'serão agendadas':'serão disparadas'}</span>
        <div style={{display:'flex',gap:10}}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleConfirm} disabled={!textoBase.trim()}>{agendadoPara?'Agendar disparo':'Disparar agora'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── CRM INLINE ──────────────────────────────────────────────
function CRMInline({ clinic, clinics, estagios, statusList, etiquetas, interesses, leads, leadsLoading, createLead, updateLead, templates, createTemplate, deleteTemplate, createDisparo, executarDisparo, cancelarExecucao, disparos, refetchDisparos, configActions }) {
  const [filters,setFilters]=useState({busca:'',estagio:'',status:'',etiqueta:'',interesse:'',dataInicio:'',dataFim:''})
  const [selected,setSelected]=useState([])
  const [openLead,setOpenLead]=useState(null)
  const [showNewLead,setShowNewLead]=useState(false)
  const [showDisparo,setShowDisparo]=useState(false)
  const [showConfig,setShowConfig]=useState(false)
  const [showModelos,setShowModelos]=useState(false)
  const [showImportar,setShowImportar]=useState(false)
  const [showHistorico,setShowHistorico]=useState(false)
  const [saving,setSaving]=useState(false)
  const [toast,setToast]=useState(null)
  const [executandoHistorico,setExecutandoHistorico]=useState(null) // disparoId em execução pelo histórico

  const showT=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),3000)}

  const filteredLeads=useMemo(()=>leads.filter(l=>{
    if(filters.busca){const b=filters.busca.toLowerCase();if(!(`${l.nome} ${l.sobrenome||''}`.toLowerCase().includes(b))&&!(l.whatsapp||'').includes(b))return false}
    if(filters.estagio&&l.estagio_id!==filters.estagio)return false
    if(filters.status&&l.status_id!==filters.status)return false
    if(filters.etiqueta&&!(l.etiquetas||[]).includes(filters.etiqueta))return false
    if(filters.interesse&&!(l.interesses||[]).includes(filters.interesse))return false
    if(filters.dataInicio&&new Date(l.data_cadastro)<new Date(filters.dataInicio))return false
    if(filters.dataFim&&new Date(l.data_cadastro)>new Date(filters.dataFim+'T23:59:59'))return false
    return true
  }),[leads,filters])

  const getEstagio=id=>estagios.find(e=>e.id===id)
  const getStatus=id=>statusList.find(s=>s.id===id)
  const getEtiquetas=ids=>(ids||[]).map(id=>etiquetas.find(t=>t.id===id)).filter(Boolean)
  const getInteresses=ids=>(ids||[]).map(id=>interesses.find(i=>i.id===id)).filter(Boolean)
  const allSelected=filteredLeads.length>0&&selected.length===filteredLeads.length
  const toggleAll=()=>setSelected(allSelected?[]:filteredLeads.map(l=>l.id))
  const toggle=id=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])

  const handleSaveLead=async(form)=>{
    setSaving(true)
    // Limpa campos opcionais vazios para evitar erro de FK no Supabase
    const cleanForm = { ...form }
    // FKs e números: vazio → null
    if (!cleanForm.estagio_id) cleanForm.estagio_id = null
    if (!cleanForm.status_id) cleanForm.status_id = null
    if (!cleanForm.email) cleanForm.email = null
    if (!cleanForm.valor) cleanForm.valor = null
    if (!cleanForm.valor_sinal) cleanForm.valor_sinal = null
    if (!cleanForm.numero_sessoes) cleanForm.numero_sessoes = null
    // Timestamps: string vazia → null (Supabase rejeita "")
    if (!cleanForm.proximo_agendamento_data) cleanForm.proximo_agendamento_data = null
    if (!cleanForm.data_ultima_interacao) cleanForm.data_ultima_interacao = null
    const{error}=form.id?await updateLead(form.id,cleanForm):await createLead(cleanForm)
    setSaving(false)
    if(error){
      console.error('Erro ao salvar lead:', error)
      showT('Erro: '+(error.message||'Verifique os campos obrigatórios'),'error')
    }
    else{showT(form.id?'Lead atualizado!':'Lead criado!');setOpenLead(null);setShowNewLead(false)}
  }

  const handleImportarLeads=async(leadsData)=>{
    let ok=0,fail=0
    for(const lead of leadsData){
      const{error}=await createLead(lead)
      if(error)fail++; else ok++
    }
    showT(`${ok} leads importados${fail>0?`, ${fail} com erro`:''}!`, fail>0?'error':'success')
  }

  const thS={padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:D.sub,letterSpacing:'0.06em',borderBottom:`1px solid ${D.border}`,whiteSpace:'nowrap',background:D.cardAlt}
  const tdS={padding:'11px 14px',borderBottom:`1px solid ${D.border}22`,verticalAlign:'middle'}

  return(
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800,color:D.text,letterSpacing:'-0.02em'}}>CRM</h2>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {selected.length>0&&<Btn variant="secondary" size="sm" onClick={()=>setShowDisparo(true)}>📤 Disparar ({selected.length})</Btn>}
          <Btn variant="secondary" size="sm" onClick={()=>setShowImportar(true)}>📥 Importar</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>setShowModelos(true)}>📝 Modelos</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>setShowConfig(true)}>⚙ Configurar</Btn>
          <Btn variant="secondary" size="sm" onClick={()=>setShowDisparo(true)}>📤 Novo disparo</Btn>
          <Btn variant="primary" onClick={()=>setShowNewLead(true)}>+ Adicionar lead</Btn>
        </div>
      </div>

      <Dashboard leads={leads}/>

      {/* Filtros */}
      <div style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:12,padding:'14px 16px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <label style={{fontSize:11,fontWeight:600,color:D.sub,letterSpacing:'0.04em'}}>BUSCAR</label>
          <input placeholder="Nome ou número..." value={filters.busca} onChange={e=>setFilters(f=>({...f,busca:e.target.value}))}
            style={{border:`1px solid ${D.border}`,borderRadius:8,padding:'7px 11px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text,minWidth:160}}/>
        </div>
        {[{label:'ESTÁGIO',key:'estagio',opts:estagios},{label:'STATUS',key:'status',opts:statusList},{label:'ETIQUETA',key:'etiqueta',opts:etiquetas},{label:'INTERESSE',key:'interesse',opts:interesses}].map(({label,key,opts})=>(
          <div key={key} style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={{fontSize:11,fontWeight:600,color:D.sub,letterSpacing:'0.04em'}}>{label}</label>
            <select value={filters[key]} onChange={e=>setFilters(f=>({...f,[key]:e.target.value}))}
              style={{border:`1px solid ${D.border}`,borderRadius:8,padding:'7px 11px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text,cursor:'pointer'}}>
              <option value=''>Todos</option>
              {opts.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
        ))}
        {[{label:'DE',key:'dataInicio'},{label:'ATÉ',key:'dataFim'}].map(({label,key})=>(
          <div key={key} style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={{fontSize:11,fontWeight:600,color:D.sub,letterSpacing:'0.04em'}}>{label}</label>
            <input type="date" value={filters[key]} onChange={e=>setFilters(f=>({...f,[key]:e.target.value}))}
              style={{border:`1px solid ${D.border}`,borderRadius:8,padding:'7px 11px',fontSize:13,outline:'none',fontFamily:'inherit',background:D.input,color:D.text}}/>
          </div>
        ))}
        <Btn variant="ghost" size="sm" onClick={()=>setFilters({busca:'',estagio:'',status:'',etiqueta:'',interesse:'',dataInicio:'',dataFim:''})}>Limpar</Btn>
      </div>

      {/* Tabela */}
      <div style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:12,overflow:'hidden'}}>
        {leadsLoading?<Spinner/>:(
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:960}}>
              <thead>
                <tr>
                  <th style={{...thS,width:40}}><input type="checkbox" checked={allSelected} onChange={toggleAll} style={{cursor:'pointer',width:15,height:15,accentColor:D.accent}}/></th>
                  {['NOME','WHATSAPP','ESTÁGIO','STATUS','INTERESSES','ETIQUETAS','ORIGEM','CADASTRO','ÚLT. INTERAÇÃO','PRÓX. AGENDA','VALOR'].map(h=><th key={h} style={thS}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length===0&&<tr><td colSpan={12} style={{...tdS,textAlign:'center',color:D.sub,padding:48,fontSize:13}}>Nenhum lead encontrado</td></tr>}
                {filteredLeads.map(lead=>{
                  const est=getEstagio(lead.estagio_id),sta=getStatus(lead.status_id)
                  const tags=getEtiquetas(lead.etiquetas),ints=getInteresses(lead.interesses)
                  const isSel=selected.includes(lead.id)
                  return(
                    <tr key={lead.id} style={{background:isSel?D.accent+'12':'transparent',cursor:'pointer',transition:'background 0.1s'}}
                      onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='rgba(255,255,255,0.03)'}}
                      onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='transparent'}}>
                      <td style={tdS} onClick={e=>{e.stopPropagation();toggle(lead.id)}}><input type="checkbox" checked={isSel} onChange={()=>toggle(lead.id)} onClick={e=>e.stopPropagation()} style={{width:15,height:15,cursor:'pointer',accentColor:D.accent}}/></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>
                        <div style={{fontWeight:600,fontSize:13,color:D.text}}>{lead.nome} {lead.sobrenome}</div>
                        {lead.aguardando_retorno&&<div style={{fontSize:10,color:'#F59E0B',fontWeight:600,marginTop:2}}>● Aguardando</div>}
                      </td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><span style={{fontSize:12,color:D.sub,fontFamily:'monospace'}}>{lead.whatsapp}</span></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>{est?<Badge cor={est.cor} label={est.nome}/>:<span style={{color:D.border,fontSize:12}}>—</span>}</td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>{sta?<Badge cor={sta.cor} label={sta.nome}/>:<span style={{color:D.border,fontSize:12}}>—</span>}</td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{ints.map(i=><span key={i.id} style={{fontSize:11,color:D.sub,background:D.input,borderRadius:99,padding:'2px 8px'}}>{i.nome}</span>)}</div></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{tags.map(t=><Tag key={t.id} cor={t.cor} label={t.nome}/>)}</div></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><span style={{fontSize:12,color:D.sub}}>{lead.origem||'—'}</span></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><span style={{fontSize:12,color:D.sub}}>{fmtDate(lead.data_cadastro)}</span></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>
                        <div style={{fontSize:12,color:D.text}}>{timeAgo(lead.data_ultima_interacao)}</div>
                        {lead.ultima_interacao_contexto&&<div style={{fontSize:11,color:D.sub,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.ultima_interacao_contexto}</div>}
                      </td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>
                        {lead.proximo_agendamento_data
                          ?<div><div style={{fontSize:12,color:D.text,fontWeight:500}}>{fmtDateTime(lead.proximo_agendamento_data)}</div><div style={{fontSize:11,color:D.sub}}>{lead.proximo_agendamento_procedimento}</div></div>
                          :<span style={{color:D.border,fontSize:12}}>—</span>}
                      </td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>
                        {lead.valor
                          ?<span style={{fontSize:13,fontWeight:600,color:D.success}}>R$ {Number(lead.valor).toLocaleString('pt-BR')}</span>
                          :<span style={{color:D.border,fontSize:12}}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{padding:'10px 16px',borderTop:`1px solid ${D.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:12,color:D.sub}}>{filteredLeads.length} leads · {selected.length} selecionados</span>
        </div>
      </div>

      {/* Histórico de Disparos */}
      <div style={{marginTop:24}}>
        <button onClick={()=>setShowHistorico(h=>!h)}
          style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',padding:0,marginBottom:showHistorico?14:0}}>
          <span style={{fontSize:13,fontWeight:700,color:D.sub,letterSpacing:'0.04em'}}>HISTÓRICO DE DISPAROS</span>
          <span style={{fontSize:11,color:D.sub}}>{showHistorico?'▲':'▼'}</span>
          {disparos?.length>0&&<span style={{fontSize:11,background:D.input,color:D.sub,borderRadius:99,padding:'1px 8px',marginLeft:4}}>{disparos.length}</span>}
        </button>
        {showHistorico&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {(!disparos||disparos.length===0)&&<div style={{fontSize:13,color:D.sub,padding:'12px 0'}}>Nenhum disparo criado ainda.</div>}
            {(disparos||[]).map(d=>{
              const statusColor={'pendente':'#F59E0B','enviando':D.accent,'completo':D.success,'erro':D.danger,'cancelado':D.sub}[d.status]||D.sub
              const isPendente=d.status==='pendente'||d.status==='cancelado'
              const isExecutando=executandoHistorico===d.id
              return(
                <div key={d.id} style={{background:D.card,border:`1px solid ${D.border}`,borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{background:statusColor+'22',color:statusColor,border:`1px solid ${statusColor}44`,borderRadius:99,padding:'2px 10px',fontSize:11,fontWeight:700}}>{d.status}</span>
                      <span style={{fontSize:12,color:D.sub}}>{new Date(d.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                      {d.agendado_para&&<span style={{fontSize:11,color:'#F59E0B'}}>Agendado: {new Date(d.agendado_para).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}
                    </div>
                    <div style={{fontSize:12,color:D.text,fontStyle:'italic',maxWidth:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>"{d.mensagem_base?.slice(0,80)}{d.mensagem_base?.length>80?'…':''}"</div>
                    <div style={{fontSize:11,color:D.sub,marginTop:4,display:'flex',gap:12}}>
                      <span>Total: <strong style={{color:D.text}}>{d.total_leads}</strong></span>
                      {d.total_enviados!=null&&<span>Enviados: <strong style={{color:D.success}}>{d.total_enviados}</strong></span>}
                      {d.total_erros>0&&<span>Erros: <strong style={{color:D.danger}}>{d.total_erros}</strong></span>}
                      <span>Intervalo: <strong style={{color:D.text}}>{d.intervalo_tipo==='aleatorio'?'Aleatório (1–4min)':`${d.intervalo_segundos}s`}</strong></span>
                    </div>
                  </div>
                  {isPendente&&(
                    <Btn variant="primary" size="sm" disabled={isExecutando} onClick={async()=>{
                      setExecutandoHistorico(d.id)
                      showT(`Iniciando disparo de ${d.total_leads} leads...`)
                      const res=await executarDisparo(d.id,(prog)=>{
                        // progress tracked internally, just refresh on done
                      })
                      setExecutandoHistorico(null)
                      if(res?.error) showT(res.error,'error')
                      else showT(`Concluído! ${res.enviados} enviados, ${res.erros} erros.`,res.erros>0&&res.enviados===0?'error':'success')
                      refetchDisparos?.()
                    }}>{isExecutando?'Executando...':'Executar'}</Btn>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {(openLead||showNewLead)&&<LeadModal lead={openLead} onClose={()=>{setOpenLead(null);setShowNewLead(false)}} estagios={estagios} statusList={statusList} etiquetas={etiquetas} interesses={interesses} onSave={handleSaveLead} saving={saving}/>}
      {showDisparo&&<DisparoModal
        leads={leads}
        selected={selected}
        templates={templates}
        onClose={()=>{setShowDisparo(false)}}
        onCreateDisparo={async(disparo,ids,msgPorLead)=>{
          const res=await createDisparo(disparo,ids,msgPorLead)
          if(!res.error) setSelected([])
          return res
        }}
        onExecutarDisparo={executarDisparo}
        onCancelarExecucao={cancelarExecucao}
      />}
      {showConfig&&<CRMConfigModal onClose={()=>setShowConfig(false)} clinicId={clinic?.id} estagios={estagios} statusList={statusList} etiquetas={etiquetas} interesses={interesses} configActions={configActions}/>}
      {showModelos&&<ModelosModal onClose={()=>setShowModelos(false)} templates={templates} clinicId={clinic?.id} createTemplate={createTemplate} deleteTemplate={deleteTemplate}/>}
      {showImportar&&<ImportarLeadsModal onClose={()=>setShowImportar(false)} onImport={handleImportarLeads}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    </div>
  )
}

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [session,setSession]=useState(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [clinicSelecionada,setClinicSelecionada]=useState(null)
  const [paginaAtual,setPaginaAtual]=useState('central') // 'central' | 'admin' | 'conta'

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthLoading(false)})
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setSession(session))
    return()=>subscription.unsubscribe()
  },[])

  const[currentUser,setCurrentUser]=useState(null)
  useEffect(()=>{
    if(session) supabase.from('users').select('*').eq('auth_id',session.user.id).single().then(({data})=>setCurrentUser(data))
  },[session])

  const{clinics,loading:clinicsLoading,refetch:refetchClinics}=useClinics()
  const{estagios,statusList,etiquetas,interesses,...configActions}=useCRMConfig(clinicSelecionada?.id)
  const{leads,loading:leadsLoading,createLead,updateLead}=useLeads(clinicSelecionada?.id)
  const{templates,createTemplate,deleteTemplate}=useTemplates(clinicSelecionada?.id)
  const{createDisparo,executarDisparo,cancelarExecucao,disparos,refetch:refetchDisparos}=useDisparos(clinicSelecionada?.id)

  if(authLoading) return(
    <div style={{minHeight:'100vh',background:D.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Spinner/>
    </div>
  )
  if(!session) return <Login onLogin={()=>{}}/>

  // Painel admin standalone
  if(paginaAtual==='admin') return(
    <div style={{minHeight:'100vh',background:D.bg,fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{background:'#111',borderBottom:`1px solid ${D.border}`,padding:'0 28px',height:54,display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setPaginaAtual('central')} style={{background:'none',border:'none',cursor:'pointer',color:D.sub,fontSize:12,display:'flex',alignItems:'center',gap:6}}>← Voltar</button>
        <span style={{fontSize:14,fontWeight:700,color:D.text}}>Painel Admin</span>
      </div>
      <div style={{padding:28}}><PainelAdmin clinics={clinics} currentUser={session?.user}/></div>
    </div>
  )

  // Minha Conta standalone
  if(paginaAtual==='conta') return(
    <div style={{minHeight:'100vh',background:D.bg,fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{background:'#111',borderBottom:`1px solid ${D.border}`,padding:'0 28px',height:54,display:'flex',alignItems:'center',gap:12}}>
        <button onClick={()=>setPaginaAtual('central')} style={{background:'none',border:'none',cursor:'pointer',color:D.sub,fontSize:12,display:'flex',alignItems:'center',gap:6}}>← Voltar</button>
        <span style={{fontSize:14,fontWeight:700,color:D.text}}>Minha Conta</span>
      </div>
      <div style={{padding:28}}><MinhaConta currentUser={{...currentUser,id:session?.user?.id}} clinics={clinics}/></div>
    </div>
  )

  // Central de Clínicas
  if(!clinicSelecionada) return(
    <div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {clinicsLoading?<div style={{minHeight:'100vh',background:D.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>:(
        <CentralClinicas
          clinics={clinics}
          onSelectClinic={setClinicSelecionada}
          onNewClinic={()=>refetchClinics()}
          onSignOut={()=>supabase.auth.signOut()}
          onPainelAdmin={()=>setPaginaAtual('admin')}
          onMinhaConta={()=>setPaginaAtual('conta')}
        />
      )}
    </div>
  )

  // Guia Interativo
  const crmComponent=(
    <CRMInline
      clinic={clinicSelecionada}
      clinics={clinics}
      estagios={estagios}
      statusList={statusList}
      etiquetas={etiquetas}
      interesses={interesses}
      leads={leads}
      leadsLoading={leadsLoading}
      createLead={createLead}
      updateLead={updateLead}
      templates={templates}
      createTemplate={createTemplate}
      deleteTemplate={deleteTemplate}
      createDisparo={createDisparo}
      executarDisparo={executarDisparo}
      cancelarExecucao={cancelarExecucao}
      disparos={disparos}
      refetchDisparos={refetchDisparos}
      configActions={configActions}
    />
  )

  const adminComponent=(<PainelAdmin clinics={clinics} currentUser={session?.user}/>)
  const contaComponent=(<MinhaConta currentUser={{...currentUser,id:session?.user?.id}} clinics={clinics}/>)
  const automacoesComponent=(<AutomacoesPage clinic={clinicSelecionada} clinics={clinics} onChangeClinic={setClinicSelecionada}/>)

  return(
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:99px}
        ::-webkit-scrollbar-track{background:transparent}
        select option{background:#222;color:#FAF7F2}
      `}</style>
      <GuiaPage
        clinic={clinicSelecionada}
        onVoltar={()=>setClinicSelecionada(null)}
        CRMComponent={crmComponent}
        AutomacoesComponent={automacoesComponent}
        AdminComponent={adminComponent}
        ContaComponent={contaComponent}
        currentUser={currentUser}
        onPainelAdmin={()=>setPaginaAtual('admin')}
        onMinhaConta={()=>setPaginaAtual('conta')}
        onSignOut={()=>supabase.auth.signOut()}
      />
    </div>
  )
}
