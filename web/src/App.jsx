import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSamples, uploadPDF, fetchURLContent, analyzeContent, cancelAnalysis } from './utils/api';

// ===== STAGE CONFIG =====
const STAGES = [
  { key: 'content_parsing', label: 'Parse', icon: '📄', agentClass: 'parser' },
  { key: 'insight_extraction', label: 'Insights', icon: '💡', agentClass: 'insight' },
  { key: 'impact_analysis', label: 'Impact', icon: '⚡', agentClass: 'impact' },
  { key: 'action_generation', label: 'Actions', icon: '🎯', agentClass: 'action' },
  { key: 'action_simulation', label: 'Simulate', icon: '🚀', agentClass: 'simulator' },
];

// ===== LOCAL STORAGE HISTORY =====
const HISTORY_KEY = '@actionflow_web_history';

export const getResultsHistory = () => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load history', e);
    return [];
  }
};

export const saveResultToHistory = (resultData) => {
  try {
    const history = getResultsHistory();
    const riskScore = resultData.impactAnalysis?.overallRiskScore || 0;
    
    // Auto-categorize icon
    let icon = '⚡';
    const firstEntity = resultData.contentParsing?.entities?.[0]?.name?.toLowerCase() || '';
    if (firstEntity.includes('price') || firstEntity.includes('revenue') || firstEntity.includes('budget')) icon = '💰';
    else if (firstEntity.includes('lead') || firstEntity.includes('customer') || firstEntity.includes('user')) icon = '👥';
    else if (firstEntity.includes('partner') || firstEntity.includes('vendor')) icon = '🤝';

    const entry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      title: resultData.contentParsing?.context?.domain || 'Custom Analysis',
      riskScore,
      actionsCount: resultData.actions?.actions?.length || 0,
      icon,
      data: resultData
    };
    
    const newHistory = [entry, ...history].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    return newHistory;
  } catch (e) {
    console.error('Failed to save history', e);
  }
};

// ===== WEB PDF EXPORT ENGINE =====
export const handleExportPDF = (dataToExport) => {
  if (!dataToExport) return;
  
  let html = `
    <html>
    <head>
      <title>ActionFlow AI Audit</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333; padding: 40px; background-color: #ffffff; }
        h1 { color: #1e293b; border-bottom: 3px solid #6366f1; padding-bottom: 10px; margin-bottom: 20px; font-size: 32px; }
        h2 { color: #334155; margin-top: 40px; margin-bottom: 16px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
        h3 { color: #475569; margin-top: 20px; margin-bottom: 10px; }
        .section { margin-bottom: 40px; padding: 24px; background-color: #f8f9fa; border-radius: 12px; }
        ul { line-height: 1.6; padding-left: 20px; }
        li { margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px; }
        .box { padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; }
        .badge { display: inline-block; padding: 4px 8px; background-color: #e0e7ff; color: #4f46e5; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
        .priority-critical { background-color: #fee2e2; color: #b91c1c; }
        .priority-high { background-color: #fef3c7; color: #d97706; }
        .diff-pos { color: #15803d; font-weight: bold; }
        .diff-neg { color: #b91c1c; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>⚡ ActionFlow AI - Deep Audit Report</h1>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  `;

  // 1. PARSING
  if (dataToExport.contentParsing) {
    const cp = dataToExport.contentParsing;
    html += `<div class="section"><h2>📄 1. Content Parsing & Context</h2>
      <div class="grid">
        <div class="box"><strong>Domain:</strong> ${cp.context?.domain || 'N/A'}</div>
        <div class="box"><strong>Goal:</strong> ${cp.context?.goal || 'N/A'}</div>
      </div>
      ${Array.isArray(cp.context?.requirements) ? `<h3>Core Requirements</h3><ul>${cp.context.requirements.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
      <h3>Extracted Entities</h3>
      <table><tr><th>Entity</th><th>Type</th><th>Sentiment</th></tr>
      ${(cp.entities || []).map(e => `<tr><td><strong>${e.name || e.entity}</strong></td><td><span class="badge">${e.type}</span></td><td>${e.sentiment || 'Neutral'}</td></tr>`).join('')}
      </table></div>`;
  }

  // 2. INSIGHTS
  if (dataToExport.insights?.insights) {
    const ins = dataToExport.insights;
    html += `<div class="section"><h2>💡 2. Extracted Insights</h2>
      ${Array.isArray(ins.keyFindings) ? `<h3>Key Findings</h3><ul>${ins.keyFindings.map(kf => `<li>${kf}</li>`).join('')}</ul>` : typeof ins.keyFindings === 'string' ? `<p>${ins.keyFindings}</p>` : ''}
      <h3>Detailed Insights</h3>
      ${Array.isArray(ins.insights) ? ins.insights.map(i => `
        <div class="box" style="margin-bottom: 12px;">
          <strong>${i.title || i.category}</strong> <span class="badge priority-${(i.severity || '').toLowerCase()}">${i.severity || 'Normal'}</span>
          <p>${i.description || i.observation}</p>
          <p><em>Implication:</em> ${i.implication}</p>
        </div>`).join('') : ''}
    </div>`;
  }

  // 3. IMPACT
  if (dataToExport.impactAnalysis?.impactAssessment) {
    const imp = dataToExport.impactAnalysis;
    html += `<div class="section"><h2>⚡ 3. Impact Assessment</h2>
      <div class="box" style="margin-bottom:16px; border-color:#f59e0b; background:#fef3c7;">
        <h3 style="margin:0; color:#d97706;">Risk Score: ${imp.overallRiskScore || 0}/100</h3>
      </div>
      ${Array.isArray(imp.impactAssessment) ? imp.impactAssessment.map(i => `
        <div class="box" style="margin-bottom: 12px;">
          <strong>${(i.area || 'Area').toUpperCase()}</strong>
          <ul>${Array.isArray(i.descriptions) ? i.descriptions.map(d => `<li>${d}</li>`).join('') : ''}</ul>
        </div>`).join('') : ''}
    </div>`;
  }

  // 4. ACTIONS
  if (dataToExport.actions?.actions) {
    html += `<div class="section"><h2>🎯 4. Recommended Actions</h2>
      ${Array.isArray(dataToExport.actions.actions) ? dataToExport.actions.actions.map(a => `
        <div class="box" style="margin-bottom: 16px;">
          <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
            <strong>${a.title}</strong> <span class="badge priority-${(a.priority || '').toLowerCase()}">${a.priority || 'N/A'}</span>
          </div>
          <p style="margin: 0 0 10px 0;">${a.description}</p>
          ${Array.isArray(a.dependencies) && a.dependencies.length ? `<p style="font-size: 12px;"><strong>Dependencies:</strong> ${a.dependencies.join(', ')}</p>` : ''}
          ${a.expectedOutput ? `<p style="font-size: 12px;"><strong>Expected Output:</strong> ${a.expectedOutput}</p>` : ''}
        </div>`).join('') : ''}
    </div>`;
  }

  // 5. SIMULATION
  if (dataToExport.simulation?.summary) {
    const sim = dataToExport.simulation;
    html += `<div class="section"><h2>🔄 5. Execution Simulation</h2>
      <div class="grid">
        <div class="box"><strong>Success:</strong> ${sim.summary.successful}/${sim.summary.totalActions}</div>
        <div class="box"><strong>Duration:</strong> ${sim.summary.duration}ms</div>
      </div>
      ${Array.isArray(sim.executionResults) && sim.executionResults.length ? `
        <h3>Execution Logs</h3>
        <ul>${sim.executionResults.map(er => `<li><strong>${er.service} (${er.status}):</strong> ${er.details || er.actionTitle}</li>`).join('')}</ul>
      ` : ''}
    </div>`;
  }

  html += '</body></html>';

  // Natively print the HTML to trigger OS PDF dialog
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    alert('Popup blocker prevented PDF generation. Please allow popups for this site.');
  }
};

// ===== HEADER =====
function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="header-logo">AF</div>
          <div>
            <div className="header-title">ActionFlow AI</div>
            <div className="header-subtitle">Autonomous Content-to-Action Agent • Business Operations</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="header-badge">🔷 GOOGLE ANTIGRAVITY</div>
          <div className="header-badge">⚡ GEMINI 2.5</div>
        </div>
      </div>
    </header>
  );
}

// ===== FOOTER =====
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>Built with <strong>Google Antigravity</strong> • Powered by Gemini 2.5 Flash</span>
        <span className="footer-gcp">☁️ GCP: Cloud Run • Firebase • Cloud Storage • Cloud Logging</span>
      </div>
    </footer>
  );
}

// ===== CONTENT PARSING VIEW =====
function ContentParsingView({ data }) {
  if (!data) return null;

  // Group entities by type
  const entityGroups = {};
  (data.entities || []).forEach(e => {
    const type = e.type || 'Other';
    if (!entityGroups[type]) entityGroups[type] = [];
    entityGroups[type].push(e);
  });
  const typeStyles = {
    Person: { bg:'rgba(99,102,241,0.12)', border:'#6366f1', color:'#a5b4fc' },
    Organization: { bg:'rgba(6,182,212,0.1)', border:'#06b6d4', color:'#67e8f9' },
    Location: { bg:'rgba(34,197,94,0.1)', border:'#22c55e', color:'#86efac' },
    Product: { bg:'rgba(245,158,11,0.1)', border:'#f59e0b', color:'#fcd34d' },
    Metric: { bg:'rgba(139,92,246,0.1)', border:'#8b5cf6', color:'#c4b5fd' },
    Event: { bg:'rgba(236,72,153,0.1)', border:'#ec4899', color:'#f9a8d4' },
  };
  const getTs = (type) => typeStyles[type] || { bg:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.2)', color:'#94a3b8' };

  // Max metric for bar scaling
  const maxM = Math.max(...(data.metrics||[]).map(m => parseFloat(m.value)||0), 1);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {data.summary && <div className="exec-summary">{data.summary}</div>}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16 }}>

        {/* === Entities by Category === */}
        {Object.keys(entityGroups).length > 0 && (
          <div className="dash-card">
            <div className="dash-card-title">🏢 Entity Categories</div>
            {Object.entries(entityGroups).map(([type, ents]) => {
              const ts = getTs(type);
              return (
                <div key={type} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:ts.color, marginBottom:6 }}>{type}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {ents.map((e,i) => (
                      <span key={i} style={{ padding:'4px 10px', borderRadius:999, background:ts.bg, border:`1px solid ${ts.border}`, color:ts.color, fontSize:'0.82rem', fontWeight:600 }}>
                        {e.name || e.entity}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* === Metrics Bar Chart === */}
        {data.metrics?.length > 0 && (
          <div className="dash-card">
            <div className="dash-card-title">📊 Metrics Visualization</div>
            {data.metrics.map((m,i) => {
              const val = parseFloat(m.value)||0;
              const pct = Math.min((val/maxM)*100, 100);
              const up = m.trend==='increasing', down = m.trend==='decreasing';
              const barColor = up ? 'linear-gradient(90deg,#22c55e,#4ade80)' : down ? 'linear-gradient(90deg,#ef4444,#f87171)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)';
              const glow = up ? 'rgba(34,197,94,0.4)' : down ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)';
              return (
                <div key={i} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:'0.85rem', color:'var(--text-secondary)', fontWeight:600 }}>{m.name}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:'1rem', fontWeight:800, color:'var(--text-primary)' }}>{m.value}{m.unit?` ${m.unit}`:''}</span>
                      <span style={{ fontSize:'1rem', fontWeight:700, color: up?'#22c55e':down?'#ef4444':'#64748b' }}>{up?'▲':down?'▼':'→'}</span>
                    </div>
                  </div>
                  <div style={{ height:8, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:4, transition:'width 1s ease', boxShadow:`0 0 8px ${glow}` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* === Key Facts Bullets === */}
        {data.facts?.length > 0 && (
          <div className="dash-card">
            <div className="dash-card-title">📋 Key Facts</div>
            <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
              {data.facts.slice(0,8).map((f,i) => (
                <li key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:800, color:'#a5b4fc' }}>{i+1}</span>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:'0.875rem', color:'var(--text-secondary)', lineHeight:1.6 }}>{f.statement}</span>
                    <div style={{ height:3, width:`${(f.confidence||0.7)*100}%`, background:'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius:2, marginTop:5 }} />
                  </div>
                  <span style={{ fontSize:'0.7rem', color:'#64748b', fontWeight:700, whiteSpace:'nowrap' }}>{Math.round((f.confidence||0.7)*100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* === Context === */}
        {data.context && (
          <div className="dash-card">
            <div className="dash-card-title">🌐 Context</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[{l:'Domain',v:data.context.domain,ic:'🏭'},{l:'Region',v:data.context.region,ic:'📍'},{l:'Time Period',v:data.context.timePeriod,ic:'📅'},{l:'Urgency',v:data.context.urgency,ic:'⚡'}].filter(c=>c.v).map((c,i)=>(
                <div key={i} style={{ padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderRadius:8, border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:4 }}>{c.ic} {c.l}</div>
                  <div style={{ fontSize:'0.9rem', fontWeight:700, color:'var(--text-primary)' }}>{c.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== PIPELINE VISUALIZER =====
function PipelineVisualizer({ stageStatus }) {
  return (
    <div className="pipeline">
      {STAGES.map((stage, i) => {
        const status = stageStatus[stage.key] || 'idle';
        return (
          <div key={stage.key} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <div className={`pipeline-connector ${status === 'complete' || status === 'running' ? (status === 'complete' ? 'done' : 'active') : ''}`} />
            )}
            <div className="pipeline-node">
              <div className={`pipeline-dot ${status}`}>
                {status === 'complete' ? '✓' : status === 'error' ? '✕' : stage.icon}
              </div>
              <div className="pipeline-label">{stage.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== TRACE LOG =====
function TraceLog({ traces, isRunning }) {
  const logRef = useRef(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [traces]);

  if (traces.length === 0) return null;

  const getAgentClass = (stage) => {
    const s = STAGES.find(st => st.key === stage);
    return s ? s.agentClass : '';
  };
  const getAgentName = (stage) => {
    const s = STAGES.find(st => st.key === stage);
    return s ? s.label : stage;
  };

  return (
    <div className="trace-log">
      <div className="trace-header">
        <span className="trace-header-title">🔍 Agent Trace Log</span>
        <div className={`trace-dot ${isRunning ? 'live' : 'done'}`} />
      </div>
      <div className="trace-body" ref={logRef}>
        {traces.map((t, i) => (
          <div key={i} className="trace-entry fade-in">
            <span className="trace-time">{new Date(t.timestamp).toLocaleTimeString()}</span>
            <span className={`trace-agent ${getAgentClass(t.stage)}`}>[{getAgentName(t.stage)}]</span>
            <span className="trace-msg">
              {t.status === 'started' ? t.data?.message || 'Starting...' :
               t.status === 'completed' ? `✓ Done${t.data?.trace?.duration ? ` (${t.data.trace.duration}ms)` : ''}` :
               t.status === 'error' ? `✕ Error: ${t.data?.error}` : t.data?.message || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== COLLAPSIBLE SECTION =====
function Section({ title, icon, badge, badgeClass, children, defaultOpen = true, color = 'var(--accent-1)' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="result-section fade-in-up" style={{ borderColor: `${color}40`, boxShadow: `0 4px 20px ${color}10` }}>
      <div className="section-header" onClick={() => setOpen(!open)} style={{ borderBottom: `1px solid ${color}40`, background: `linear-gradient(135deg, ${color}25, transparent)` }}>
        <span className="section-title">
          <span style={{ color }}>{icon}</span> {title}
          {badge && <span className={`section-badge ${badgeClass || ''}`}>{badge}</span>}
        </span>
        <button className={`section-toggle ${open ? 'open' : ''}`}>▼</button>
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

// ===== INSIGHTS VIEW =====
function InsightsView({ data }) {
  if (!data?.insights?.length) return <p className="insight-desc">No insights extracted.</p>;
  const sevCfg = {
    critical: { color:'#ef4444', bg:'rgba(239,68,68,0.1)', icon:'🔴' },
    high:     { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', icon:'🟠' },
    medium:   { color:'#6366f1', bg:'rgba(99,102,241,0.1)', icon:'🔵' },
    low:      { color:'#22c55e', bg:'rgba(34,197,94,0.1)',  icon:'🟢' },
  };
  const counts = {};
  data.insights.forEach(ins => { const s=(ins.severity||'medium').toLowerCase(); counts[s]=(counts[s]||0)+1; });
  return (
    <div>
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {Object.entries(counts).map(([s,c]) => { const cfg=sevCfg[s]||sevCfg.medium; return (
          <div key={s} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 16px', background:cfg.bg, border:`1px solid ${cfg.color}`, borderRadius:999 }}>
            <span>{cfg.icon}</span><span style={{ fontWeight:700, color:cfg.color, fontSize:'0.9rem' }}>{c} {s.charAt(0).toUpperCase()+s.slice(1)}</span>
          </div>
        );})}
      </div>
      {data.keyFindings && <div className="exec-summary" style={{ marginBottom:16 }}>{typeof data.keyFindings==='string' ? data.keyFindings : JSON.stringify(data.keyFindings)}</div>}
      <div className="insight-grid">
        {data.insights.map((ins,i) => {
          const sev=(ins.severity||'medium').toLowerCase();
          const cfg=sevCfg[sev]||sevCfg.medium;
          return (
            <div key={i} className={`insight-card ${sev}`}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div className="insight-title" style={{ flex:1 }}>{ins.title}</div>
                <span style={{ padding:'3px 10px', borderRadius:999, background:cfg.bg, color:cfg.color, fontSize:'0.72rem', fontWeight:800, border:`1px solid ${cfg.color}`, marginLeft:8, whiteSpace:'nowrap' }}>{cfg.icon} {sev}</span>
              </div>
              <div className="insight-desc">{ins.description}</div>
              {ins.implication && <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(99,102,241,0.08)', borderRadius:6, fontSize:'0.82rem', color:'#a5b4fc', borderLeft:'3px solid #6366f1' }}>💡 {ins.implication}</div>}
              <div className="confidence-bar" style={{ marginTop:10 }}><div className="confidence-fill" style={{ width:`${(ins.confidence||0.5)*100}%` }} /></div>
              <div className="insight-meta">
                {ins.type && <span className="insight-tag">{ins.type}</span>}
                {ins.category && <span className="insight-tag">{ins.category}</span>}
                <span className="insight-tag">{Math.round((ins.confidence||0.5)*100)}% confidence</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== IMPACT VIEW =====
function ImpactView({ data }) {
  if (!data) return null;
  const riskScore = data.overallRiskScore || 0;
  const riskLevel = riskScore>=75?'critical':riskScore>=50?'high':riskScore>=25?'medium':'low';
  const riskColors = { critical:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#22c55e' };
  const riskColor = riskColors[riskLevel];
  const impacts = [];
  data.impactAssessment?.forEach(ia => ia.impacts?.forEach(imp => impacts.push(imp)));
  const areaIcons = { revenue:'💰',financial:'💳',customer:'👥',operational:'⚙️',market:'📈',regulatory:'⚖️',technology:'💻',reputation:'⭐',supply:'🚚',default:'📊' };
  return (
    <div>
      {/* Risk Gauge Dashboard */}
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, marginBottom:24, alignItems:'stretch' }}>
        <div style={{ padding:24, background:`linear-gradient(135deg,${riskColor}18,rgba(10,10,20,0.95))`, border:`2px solid ${riskColor}40`, borderRadius:16, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, color:riskColor, textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>Risk Score</div>
          <div style={{ fontSize:'4.5rem', fontWeight:900, color:riskColor, lineHeight:1 }}>{riskScore}</div>
          <div style={{ height:8, background:'rgba(0,0,0,0.3)', borderRadius:4, overflow:'hidden', width:'100%', marginTop:12 }}>
            <div style={{ height:'100%', width:`${riskScore}%`, background:riskColor, borderRadius:4, boxShadow:`0 0 12px ${riskColor}` }} />
          </div>
          <div style={{ fontSize:'0.9rem', fontWeight:800, color:riskColor, marginTop:10, textTransform:'capitalize' }}>{riskLevel} Risk</div>
        </div>
        <div>{data.executiveSummary && <div className="exec-summary" style={{ height:'100%', display:'flex', alignItems:'center' }}>{data.executiveSummary}</div>}</div>
      </div>
      {/* Impact Cards Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {impacts.map((imp,j) => {
          const area=(imp.area||'').toLowerCase().replace(/_/g,' ');
          const iconKey=Object.keys(areaIcons).find(k=>area.includes(k))||'default';
          return (
            <div key={j} className="impact-card">
              <div className="impact-area">{areaIcons[iconKey]} {imp.area?.replace(/_/g,' ')}</div>
              <div className="impact-desc">{imp.description}</div>
              {imp.quantifiedImpact && <div className="impact-quantified">📊 {imp.quantifiedImpact}</div>}
              {imp.cascadingEffects?.length>0 && (
                <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:4 }}>
                  {imp.cascadingEffects.map((ef,k)=>(
                    <span key={k} style={{ fontSize:'0.72rem', padding:'2px 8px', borderRadius:999, background:'rgba(6,182,212,0.1)', color:'#06b6d4', border:'1px solid rgba(6,182,212,0.2)' }}>{ef}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== ACTIONS VIEW =====
function ActionsView({ data }) {
  if (!data?.actions?.length) return null;
  const priCfg = {
    critical:{ color:'#ef4444', bg:'rgba(239,68,68,0.1)', border:'#ef4444', icon:'🔴' },
    high:    { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', border:'#f59e0b', icon:'🟠' },
    medium:  { color:'#06b6d4', bg:'rgba(6,182,212,0.1)',  border:'#06b6d4', icon:'🔵' },
    low:     { color:'#22c55e', bg:'rgba(34,197,94,0.1)',  border:'#22c55e', icon:'🟢' },
  };
  return (
    <div>
      {data.actionSummary && <div className="exec-summary" style={{ marginBottom:16 }}>{data.actionSummary}</div>}
      {/* Priority counts */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {Object.entries(priCfg).map(([p,cfg])=>{ const c=data.actions.filter(a=>(a.priority||'').toLowerCase()===p).length; return c>0&&(
          <div key={p} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:999 }}>
            <span>{cfg.icon}</span><span style={{ color:cfg.color, fontWeight:700, fontSize:'0.85rem' }}>{c} {p.charAt(0).toUpperCase()+p.slice(1)}</span>
          </div>
        );})}
      </div>
      {/* Timeline */}
      <div>
        {data.actions.map((act,i)=>{
          const p=(act.priority||'medium').toLowerCase();
          const cfg=priCfg[p]||priCfg.medium;
          return (
            <div key={i} style={{ display:'flex', gap:16, marginBottom:16 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:cfg.bg, border:`2px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'1rem', color:cfg.color, boxShadow:`0 0 14px ${cfg.border}40` }}>{i+1}</div>
                {i<data.actions.length-1&&<div style={{ width:2, flex:1, minHeight:24, background:'rgba(255,255,255,0.06)', marginTop:4 }} />}
              </div>
              <div className="action-card" style={{ flex:1, marginBottom:0 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div className="action-title">{act.title}</div>
                    <span style={{ padding:'3px 10px', borderRadius:999, background:cfg.bg, color:cfg.color, fontSize:'0.72rem', fontWeight:800, border:`1px solid ${cfg.border}`, marginLeft:8, whiteSpace:'nowrap' }}>{cfg.icon} {p}</span>
                  </div>
                  <div className="action-desc">{act.description}</div>
                  {(act.expectedOutcome||act.estimatedImpact)&&<div className="action-outcome">✓ Expected: {act.expectedOutcome||act.estimatedImpact}</div>}
                  {act.targetService&&<div style={{ marginTop:8 }}><span className="action-service">{act.targetService}</span></div>}
                  {act.dependencies?.length>0&&<div style={{ marginTop:8, fontSize:'0.78rem', color:'var(--text-muted)' }}>🔗 Depends on: {act.dependencies.join(', ')}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== SIMULATION VIEW =====
function SimulationView({ data }) {
  const [expanded, setExpanded] = useState({});
  if (!data) return null;
  const { summary, stateChanges, executionResults } = data;
  const toggle = (i) => setExpanded(prev=>({...prev,[i]:!prev[i]}));
  const svcIcons = { crm:'👥',email:'✉️',dashboard:'📊',notification:'🔔',pricing:'💰',campaign:'📢',default:'🔧' };
  return (
    <div>
      {/* Stats Dashboard */}
      {summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
          {[
            {label:'Total Actions',value:summary.totalActions,color:'#6366f1',bg:'rgba(99,102,241,0.1)',icon:'⚡'},
            {label:'Successful',value:summary.successful,color:'#22c55e',bg:'rgba(34,197,94,0.1)',icon:'✅'},
            {label:'Failed',value:summary.failed,color:'#ef4444',bg:'rgba(239,68,68,0.1)',icon:'❌'},
            {label:'Duration',value:`${summary.duration}ms`,color:'#06b6d4',bg:'rgba(6,182,212,0.1)',icon:'⏱️'},
          ].map((s,i)=>(
            <div key={i} style={{ padding:20, background:s.bg, border:`1px solid ${s.color}40`, borderRadius:14, textAlign:'center' }}>
              <div style={{ fontSize:'1.8rem', marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:'2.2rem', fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:6, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {/* Execution Log - Collapsible Dropdowns */}
      {executionResults?.length>0&&(
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:'0.8rem', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>🔄 Execution Log — Mock API Calls</div>
          {executionResults.map((er,i)=>(
            <div key={i} style={{ marginBottom:8, borderRadius:12, border:`1px solid ${er.status==='success'?'rgba(34,197,94,0.25)':'rgba(239,68,68,0.25)'}`, overflow:'hidden' }}>
              <button onClick={()=>toggle(i)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', background:er.status==='success'?'rgba(34,197,94,0.06)':'rgba(239,68,68,0.06)', border:'none', cursor:'pointer', textAlign:'left' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:'1.1rem' }}>{er.status==='success'?'✅':'❌'}</span>
                  <span style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.95rem' }}>{er.actionTitle}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontFamily:'monospace' }}>{new Date(er.timestamp).toLocaleTimeString()}</span>
                  <span style={{ color:'var(--text-muted)', fontSize:'0.9rem', transition:'transform 0.2s', transform:expanded[i]?'rotate(180deg)':'rotate(0deg)' }}>▼</span>
                </div>
              </button>
              {expanded[i]&&(
                <div style={{ padding:'14px 18px', background:'rgba(0,0,0,0.2)', borderTop:`1px solid ${er.status==='success'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)'}`, display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ fontFamily:'monospace', fontSize:'0.8rem', padding:'8px 12px', background:'rgba(99,102,241,0.08)', borderRadius:8, border:'1px solid rgba(99,102,241,0.2)', display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ color:'#22c55e', fontWeight:700 }}>POST</span>
                    <span style={{ color:'#06b6d4' }}>https://actionflow-api.run.app/api/mock/{er.service||'service'}/{er.method||'execute'}</span>
                  </div>
                  {er.result&&(
                    <div style={{ fontFamily:'monospace', fontSize:'0.78rem', padding:'10px 12px', background:'rgba(0,0,0,0.3)', borderRadius:8, border:'1px solid rgba(255,255,255,0.06)', display:'grid', gridTemplateColumns:'140px 1fr', gap:4 }}>
                      {Object.entries(er.result).filter(([k])=>!['service','method'].includes(k)).map(([key,val])=>(
                        <div key={key} style={{ display:'contents' }}>
                          <span style={{ color:'#8b5cf6', fontWeight:600 }}>{key}:</span>
                          <span style={{ color:'#22c55e' }}>{typeof val==='object'?JSON.stringify(val):String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {er.error&&<div style={{ color:'var(--danger)', fontSize:'0.85rem', padding:'8px 12px', background:'rgba(239,68,68,0.08)', borderRadius:8 }}>❌ {er.error}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* State Changes */}
      {stateChanges?.length>0&&(
        <div>
          <div style={{ fontSize:'0.8rem', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>📋 System State Changes</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
            {stateChanges.map((ch,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.15)' }}>
                <span style={{ fontSize:'1.3rem' }}>{svcIcons[ch.service?.toLowerCase()]||svcIcons.default}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--accent-4)' }}>{ch.service}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{ch.type?.replace(/_/g,' ')}</div>
                </div>
                <span style={{ background:'rgba(34,197,94,0.2)', padding:'3px 10px', borderRadius:10, fontWeight:800, color:'#22c55e', fontSize:'0.85rem' }}>+{ch.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ===== BEFORE/AFTER VIEW =====
function BeforeAfterView({ data }) {
  if (!data?.beforeState || !data?.afterState) return null;

  const getDetailedMetrics = (state) => {
    const metrics = [];
    if (state.crm) {
      metrics.push({ icon: '👥', label: 'CRM Activities', value: state.crm.activities?.length || 0, cat: 'CRM' });
      metrics.push({ icon: '📋', label: 'CRM Campaigns', value: state.crm.campaigns?.length || 0, cat: 'CRM' });
      metrics.push({ icon: '🎯', label: 'Active Leads', value: state.crm.leads?.length || 0, cat: 'CRM' });
    }
    if (state.campaign) {
      metrics.push({ icon: '📢', label: 'Marketing Campaigns', value: state.campaign.campaigns?.length || 0, cat: 'Campaign' });
      metrics.push({ icon: '💵', label: 'Budget Allocated', value: state.campaign.budgetAllocated || 0, format: 'currency', cat: 'Campaign' });
    }
    if (state.email) {
      metrics.push({ icon: '✉️', label: 'Emails Sent', value: state.email.sentEmails?.length || 0, cat: 'Email' });
      metrics.push({ icon: '📝', label: 'Email Drafts', value: state.email.drafts?.length || 0, cat: 'Email' });
    }
    if (state.notification) {
      metrics.push({ icon: '🔔', label: 'Notifications Sent', value: state.notification.notifications?.length || 0, cat: 'Notification' });
    }
    if (state.pricing) {
      metrics.push({ icon: '💰', label: 'Price Changes', value: state.pricing.priceHistory?.length || 0, cat: 'Pricing' });
      metrics.push({ icon: '🏷️', label: 'Discount Rules', value: state.pricing.discountRules?.length || 0, cat: 'Pricing' });
    }
    if (state.dashboard) {
      metrics.push({ icon: '⚠️', label: 'Dashboard Alerts', value: state.dashboard.alerts?.length || 0, cat: 'Dashboard' });
      metrics.push({ icon: '📊', label: 'KPI Updates', value: state.dashboard.updateLog?.length || 0, cat: 'Dashboard' });
    }
    return metrics;
  };

  const before = getDetailedMetrics(data.beforeState);
  const after = getDetailedMetrics(data.afterState);

  // Find actual changes
  const changes = after.map((m, i) => ({
    ...m,
    beforeVal: before[i]?.value || 0,
    diff: typeof m.value === 'number' && typeof before[i]?.value === 'number'
      ? m.value - before[i].value : null,
  })).filter(m => m.diff !== null && m.diff !== 0);

  const fmtVal = (v, format) => format === 'currency' ? `PKR ${v.toLocaleString()}` : v;

  return (
    <div>
      {/* Changes Summary */}
      {changes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="panel-title" style={{ marginBottom: 8 }}>⚡ Resulting System Changes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {changes.map((c, i) => (
              <div key={i} style={{
                background: c.diff > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${c.diff > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 8, padding: 12, textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem' }}>{c.icon}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'line-through' }}>
                    {fmtVal(c.beforeVal, c.format)}
                  </span>
                  <span style={{ color: 'var(--accent-4)', fontSize: '0.9rem' }}>→</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {fmtVal(c.value, c.format)}
                  </span>
                </div>
                <div style={{
                  marginTop: 4, fontWeight: 700, fontSize: '0.8rem',
                  color: c.diff > 0 ? '#22c55e' : '#ef4444'
                }}>
                  {c.diff > 0 ? `▲ +${fmtVal(c.diff, c.format)}` : `▼ ${fmtVal(c.diff, c.format)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Before/After Comparison Table */}
      <div className="before-after">
        <div className="state-panel before">
          <div className="state-label before">⬅ BEFORE Simulation</div>
          {before.map((m, i) => (
            <div key={i} className="state-item">
              <span>{m.icon} {m.label}</span>
              <span className="state-value">{fmtVal(m.value, m.format)}</span>
            </div>
          ))}
          <div className="state-item" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
            <span>🕐 Captured At</span>
            <span className="state-value" style={{ fontSize: '0.7rem' }}>
              {new Date(data.beforeState.capturedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="state-panel after">
          <div className="state-label after">AFTER Simulation ➡</div>
          {after.map((m, i) => {
            const diff = typeof m.value === 'number' && typeof before[i]?.value === 'number'
              ? m.value - before[i].value : null;
            return (
              <div key={i} className="state-item" style={{
                background: diff && diff !== 0 ? 'rgba(34,197,94,0.06)' : 'transparent',
                borderRadius: 4, padding: '4px 6px', margin: '-4px -6px'
              }}>
                <span>{m.icon} {m.label}</span>
                <span className="state-value">
                  {fmtVal(m.value, m.format)}
                  {diff !== null && diff !== 0 && (
                    <span className={`state-change ${diff > 0 ? 'positive' : 'negative'}`} style={{ marginLeft: 6 }}>
                      {diff > 0 ? `+${fmtVal(diff, m.format)}` : fmtVal(diff, m.format)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          <div className="state-item" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
            <span>🕐 Captured At</span>
            <span className="state-value" style={{ fontSize: '0.7rem' }}>
              {new Date(data.afterState.capturedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== CONTENT INPUT =====
function ContentInput({ onAnalyze, isLoading }) {
  const [tab, setTab] = useState('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [samples, setSamples] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchSamples().then(setSamples).catch(() => {});
  }, []);

  const handleAnalyze = () => {
    if (text.trim()) onAnalyze(text.trim());
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) return;
    try {
      const result = await uploadPDF(file);
      setText(result.text || '');
      setTab('text');
    } catch (e) {
      alert('Failed to parse PDF: ' + e.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setFetchingUrl(true);
    try {
      const result = await fetchURLContent(url.trim());
      setText(result.text || '');
      setTab('text');
    } catch (e) {
      alert('Failed to fetch URL: ' + e.message);
    } finally {
      setFetchingUrl(false);
    }
  };

  return (
    <div className="input-panel">
      <div className="panel-title">📥 Input Content</div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>✏️ Text</button>
        <button className={`tab-btn ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>📄 PDF</button>
        <button className={`tab-btn ${tab === 'url' ? 'active' : ''}`} onClick={() => setTab('url')}>🔗 URL</button>
      </div>

      {tab === 'text' && (
        <textarea
          className="text-input"
          placeholder="Paste your report, article, news, or any unstructured content here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {tab === 'pdf' && (
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="upload-icon">📤</div>
          <div className="upload-text">Drop a PDF here or click to browse</div>
          <div className="upload-hint">Supports .pdf files up to 10MB</div>
          <input ref={fileRef} type="file" accept=".pdf" hidden onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}

      {tab === 'url' && (
        <div className="url-input-row">
          <input className="url-input" placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn btn-secondary btn-fetch" onClick={handleFetchUrl} disabled={fetchingUrl}>
            {fetchingUrl ? <span className="spinner" /> : '🔍 Fetch'}
          </button>
        </div>
      )}

      <button className={`btn btn-primary btn-full ${isLoading ? 'animating' : ''}`} onClick={handleAnalyze} disabled={isLoading || !text.trim()}>
        {isLoading ? <><span className="spinner" /> Analyzing...</> : '⚡ Analyze & Execute'}
      </button>

      {samples.length > 0 && (
        <>
          <div className="panel-title">📋 Sample Scenarios</div>
          <div className="samples-grid">
            {samples.map((s) => (
              <div key={s.id} className="sample-card" onClick={() => { setText(s.content); setTab('text'); }}>
                <span className="sample-icon">{s.icon}</span>
                <div className="sample-info">
                  <div className="sample-title">{s.title}</div>
                  <div className="sample-category">{s.category}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ===== MAIN APP =====
export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [stageStatus, setStageStatus] = useState({});
  const [traces, setTraces] = useState([]);
  // App State
  const [activeTab, setActiveTab] = useState('console'); // console, history
  const [resultTab, setResultTab] = useState('insights'); // parsing, insights, impact, actions, simulation
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const activePipelineIdRef = useRef(null);

  useEffect(() => {
    setHistory(getResultsHistory());
  }, []);

  const handleCancel = useCallback(async () => {
    if (activePipelineIdRef.current) {
      try {
        await cancelAnalysis(activePipelineIdRef.current);
      } catch (e) {}
      activePipelineIdRef.current = null;
      setIsLoading(false);
      setError('Analysis stopped by user');
      setStageStatus(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k] === 'running') next[k] = 'error';
        });
        return next;
      });
    }
  }, []);

  const handleAnalyze = useCallback(async (content) => {
    setIsLoading(true);
    setStageStatus({});
    setTraces([]);
    setResult(null);
    setError(null);
    setActiveTab('console');

    const pipelineId = 'web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    activePipelineIdRef.current = pipelineId;

    try {
      await analyzeContent(content, (event) => {
        if (activePipelineIdRef.current !== pipelineId) return;
        setTraces(prev => [...prev, event]);

        if (event.stage === 'final_result' && event.status === 'completed') {
          const finalData = event.data;
          setResult(finalData);
          setIsLoading(false);
          activePipelineIdRef.current = null;
          const updatedHistory = saveResultToHistory(finalData);
          setHistory(updatedHistory);
          setResultTab('insights');
          return;
        }

        if (event.stage === 'pipeline' && event.status === 'error') {
          setError(event.data?.error || 'Pipeline failed');
          setIsLoading(false);
          activePipelineIdRef.current = null;
          return;
        }

        if (event.status === 'started') setStageStatus(prev => ({ ...prev, [event.stage]: 'running' }));
        else if (event.status === 'completed') setStageStatus(prev => ({ ...prev, [event.stage]: 'complete' }));
        else if (event.status === 'error') setStageStatus(prev => ({ ...prev, [event.stage]: 'error' }));
      }, pipelineId);
    } catch (e) {
      if (activePipelineIdRef.current === pipelineId) {
        setError(e.message || 'Analysis failed');
        setIsLoading(false);
        activePipelineIdRef.current = null;
      }
    }
  }, []);

  const loadHistoryResult = (itemData) => {
    setResult(itemData);
    setActiveTab('console');
    setResultTab('insights');
  };

  const sectionTabs = [
    { id: 'parsing', icon: '📄', label: 'Parsing', badge: `${result?.contentParsing?.entities?.length || 0}` },
    { id: 'insights', icon: '💡', label: 'Insights', badge: `${result?.insights?.insights?.length || 0}` },
    { id: 'impact', icon: '⚡', label: 'Impact', badge: result?.impactAnalysis?.overallRiskScore ? `${result.impactAnalysis.overallRiskScore}` : '—' },
    { id: 'actions', icon: '🎯', label: 'Actions', badge: `${result?.actions?.actions?.length || 0}` },
    { id: 'simulation', icon: '🚀', label: 'Simulation', badge: result?.simulation?.summary ? `${result.simulation.summary.successful}/${result.simulation.summary.totalActions}` : '—' },
  ];

  const navTabs = [
    { id: 'console', icon: '⚡', label: 'Console' },
    { id: 'history', icon: '📂', label: 'Runs Directory' },
  ];

  return (
    <>
      <Header />

      {/* Top section: sidebar input + pipeline/trace/empty */}
      <div className="app-layout">
        <ContentInput onAnalyze={handleAnalyze} isLoading={isLoading} />

        <div className="results-panel">
          {/* Nav tabs + Stop button row */}
          <div className="main-tabs-bar">
            {navTabs.map(t => (
              <button
                key={t.id}
                className={`main-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="main-tab-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
            {/* Stop button always visible in header when loading */}
            {isLoading && (
              <button onClick={handleCancel} className="stop-btn">
                <span className="stop-dot" />
                ⏹ Stop Execution
              </button>
            )}
          </div>

          {activeTab === 'console' && (
            <div className="fade-in-up">
              {/* Pipeline visualizer */}
              {(isLoading || Object.keys(stageStatus).length > 0) && (
                <div className="pipeline-header-row">
                  <PipelineVisualizer stageStatus={stageStatus} />
                </div>
              )}
              {/* Scanning animation overlay while loading */}
              {isLoading && (
                <div className="analyzing-banner">
                  <div className="analyzing-scanner" />
                  <span className="analyzing-text">🤖 Multi-Agent Pipeline Running...</span>
                </div>
              )}
              {traces.length > 0 && <TraceLog traces={traces} isRunning={isLoading} />}
              {error && (
                <div className="result-section" style={{ marginTop: 16 }}>
                  <div className="section-body" style={{ color: 'var(--danger)' }}>❌ Error: {error}</div>
                </div>
              )}
              {!isLoading && !result && !error && traces.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🧠</div>
                  <div className="empty-title">Ready to Analyze</div>
                  <div className="empty-desc">
                    Paste a business report, upload a PDF, or fetch a URL — ActionFlow AI will extract insights, analyze impact, recommend actions, and simulate execution in real-time.
                  </div>
                  <div className="empty-gcp">
                    <span>☁️ Google Cloud Platform</span><span>•</span><span>🔷 Antigravity</span><span>•</span><span>⚡ Gemini 2.5</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="runs-directory fade-in-up">
              <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-glass)', marginBottom: 12 }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--accent-1)', fontWeight: 800 }}>📊 Audit History Hub</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select a past run to inspect its multi-agent results.</p>
              </div>
              {history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No past runs found in this browser.</p>
              ) : (
                history.map((entry, idx) => (
                  <div key={entry.id} className="history-card" onClick={() => loadHistoryResult(entry.data)}>
                    <div className="history-icon-wrapper">{entry.icon}</div>
                    <div className="history-info">
                      <div className="history-title">Run #{history.length - idx}: {entry.title}</div>
                      <div className="history-subtitle">
                        {entry.data?.contentParsing?.entities?.[0]?.name || entry.data?.contentParsing?.entities?.[0]?.entity || 'Custom Content'}
                      </div>
                      <div className="history-time">⏱️ {entry.timestamp}</div>
                    </div>
                    <div className="history-actions">
                      <button className="btn-pdf" onClick={(e) => { e.stopPropagation(); handleExportPDF(entry.data); }}>
                        ⬇️ PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full-width results area now moved outside the main layout */}
      {result && (
        <div className="results-fullscreen fade-in-up">
          {/* Header bar with domain info + PDF export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16, marginTop: 24 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-1)' }}>
                📊 {result.contentParsing?.context?.domain || 'Analysis Results'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {result.contentParsing?.entities?.length || 0} entities · {result.insights?.insights?.length || 0} insights · {result.actions?.actions?.length || 0} actions
              </p>
            </div>
            <button className="btn-pdf" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => handleExportPDF(result)}>
              ⬇️ Export PDF
            </button>
          </div>

          {/* Mobile-style section tabs */}
          <div className="result-section-tabs">
            {sectionTabs.map(t => (
              <button
                key={t.id}
                className={`result-section-tab ${resultTab === t.id ? 'active' : ''}`}
                onClick={() => setResultTab(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                <span>{t.label}</span>
                <span className="tab-badge">{t.badge}</span>
              </button>
            ))}
          </div>

          {/* Tab content panes - one at a time */}
          <div className="result-tab-pane" key={resultTab}>
            {resultTab === 'parsing' && (
              <Section title="Content Parsing" icon="📄" badge={`${result.contentParsing?.entities?.length || 0} entities`} badgeClass="low" color="var(--accent-4)">
                <ContentParsingView data={result.contentParsing} />
              </Section>
            )}
            {resultTab === 'insights' && (
              <Section title="Extracted Insights" icon="💡" badge={`${result.insights?.insights?.length || 0} found`} badgeClass="medium" color="var(--accent-2)">
                <InsightsView data={result.insights} />
              </Section>
            )}
            {resultTab === 'impact' && (
              <Section title="Impact Analysis" icon="⚡" badge={result.impactAnalysis?.overallRiskScore ? `Risk: ${result.impactAnalysis.overallRiskScore}` : ''} badgeClass={result.impactAnalysis?.overallRiskScore >= 60 ? 'critical' : 'medium'} color="var(--danger)">
                <ImpactView data={result.impactAnalysis} />
              </Section>
            )}
            {resultTab === 'actions' && (
              <Section title="Recommended Actions" icon="🎯" badge={`${result.actions?.actions?.length || 0} actions`} badgeClass="high" color="var(--warning)">
                <ActionsView data={result.actions} />
              </Section>
            )}
            {resultTab === 'simulation' && (
              <>
                <Section title="Simulation Results" icon="🚀" badge={result.simulation?.summary ? `${result.simulation.summary.successful}/${result.simulation.summary.totalActions} success` : ''} badgeClass="low" color="var(--success)">
                  <SimulationView data={result.simulation} />
                </Section>
                <div style={{ marginTop: 20 }}>
                  <Section title="Before / After State" icon="🔄" color="var(--info)">
                    <BeforeAfterView data={result.simulation} />
                  </Section>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
