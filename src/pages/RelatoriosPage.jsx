import { useState } from 'react'
import { useRelatorios } from '../hooks/useRelatorios'

const D = {
  bg: '#0F0F0F',
  card: '#1a1a1a',
  cardAlt: '#161616',
  text: '#FAF7F2',
  sub: '#9ca3af',
  accent: '#8B6F47',
  accentHover: '#a07d54',
  border: '#2a2a2a',
  borderAccent: 'rgba(139,111,71,0.2)',
  input: '#222222',
  success: '#22c55e',
  danger: '#ef4444',
  blue: '#3b82f6',
  orange: '#f59e0b',
  purple: '#a855f7'
}

const fmtDate = d => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

export default function RelatoriosPage({ clinic }) {
  const getNDaysAgo = (n) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
  }

  const [startDate, setStartDate] = useState(getNDaysAgo(7))
  const [endDate, setEndDate] = useState(getNDaysAgo(0))
  const { data, loading } = useRelatorios(clinic.id, startDate, endDate)

  // Expanded states for cards
  const [expandedLeads, setExpandedLeads] = useState(false)
  const [expandedReengajados, setExpandedReengajados] = useState(false)
  const [expandedPerdidos, setExpandedPerdidos] = useState(false)

  if (!clinic) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filtros de Período */}
      <div style={{
        background: D.card,
        border: `1px solid ${D.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text }}>Relatórios & Métricas</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: D.sub }}>Consulte o desempenho da clínica no período selecionado</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: D.sub, letterSpacing: '0.05em' }}>DATA INÍCIO</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ border: `1px solid ${D.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: D.text, background: D.input, outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: D.sub, letterSpacing: '0.05em' }}>DATA FIM</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ border: `1px solid ${D.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: D.text, background: D.input, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${D.border}`, borderTopColor: D.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Dashboard Superior */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            
            {/* Card: Leads Novos (Expandable) */}
            <div 
              onClick={() => setExpandedLeads(!expandedLeads)}
              style={{
                background: D.card,
                border: `1px solid ${expandedLeads ? D.accent : D.border}`,
                borderRadius: 14,
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: expandedLeads ? 'translateY(-2px)' : 'none',
                boxShadow: expandedLeads ? `0 4px 20px rgba(139,111,71,0.15)` : 'none'
              }}
              onMouseEnter={e => { if (!expandedLeads) e.currentTarget.style.borderColor = D.accent }}
              onMouseLeave={e => { if (!expandedLeads) e.currentTarget.style.borderColor = D.border }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24 }}>👤</span>
                <span style={{ fontSize: 12, color: D.sub }}>{expandedLeads ? '▲ Recolher' : '▼ Expandir'}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: D.blue, marginTop: 10, letterSpacing: '-0.02em' }}>
                {data.leadsNovos.length}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginTop: 4 }}>Leads Novos</div>
              <div style={{ fontSize: 11, color: D.sub, marginTop: 1 }}>Recebidos no período</div>
            </div>

            {/* Card: Leads Reengajados (Expandable) */}
            <div 
              onClick={() => setExpandedReengajados(!expandedReengajados)}
              style={{
                background: D.card,
                border: `1px solid ${expandedReengajados ? D.accent : D.border}`,
                borderRadius: 14,
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: expandedReengajados ? 'translateY(-2px)' : 'none',
                boxShadow: expandedReengajados ? `0 4px 20px rgba(139,111,71,0.15)` : 'none'
              }}
              onMouseEnter={e => { if (!expandedReengajados) e.currentTarget.style.borderColor = D.accent }}
              onMouseLeave={e => { if (!expandedReengajados) e.currentTarget.style.borderColor = D.border }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24 }}>🔄</span>
                <span style={{ fontSize: 12, color: D.sub }}>{expandedReengajados ? '▲ Recolher' : '▼ Expandir'}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: D.purple, marginTop: 10, letterSpacing: '-0.02em' }}>
                {data.leadsReengajados.length}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginTop: 4 }}>Leads Reengajados</div>
              <div style={{ fontSize: 11, color: D.sub, marginTop: 1 }}>Interagiram novamente</div>
            </div>

            {/* Card: Agendamentos */}
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 24 }}>📅</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: D.orange, marginTop: 10, letterSpacing: '-0.02em' }}>
                {data.agendamentos.length}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginTop: 4 }}>Agendamentos</div>
              <div style={{ fontSize: 11, color: D.sub, marginTop: 1 }}>Marcados no período</div>
            </div>

            {/* Card: Conversões */}
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 24 }}>💰</span>
              <div style={{ fontSize: 28, fontWeight: 800, color: D.success, marginTop: 10, letterSpacing: '-0.02em' }}>
                {data.leadsNovos.filter(l => l.fechou).length}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginTop: 4 }}>Conversões (Novos)</div>
              <div style={{ fontSize: 11, color: D.sub, marginTop: 1 }}>
                {data.leadsNovos.length > 0 ? Math.round((data.leadsNovos.filter(l => l.fechou).length / data.leadsNovos.length) * 100) : 0}% de taxa
              </div>
            </div>

          </div>

          {/* Listas Expandidas */}
          {expandedLeads && (
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20, marginTop: -6 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: D.text }}>Lista de Leads Novos</h3>
              {data.leadsNovos.length === 0 ? (
                <div style={{ color: D.sub, fontSize: 13 }}>Nenhum lead novo cadastrado neste período.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {data.leadsNovos.map(l => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: D.input, borderRadius: 8, border: `1px solid ${D.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{l.nome} {l.sobrenome || ''}</span>
                      <span style={{ fontSize: 12, color: D.sub }}>{l.whatsapp} · {fmtDate(l.data_cadastro)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {expandedReengajados && (
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20, marginTop: -6 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: D.text }}>Lista de Leads Reengajados</h3>
              {data.leadsReengajados.length === 0 ? (
                <div style={{ color: D.sub, fontSize: 13 }}>Nenhum lead reengajado detectado neste período.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {data.leadsReengajados.map(l => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: D.input, borderRadius: 8, border: `1px solid ${D.border}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{l.nome} {l.sobrenome || ''}</span>
                      <span style={{ fontSize: 12, color: D.sub }}>{l.whatsapp} · Última Interação: {fmtDate(l.data_ultima_interacao)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Outras Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.sub, letterSpacing: '0.04em' }}>COMPARECIMENTOS</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: D.success, marginTop: 6 }}>{data.comparecimentos}</div>
            </div>
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.sub, letterSpacing: '0.04em' }}>CANCELAMENTOS</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: D.danger, marginTop: 6 }}>{data.cancelamentos}</div>
            </div>
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.sub, letterSpacing: '0.04em' }}>EM NEGOCIAÇÃO / EM ANDAMENTO</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: D.orange, marginTop: 6 }}>{data.emNegociacao}</div>
            </div>
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: D.sub, letterSpacing: '0.04em' }}>SEM RESPOSTA AO 1º CONTATO</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: D.sub, marginTop: 6 }}>{data.semResposta}</div>
            </div>
          </div>

          {/* Cards Expandable: Leads Perdidos */}
          <div 
            onClick={() => setExpandedPerdidos(!expandedPerdidos)}
            style={{
              background: D.card,
              border: `1px solid ${expandedPerdidos ? D.accent : D.border}`,
              borderRadius: 14,
              padding: 20,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: expandedPerdidos ? `0 4px 20px rgba(139,111,71,0.15)` : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>Leads Perdidos / Desistentes</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: D.danger, marginLeft: 10 }}>{data.perdidos.length}</span>
              </div>
              <span style={{ fontSize: 12, color: D.sub }}>{expandedPerdidos ? '▲ Recolher detalhes' : '▼ Mostrar objeções e detalhes'}</span>
            </div>
            {expandedPerdidos && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${D.border}`, paddingTop: 16 }} onClick={e => e.stopPropagation()}>
                {data.perdidos.length === 0 ? (
                  <div style={{ color: D.sub, fontSize: 13 }}>Nenhum lead marcado como perdido.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250, overflowY: 'auto' }}>
                    {data.perdidos.map(l => {
                      // Find if this lead has a registered objection
                      const leadObj = data.rawObjections.find(o => o.lead_id === l.id)
                      return (
                        <div key={l.id} style={{ padding: 12, background: D.input, borderRadius: 8, border: `1px solid ${D.border}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: D.text }}>
                            <span>{l.nome} {l.sobrenome || ''} ({l.whatsapp})</span>
                            <span style={{ color: D.danger }}>{l.crm_status?.nome || 'Perdido'}</span>
                          </div>
                          {leadObj ? (
                            <div style={{ marginTop: 6, fontSize: 12, color: D.orange }}>
                              ⚠️ <strong>Objeção Detectada (IA):</strong> {leadObj.objecao} ({leadObj.categoria})
                            </div>
                          ) : l.observacoes ? (
                            <div style={{ marginTop: 6, fontSize: 12, color: D.sub }}>
                              📝 <strong>Notas:</strong> {l.observacoes}
                            </div>
                          ) : (
                            <div style={{ marginTop: 6, fontSize: 12, color: D.sub, fontStyle: 'italic' }}>Sem objeções registradas.</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sessão de Origens, Interesses e Objeções */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Origens de Leads */}
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: D.text }}>Origem dos Leads Novos</h3>
              {Object.keys(data.origens).length === 0 ? (
                <div style={{ color: D.sub, fontSize: 13, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16 }}>
                  Sem dados de origem para este período.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {Object.entries(data.origens).sort((a,b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, transition: 'transform 0.2s' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{name || 'Indefinido'}</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: D.blue }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interesses de Leads */}
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: D.text }}>Interesses do Período</h3>
              {Object.keys(data.interesses).length === 0 ? (
                <div style={{ color: D.sub, fontSize: 13, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16 }}>
                  Sem interesses registrados para este período.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {Object.entries(data.interesses).sort((a,b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, transition: 'transform 0.2s' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{name || 'Indefinido'}</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: D.orange }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Principais Objeções */}
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: D.text }}>Principais Objeções</h3>
              {Object.keys(data.objecoes).length === 0 ? (
                <div style={{ color: D.sub, fontSize: 13, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16 }}>
                  Nenhuma objeção registrada no período.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {Object.entries(data.objecoes).sort((a,b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, transition: 'transform 0.2s' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: D.sub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{name || 'Indefinido'}</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: D.danger }}>{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  )
}
