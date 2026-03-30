import { useState, useMemo, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useClinics, useCRMConfig, useLeads, useTemplates, useDisparos } from './hooks/useCRM'
import CentralClinicas from './pages/CentralClinicas'
import GuiaPage from './pages/GuiaPage'
import AutomacoesPage from './pages/AutomacoesPage'
import { PainelAdmin, MinhaConta } from './pages/AdminPage'

const fmtDate = d => d ? new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'
const fmtDateTime = d => d ? new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'
const timeAgo = d => { if(!d) return '—'; const days=Math.floor((Date.now()-new Date(d).getTime())/86400000); if(days===0) return 'hoje'; if(days===1) return 'ontem'; return `há ${days} dias` }

const Badge=({cor,label})=><span style={{background:cor+'22',color:cor,border:`1px solid ${cor}44`,borderRadius:99,padding:'2px 10px',fontSize:11,fontWeight:600,whiteSpace:'nowrap'}}>{label}</span>
const Tag=({cor,label})=><span style={{background:cor+'18',color:cor,border:`1px solid ${cor}33`,borderRadius:99,padding:'1px 8px',fontSize:11,fontWeight:500}}>{label}</span>
const Btn=({children,onClick,variant='primary',size='md',disabled=false})=>{
  const v={primary:{background:'#0F0F0F',color:'#fff',border:'none'},secondary:{background:'#F3F4F6',color:'#374151',border:'1px solid #E5E7EB'},ghost:{background:'transparent',color:'#6B7280',border:'1px solid transparent'},danger:{background:'#FEF2F2',color:'#DC2626',border:'1px solid #FCA5A5'},success:{background:'#ECFDF5',color:'#065F46',border:'1px solid #6EE7B7'}}
  return <button onClick={onClick} disabled={disabled} style={{borderRadius:8,fontWeight:600,cursor:disabled?'not-allowed':'pointer',transition:'all 0.15s',fontFamily:'inherit',opacity:disabled?0.5:1,fontSize:size==='sm'?12:14,padding:size==='sm'?'5px 12px':'8px 18px',...v[variant]}}>{children}</button>
}
const Input=({label,value,onChange,type='text',placeholder='',required=false})=>(
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:'#374151',letterSpacing:'0.04em'}}>{label}{required&&<span style={{color:'#EF4444'}}> *</span>}</label>}
    <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{border:'1px solid #E5E7EB',borderRadius:8,padding:'9px 12px',fontSize:13,color:'#0F0F0F',background:'#FAFAFA',outline:'none',fontFamily:'inherit'}}/>
  </div>
)
const Sel=({label,value,onChange,options,placeholder='Selecionar...'})=>(
  <div style={{display:'flex',flexDirection:'column',gap:5}}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:'#374151',letterSpacing:'0.04em'}}>{label}</label>}
    <select value={value||''} onChange={e=>onChange(e.target.value)} style={{border:'1px solid #E5E7EB',borderRadius:8,padding:'9px 12px',fontSize:13,color:'#0F0F0F',background:'#FAFAFA',outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
      <option value=''>{placeholder}</option>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
)
const Modal=({open,onClose,title,children,width=580})=>{
  if(!open) return null
  return(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(3px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 25px 60px rgba(0,0,0,0.2)'}}>
        <div style={{padding:'20px 24px 16px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:'#0F0F0F'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#9CA3AF',lineHeight:1}}>×</button>
        </div>
        <div style={{padding:24,overflowY:'auto',flex:1}}>{children}</div>
      </div>
    </div>
  )
}
const Spinner=()=><div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60}}><div style={{width:28,height:28,border:'3px solid #E5E7EB',borderTopColor:'#0F0F0F',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/></div>
const Toast=({msg,type='success'})=><div style={{position:'fixed',bottom:24,right:24,background:type==='error'?'#FEF2F2':'#F0FDF4',border:`1px solid ${type==='error'?'#FCA5A5':'#86EFAC'}`,color:type==='error'?'#DC2626':'#166534',borderRadius:10,padding:'12px 18px',fontSize:13,fontWeight:600,zIndex:2000,boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>{type==='error'?'✕ ':'✓ '}{msg}</div>

const Dashboard=({leads})=>{
  const total=leads.length,novos=leads.filter(l=>(Date.now()-new Date(l.data_cadastro).getTime())<30*86400000).length,conv=leads.filter(l=>l.fechou).length,aguard=leads.filter(l=>l.aguardando_retorno).length
  return(
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}>
      {[{label:'Total de Leads',value:total,sub:'na clínica',color:'#0F0F0F'},{label:'Novos (30 dias)',value:novos,sub:'cadastrados',color:'#3B82F6'},{label:'Conversões',value:conv,sub:`${total>0?Math.round(conv/total*100):0}% de taxa`,color:'#10B981'},{label:'Aguardando retorno',value:aguard,sub:'em aberto',color:'#F59E0B'}].map(c=>(
        <div key={c.label} style={{background:'#fff',border:'1px solid #F0F0F0',borderRadius:12,padding:'18px 20px',flex:1,minWidth:130}}>
          <div style={{fontSize:28,fontWeight:800,color:c.color,letterSpacing:'-0.03em'}}>{c.value}</div>
          <div style={{fontSize:12,fontWeight:600,color:'#374151',marginTop:2}}>{c.label}</div>
          <div style={{fontSize:11,color:'#9CA3AF',marginTop:1}}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

const LeadModal=({lead,onClose,estagios,statusList,etiquetas,interesses,onSave,saving})=>{
  const blank={nome:'',sobrenome:'',whatsapp:'',email:'',origem:'',estagio_id:'',status_id:'',interesses:[],etiquetas:[],aguardando_retorno:false,fechou:false,sinal_pago:false,valor:'',valor_sinal:'',proximo_agendamento_data:'',proximo_agendamento_horario:'',proximo_agendamento_local:'',proximo_agendamento_procedimento:'',ultima_interacao_contexto:'',observacoes:'',como_conheceu:'',cidade_bairro:'',indicado_por:'',numero_sessoes:'',ja_foi_cliente:false}
  const [form,setForm]=useState(lead?{...lead}:blank)
  const [tab,setTab]=useState('dados')
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))
  const toggleArr=(arr,val)=>(arr||[]).includes(val)?(arr||[]).filter(x=>x!==val):[...(arr||[]),val]
  const tabS=a=>({padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',borderBottom:a?'2px solid #0F0F0F':'2px solid transparent',color:a?'#0F0F0F':'#9CA3AF',background:'none',border:'none',fontFamily:'inherit'})
  return(
    <Modal open onClose={onClose} title={lead?`${lead.nome} ${lead.sobrenome}`:'Novo Lead'} width={660}>
      <div style={{display:'flex',borderBottom:'1px solid #F0F0F0',marginBottom:20,marginTop:-8}}>
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
          <div style={{gridColumn:'1/-1'}}><label style={{fontSize:12,fontWeight:600,color:'#374151',letterSpacing:'0.04em',display:'block',marginBottom:8}}>INTERESSES</label><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{interesses.map(i=><button key={i.id} onClick={()=>set('interesses',toggleArr(form.interesses,i.id))} style={{padding:'5px 12px',borderRadius:99,fontSize:12,fontWeight:500,cursor:'pointer',border:(form.interesses||[]).includes(i.id)?'1.5px solid #0F0F0F':'1.5px solid #E5E7EB',background:(form.interesses||[]).includes(i.id)?'#0F0F0F':'#fff',color:(form.interesses||[]).includes(i.id)?'#fff':'#374151',fontFamily:'inherit'}}>{i.nome}</button>)}</div></div>
          <div style={{gridColumn:'1/-1'}}><label style={{fontSize:12,fontWeight:600,color:'#374151',letterSpacing:'0.04em',display:'block',marginBottom:8}}>ETIQUETAS</label><div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{etiquetas.map(t=><button key={t.id} onClick={()=>set('etiquetas',toggleArr(form.etiquetas,t.id))} style={{padding:'5px 12px',borderRadius:99,fontSize:12,fontWeight:500,cursor:'pointer',border:(form.etiquetas||[]).includes(t.id)?`1.5px solid ${t.cor}`:'1.5px solid #E5E7EB',background:(form.etiquetas||[]).includes(t.id)?t.cor+'18':'#fff',color:(form.etiquetas||[]).includes(t.id)?t.cor:'#374151',fontFamily:'inherit'}}>{t.nome}</button>)}</div></div>
          <div style={{gridColumn:'1/-1',display:'flex',gap:20,flexWrap:'wrap'}}>{[['aguardando_retorno','Aguardando retorno'],['fechou','Fechou negócio'],['sinal_pago','Sinal pago']].map(([k,l])=><label key={k} style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:'#374151',cursor:'pointer'}}><input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)} style={{width:15,height:15,cursor:'pointer'}}/>{l}</label>)}</div>
          <div style={{gridColumn:'1/-1'}}><label style={{fontSize:12,fontWeight:600,color:'#374151',letterSpacing:'0.04em',display:'block',marginBottom:5}}>ÚLTIMA INTERAÇÃO</label><textarea value={form.ultima_interacao_contexto||''} onChange={e=>set('ultima_interacao_contexto',e.target.value)} rows={2} style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:8,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:'#FAFAFA',resize:'vertical',boxSizing:'border-box'}}/></div>
          <div style={{gridColumn:'1/-1'}}><label style={{fontSize:12,fontWeight:600,color:'#374151',letterSpacing:'0.04em',display:'block',marginBottom:5}}>OBSERVAÇÕES</label><textarea value={form.observacoes||''} onChange={e=>set('observacoes',e.target.value)} rows={2} style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:8,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:'#FAFAFA',resize:'vertical',boxSizing:'border-box'}}/></div>
        </div>
      )}
      {tab==='agendamento'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}><Input label="Data/hora próximo agendamento" value={form.proximo_agendamento_data?form.proximo_agendamento_data.slice(0,16):''} onChange={v=>set('proximo_agendamento_data',v)} type="datetime-local"/><Input label="Horário" value={form.proximo_agendamento_horario} onChange={v=>set('proximo_agendamento_horario',v)} placeholder="14:00"/><Input label="Procedimento" value={form.proximo_agendamento_procedimento} onChange={v=>set('proximo_agendamento_procedimento',v)}/><Input label="Local" value={form.proximo_agendamento_local} onChange={v=>set('proximo_agendamento_local',v)}/>{form.sinal_pago&&<Input label="Valor do sinal (R$)" value={form.valor_sinal} onChange={v=>set('valor_sinal',v)} type="number"/>}</div>)}
      {tab==='extras'&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}><Input label="Como conheceu" value={form.como_conheceu} onChange={v=>set('como_conheceu',v)}/><Input label="Cidade / Bairro" value={form.cidade_bairro} onChange={v=>set('cidade_bairro',v)}/><Input label="Indicado por" value={form.indicado_por} onChange={v=>set('indicado_por',v)}/><Input label="Nº de sessões" value={form.numero_sessoes} onChange={v=>set('numero_sessoes',v)} type="number"/><div style={{gridColumn:'1/-1'}}><label style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:'#374151',cursor:'pointer'}}><input type="checkbox" checked={!!form.ja_foi_cliente} onChange={e=>set('ja_foi_cliente',e.target.checked)} style={{width:15,height:15}}/>Já foi cliente antes</label></div></div>)}
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:'1px solid #F0F0F0'}}>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={()=>onSave(form)} disabled={saving}>{saving?'Salvando...':'Salvar lead'}</Btn>
      </div>
    </Modal>
  )
}

const Login=({onLogin})=>{
  const [email,setEmail]=useState(''),[senha,setSenha]=useState(''),[loading,setLoading]=useState(false),[erro,setErro]=useState('')
  const handleLogin=async()=>{if(!email||!senha)return setErro('Preencha email e senha.');setLoading(true);setErro('');const{error}=await supabase.auth.signInWithPassword({email,password:senha});if(error)setErro('Email ou senha incorretos.');else onLogin();setLoading(false)}
  return(
    <div style={{minHeight:'100vh',background:'#F7F7F7',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}`}</style>
      <div style={{background:'#fff',borderRadius:16,padding:40,width:360,boxShadow:'0 8px 40px rgba(0,0,0,0.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:32}}>
          <div style={{width:36,height:36,borderRadius:10,background:'#0F0F0F',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:14,fontWeight:800}}>P</span></div>
          <div><div style={{fontSize:15,fontWeight:800,color:'#0F0F0F'}}>Pluz Tech</div><div style={{fontSize:11,color:'#9CA3AF'}}>Sistema de Gestão</div></div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="seu@email.com"/>
          <Input label="Senha" value={senha} onChange={setSenha} type="password" placeholder="••••••••"/>
          {erro&&<div style={{fontSize:12,color:'#DC2626',background:'#FEF2F2',padding:'8px 12px',borderRadius:8}}>{erro}</div>}
          <Btn onClick={handleLogin} disabled={loading}>{loading?'Entrando...':'Entrar'}</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── DISPARO MODAL ───────────────────────────────────────────
const substituirVariaveis=(texto,lead)=>{
  if(!texto||!lead) return texto||''
  return texto
    .replace(/\{nome\}/gi, lead.nome||'')
    .replace(/\{sobrenome\}/gi, lead.sobrenome||'')
    .replace(/\{procedimento\}/gi, lead.proximo_agendamento_procedimento||'')
    .replace(/\{data\}/gi, lead.proximo_agendamento_data?new Date(lead.proximo_agendamento_data).toLocaleDateString('pt-BR'):'')
    .replace(/\{horario\}/gi, lead.proximo_agendamento_horario||'')
    .replace(/\{local\}/gi, lead.proximo_agendamento_local||'')
    .replace(/\{valor\}/gi, lead.valor?('R$ '+Number(lead.valor).toLocaleString('pt-BR')):'')
}

function DisparoModal({leads,selected,templates,onClose,onConfirm}){
  const leadsAlvo=leads.filter(l=>selected.includes(l.id))
  const [templateId,setTemplateId]=useState(templates[0]?.id||'')
  const [mensagemCustom,setMensagemCustom]=useState('')
  const [usarCustom,setUsarCustom]=useState(false)
  const [agendadoPara,setAgendadoPara]=useState('')
  const [intervalo,setIntervalo]=useState('aleatorio')
  const [intervaloFixo,setIntervaloFixo]=useState(60)
  const [saving,setSaving]=useState(false)
  const [previewIdx,setPreviewIdx]=useState(0)

  const template=templates.find(t=>t.id===templateId)
  const textoBase=usarCustom?mensagemCustom:(template?.conteudo||'')
  const leadPreview=leadsAlvo[previewIdx]
  const msgPreview=substituirVariaveis(textoBase,leadPreview)

  const handleConfirm=async()=>{
    if(!textoBase.trim()){alert('Selecione um template ou escreva uma mensagem.');return}
    setSaving(true)
    const msgPorLead={}
    leadsAlvo.forEach(l=>{msgPorLead[l.id]={whatsapp:l.whatsapp,mensagem:substituirVariaveis(textoBase,l)}})
    const disparo={
      template_id:usarCustom?null:templateId,
      mensagem_base:textoBase,
      agendado_para:agendadoPara||null,
      intervalo_tipo:intervalo,
      intervalo_segundos:intervalo==='fixo'?intervaloFixo:null,
      status:'pendente',
    }
    await onConfirm(disparo,selected,msgPorLead)
    setSaving(false)
  }

  const rowS={padding:'12px 0',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',gap:10}

  return(
    <Modal open onClose={onClose} title="Novo Disparo" width={700}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        {/* Coluna esquerda */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#6B7280',letterSpacing:'0.05em',display:'block',marginBottom:6}}>MENSAGEM</label>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <button onClick={()=>setUsarCustom(false)} style={{padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:!usarCustom?'1.5px solid #0F0F0F':'1.5px solid #E5E7EB',background:!usarCustom?'#0F0F0F':'#fff',color:!usarCustom?'#fff':'#374151',fontFamily:'inherit'}}>Template</button>
              <button onClick={()=>setUsarCustom(true)} style={{padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:usarCustom?'1.5px solid #0F0F0F':'1.5px solid #E5E7EB',background:usarCustom?'#0F0F0F':'#fff',color:usarCustom?'#fff':'#374151',fontFamily:'inherit'}}>Personalizada</button>
            </div>
            {!usarCustom?(
              <select value={templateId} onChange={e=>setTemplateId(e.target.value)} style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:8,padding:'8px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:'#FAFAFA'}}>
                <option value=''>— selecione —</option>
                {templates.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            ):(
              <textarea value={mensagemCustom} onChange={e=>setMensagemCustom(e.target.value)} rows={5} placeholder={'Olá {nome}, tudo bem?\n\nVariáveis: {nome} {sobrenome} {procedimento} {data} {horario} {local} {valor}'} style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:8,padding:'8px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:'#FAFAFA',resize:'vertical',boxSizing:'border-box'}}/>
            )}
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#6B7280',letterSpacing:'0.05em',display:'block',marginBottom:6}}>AGENDAMENTO</label>
            <input type="datetime-local" value={agendadoPara} onChange={e=>setAgendadoPara(e.target.value)} style={{width:'100%',border:'1px solid #E5E7EB',borderRadius:8,padding:'8px 12px',fontSize:13,outline:'none',fontFamily:'inherit',background:'#FAFAFA'}}/>
            <div style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>Vazio = disparar imediatamente</div>
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#6B7280',letterSpacing:'0.05em',display:'block',marginBottom:6}}>INTERVALO ENTRE MENSAGENS</label>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              {[['aleatorio','Aleatório (1–4 min)'],['fixo','Fixo']].map(([v,l])=>(
                <button key={v} onClick={()=>setIntervalo(v)} style={{padding:'5px 12px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:intervalo===v?'1.5px solid #0F0F0F':'1.5px solid #E5E7EB',background:intervalo===v?'#0F0F0F':'#fff',color:intervalo===v?'#fff':'#374151',fontFamily:'inherit'}}>{l}</button>
              ))}
            </div>
            {intervalo==='fixo'&&(
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="number" value={intervaloFixo} onChange={e=>setIntervaloFixo(Number(e.target.value))} min={10} max={600} style={{width:80,border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 10px',fontSize:13,outline:'none',fontFamily:'inherit'}}/>
                <span style={{fontSize:13,color:'#6B7280'}}>segundos</span>
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:'#F9F9F9',borderRadius:10,padding:14,border:'1px solid #F0F0F0'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#6B7280',letterSpacing:'0.05em',marginBottom:8}}>{'PRÉVIA ('+(leadsAlvo.length>1?('lead '+(previewIdx+1)+'/'+leadsAlvo.length):(leadPreview?.nome||'—'))+')'}</div>
            {leadsAlvo.length>1&&(
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <button onClick={()=>setPreviewIdx(i=>Math.max(0,i-1))} disabled={previewIdx===0} style={{padding:'2px 8px',fontSize:12,cursor:'pointer',borderRadius:6,border:'1px solid #E5E7EB',background:'#fff',fontFamily:'inherit'}}>‹</button>
                <button onClick={()=>setPreviewIdx(i=>Math.min(leadsAlvo.length-1,i+1))} disabled={previewIdx===leadsAlvo.length-1} style={{padding:'2px 8px',fontSize:12,cursor:'pointer',borderRadius:6,border:'1px solid #E5E7EB',background:'#fff',fontFamily:'inherit'}}>›</button>
              </div>
            )}
            <div style={{fontSize:13,color:'#0F0F0F',lineHeight:1.6,whiteSpace:'pre-wrap',minHeight:80}}>{msgPreview||<span style={{color:'#D1D5DB'}}>Selecione um template para ver a prévia</span>}</div>
          </div>

          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#6B7280',letterSpacing:'0.05em',marginBottom:8}}>LEADS SELECIONADOS ({leadsAlvo.length})</div>
            <div style={{maxHeight:180,overflowY:'auto',display:'flex',flexDirection:'column'}}>
              {leadsAlvo.map((l,i)=>(
                <div key={l.id} style={{...rowS,opacity:i===previewIdx?1:0.6}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:i===previewIdx?'#10B981':'#D1D5DB',flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#0F0F0F'}}>{l.nome} {l.sobrenome}</div>
                    <div style={{fontSize:11,color:'#9CA3AF'}}>{l.whatsapp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:24,paddingTop:16,borderTop:'1px solid #F3F4F6'}}>
        <span style={{fontSize:12,color:'#9CA3AF'}}>{leadsAlvo.length} mensagem{leadsAlvo.length!==1?'s':''} serão criadas</span>
        <div style={{display:'flex',gap:10}}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleConfirm} disabled={saving||!textoBase.trim()}>{saving?'Criando...':'Criar disparo'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── CRM INLINE (para usar dentro do Guia) ───────────────────
function CRMInline({ clinic, clinics, estagios, statusList, etiquetas, interesses, leads, leadsLoading, createLead, updateLead, templates, createDisparo, configActions }) {
  const [filters,setFilters]=useState({busca:'',estagio:'',status:'',etiqueta:'',interesse:'',dataInicio:'',dataFim:''})
  const [selected,setSelected]=useState([])
  const [openLead,setOpenLead]=useState(null)
  const [showNewLead,setShowNewLead]=useState(false)
  const [showDisparo,setShowDisparo]=useState(false)
  const [showConfig,setShowConfig]=useState(false)
  const [saving,setSaving]=useState(false)
  const [toast,setToast]=useState(null)

  const showT=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),3000)}

  const filteredLeads=useMemo(()=>leads.filter(l=>{
    if(filters.busca){const b=filters.busca.toLowerCase();if(!(`${l.nome} ${l.sobrenome}`.toLowerCase().includes(b))&&!l.whatsapp.includes(b))return false}
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

  const handleSaveLead=async(form)=>{setSaving(true);const{error}=form.id?await updateLead(form.id,form):await createLead(form);setSaving(false);if(error)showT('Erro: '+error.message,'error');else{showT(form.id?'Lead atualizado!':'Lead criado!');setOpenLead(null);setShowNewLead(false)}}

  const thS={padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:'#6B7280',letterSpacing:'0.06em',borderBottom:'1px solid #F0F0F0',whiteSpace:'nowrap',background:'#FAFAFA'}
  const tdS={padding:'12px 14px',borderBottom:'1px solid #F9F9F9',verticalAlign:'middle'}

  return(
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:800,color:'#0F0F0F',letterSpacing:'-0.02em'}}>CRM</h2>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {selected.length>0&&<Btn variant="secondary" onClick={()=>setShowDisparo(true)}>📤 Disparar ({selected.length})</Btn>}
          <Btn variant="ghost" size="sm" onClick={()=>setShowConfig(true)}>⚙ Configurar</Btn>
          <Btn variant="secondary" onClick={()=>setShowDisparo(true)}>📤 Novo disparo</Btn>
          <Btn variant="primary" onClick={()=>setShowNewLead(true)}>+ Adicionar lead</Btn>
        </div>
      </div>

      <Dashboard leads={leads}/>

      {/* Filtros */}
      <div style={{background:'#fff',border:'1px solid #F0F0F0',borderRadius:12,padding:'14px 16px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{display:'flex',flexDirection:'column',gap:4}}>
          <label style={{fontSize:11,fontWeight:600,color:'#6B7280',letterSpacing:'0.04em'}}>BUSCAR</label>
          <input placeholder="Nome ou número..." value={filters.busca} onChange={e=>setFilters(f=>({...f,busca:e.target.value}))} style={{border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 11px',fontSize:13,outline:'none',fontFamily:'inherit',background:'#FAFAFA',minWidth:160}}/>
        </div>
        {[{label:'ESTÁGIO',key:'estagio',opts:estagios},{label:'STATUS',key:'status',opts:statusList},{label:'ETIQUETA',key:'etiqueta',opts:etiquetas},{label:'INTERESSE',key:'interesse',opts:interesses}].map(({label,key,opts})=>(
          <div key={key} style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={{fontSize:11,fontWeight:600,color:'#6B7280',letterSpacing:'0.04em'}}>{label}</label>
            <select value={filters[key]} onChange={e=>setFilters(f=>({...f,[key]:e.target.value}))} style={{border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 11px',fontSize:13,outline:'none',fontFamily:'inherit',background:'#FAFAFA',cursor:'pointer'}}>
              <option value=''>Todos</option>
              {opts.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
        ))}
        {[{label:'CADASTRO DE',key:'dataInicio'},{label:'ATÉ',key:'dataFim'}].map(({label,key})=>(
          <div key={key} style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={{fontSize:11,fontWeight:600,color:'#6B7280',letterSpacing:'0.04em'}}>{label}</label>
            <input type="date" value={filters[key]} onChange={e=>setFilters(f=>({...f,[key]:e.target.value}))} style={{border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 11px',fontSize:13,outline:'none',fontFamily:'inherit',background:'#FAFAFA'}}/>
          </div>
        ))}
        <Btn variant="ghost" size="sm" onClick={()=>setFilters({busca:'',estagio:'',status:'',etiqueta:'',interesse:'',dataInicio:'',dataFim:''})}>Limpar</Btn>
      </div>

      {/* Tabela */}
      <div style={{background:'#fff',border:'1px solid #F0F0F0',borderRadius:12,overflow:'hidden'}}>
        {leadsLoading?<Spinner/>:(
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:960}}>
              <thead>
                <tr>
                  <th style={{...thS,width:40}}><input type="checkbox" checked={allSelected} onChange={toggleAll} style={{cursor:'pointer',width:15,height:15}}/></th>
                  {['NOME','WHATSAPP','ESTÁGIO','STATUS','INTERESSES','ETIQUETAS','ORIGEM','CADASTRO','ÚLT. INTERAÇÃO','PRÓx. AGENDA','VALOR'].map(h=><th key={h} style={thS}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length===0&&<tr><td colSpan={12} style={{...tdS,textAlign:'center',color:'#9CA3AF',padding:48,fontSize:13}}>Nenhum lead encontrado</td></tr>}
                {filteredLeads.map(lead=>{
                  const est=getEstagio(lead.estagio_id),sta=getStatus(lead.status_id)
                  const tags=getEtiquetas(lead.etiquetas),ints=getInteresses(lead.interesses)
                  const isSel=selected.includes(lead.id)
                  return(
                    <tr key={lead.id} style={{background:isSel?'#F0F7FF':'transparent',cursor:'pointer'}} onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='#FAFAFA'}} onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='transparent'}}>
                      <td style={tdS} onClick={e=>{e.stopPropagation();toggle(lead.id)}}><input type="checkbox" checked={isSel} onChange={()=>toggle(lead.id)} style={{width:15,height:15,cursor:'pointer'}}/></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><div style={{fontWeight:600,fontSize:13,color:'#0F0F0F'}}>{lead.nome} {lead.sobrenome}</div>{lead.aguardando_retorno&&<div style={{fontSize:10,color:'#F59E0B',fontWeight:600,marginTop:2}}>● Aguardando retorno</div>}</td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><span style={{fontSize:12,color:'#374151',fontFamily:'monospace'}}>{lead.whatsapp}</span></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>{est?<Badge cor={est.cor} label={est.nome}/>:<span style={{color:'#D1D5DB',fontSize:12}}>—</span>}</td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>{sta?<Badge cor={sta.cor} label={sta.nome}/>:<span style={{color:'#D1D5DB',fontSize:12}}>—</span>}</td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{ints.map(i=><span key={i.id} style={{fontSize:11,color:'#374151',background:'#F3F4F6',borderRadius:99,padding:'2px 8px'}}>{i.nome}</span>)}</div></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{tags.map(t=><Tag key={t.id} cor={t.cor} label={t.nome}/>)}</div></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><span style={{fontSize:12,color:'#6B7280'}}>{lead.origem||'—'}</span></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><span style={{fontSize:12,color:'#6B7280'}}>{fmtDate(lead.data_cadastro)}</span></td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}><div style={{fontSize:12,color:'#374151'}}>{timeAgo(lead.data_ultima_interacao)}</div>{lead.ultima_interacao_contexto&&<div style={{fontSize:11,color:'#9CA3AF',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lead.ultima_interacao_contexto}</div>}</td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>{lead.proximo_agendamento_data?<div><div style={{fontSize:12,color:'#374151',fontWeight:500}}>{fmtDateTime(lead.proximo_agendamento_data)}</div><div style={{fontSize:11,color:'#9CA3AF'}}>{lead.proximo_agendamento_procedimento}</div></div>:<span style={{color:'#D1D5DB',fontSize:12}}>—</span>}</td>
                      <td style={tdS} onClick={()=>setOpenLead(lead)}>{lead.valor?<span style={{fontSize:13,fontWeight:600,color:'#10B981'}}>R$ {Number(lead.valor).toLocaleString('pt-BR')}</span>:<span style={{color:'#D1D5DB',fontSize:12}}>—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{padding:'10px 16px',borderTop:'1px solid #F0F0F0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:12,color:'#9CA3AF'}}>{filteredLeads.length} leads · {selected.length} selecionados</span>
        </div>
      </div>

      {(openLead||showNewLead)&&<LeadModal lead={openLead} onClose={()=>{setOpenLead(null);setShowNewLead(false)}} estagios={estagios} statusList={statusList} etiquetas={etiquetas} interesses={interesses} onSave={handleSaveLead} saving={saving}/>}
      {showDisparo&&<DisparoModal leads={leads} selected={selected} templates={templates} onClose={()=>setShowDisparo(false)} onConfirm={async(disparo,ids,msgPorLead)=>{const{error}=await createDisparo(disparo,ids,msgPorLead);if(error)showT('Erro ao criar disparo: '+error.message,'error');else{showT(`Disparo criado para ${ids.length} lead(s)!`);setSelected([]);setShowDisparo(false)}}}/>}
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    </div>
  )
}

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [session,setSession]=useState(null)
  const [authLoading,setAuthLoading]=useState(true)
  const [clinicSelecionada,setClinicSelecionada]=useState(null)

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
  const{templates}=useTemplates(clinicSelecionada?.id)
  const{createDisparo}=useDisparos(clinicSelecionada?.id)

  if(authLoading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><Spinner/></div>
  if(!session) return <Login onLogin={()=>{}}/>

  // Central de Clínicas
  if(!clinicSelecionada) return(
    <div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {clinicsLoading?<Spinner/>:(
        <CentralClinicas
          clinics={clinics}
          onSelectClinic={setClinicSelecionada}
          onNewClinic={()=>refetchClinics()}
          onSignOut={()=>supabase.auth.signOut()}
        />
      )}
    </div>
  )

  // Guia Interativo da clínica selecionada
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
      createDisparo={createDisparo}
      configActions={configActions}
    />
  )

  const adminComponent=(
    <PainelAdmin clinics={clinics} currentUser={session?.user}/>
  )
  const contaComponent=(
    <MinhaConta currentUser={{...currentUser, id:session?.user?.id}} clinics={clinics}/>
  )
  const automacoesComponent=(
    <AutomacoesPage clinic={clinicSelecionada} clinics={clinics} onChangeClinic={setClinicSelecionada}/>
  )

  return(
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:99px}`}</style>
      <GuiaPage
        clinic={clinicSelecionada}
        onVoltar={()=>setClinicSelecionada(null)}
        CRMComponent={crmComponent}
        AutomacoesComponent={automacoesComponent}
        AdminComponent={adminComponent}
        ContaComponent={contaComponent}
        currentUser={currentUser}
      />
    </div>
  )
}
