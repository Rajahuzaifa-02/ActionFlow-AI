import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  useWindowDimensions, PanResponder, Modal, Switch, ActivityIndicator, Alert, Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getResult, getResultsHistory, setSelectedResult } from '../services/store';

const C = {
  bg: '#0e0e1a',
  bgCard: '#141424',
  bgGlass: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  accent1: '#6366f1',
  accent2: '#8b5cf6',
  accent3: '#ec4899',
  accent4: '#06b6d4',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  success: '#22c55e',
  warning: '#a86f0bff',
  danger: '#ef4444',
};

// Bullet Summary Helper
function renderBulletSummary(paragraph, bulletColor = '#6366f1') {
  if (!paragraph) return null;
  const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 4);
  return (
    <View style={{ marginBottom: 18, gap: 10, paddingHorizontal: 4 }}>
      {sentences.map((sentence, idx) => (
        <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Text style={{ fontSize: 15, color: bulletColor, fontWeight: '900', marginTop: 2 }}>✦</Text>
          <Text style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 22, flex: 1, textAlign: 'justify' }}>
            {sentence}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Collapsible Section Card
function SectionCard({ title, icon, badge, badgeColor, accentColor, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const accent = accentColor || C.accent1;
  return (
    <View style={[s.section, open && { borderColor: accent, shadowColor: accent, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 }]}>
      <TouchableOpacity
        style={[s.sectionHeader, { borderLeftWidth: 4, borderLeftColor: accent }]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={[s.sectionIconBadge, { backgroundColor: accent + '22' }]}>
            <Text style={{ fontSize: 16 }}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>{title}</Text>
          </View>
          {badge && <Text style={[s.badge, { color: '#ffffff', backgroundColor: badgeColor || C.accent4, borderColor: badgeColor || C.accent4 }]}>{badge}</Text>}
        </View>
        <Text style={[s.toggleBtn, { color: accent }]}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
}

// Collapsible Mock API Log Card
function ExecutionLogCard({ er, i }) {
  const [expanded, setExpanded] = useState(false);

  const requestHeaders = er.requestHeaders || {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-antigravity-secure-token',
    'X-Requested-With': 'ActionFlowAISimulator'
  };
  const responseHeaders = er.responseHeaders || {
    'Content-Type': 'application/json',
    'X-Powered-By': 'ExpressJS-MockAPI',
    'X-Response-Time': '34ms'
  };
  const requestParams = er.requestParams || {};

  return (
    <View style={[s.simExecCard, { borderLeftColor: er.status === 'success' ? C.success : C.danger }]}>
      <TouchableOpacity style={s.simExecHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 14 }}>{er.status === 'success' ? '✅' : '❌'}</Text>
          <Text style={[s.simExecTitle, { flex: 1 }]}>{er.actionTitle}</Text>
        </View>
        <Text style={[s.toggleBtn, { color: expanded ? C.accent2 : C.textSecondary }]}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={s.simExecBody}>
          {/* Step 1: Endpoint Request Configuration */}
          <Text style={s.stepLogTitle}>⚙️ STEP 1: INITIALIZE HTTP CALL</Text>
          <View style={s.apiEndpointRow}>
            <Text style={s.methodBadge}>POST</Text>
            <Text style={s.apiPath}>https://actionflow-api.run.app/api/mock/{er.service || 'service'}/{er.method || 'execute'}</Text>
          </View>

          {/* Step 2: Request Headers */}
          <Text style={s.stepLogTitle}>📤 STEP 2: REQUEST HEADERS</Text>
          <View style={s.jsonPayload}>
            {Object.entries(requestHeaders).map(([key, val]) => (
              <View key={key} style={s.jsonLine}>
                <Text style={s.jsonKey}>{key}: </Text>
                <Text style={s.jsonVal}>{String(val)}</Text>
              </View>
            ))}
          </View>

          {/* Step 3: Request Payload Body */}
          <Text style={s.stepLogTitle}>📦 STEP 3: REQUEST PAYLOAD (JSON BODY)</Text>
          <View style={s.jsonPayload}>
            {Object.keys(requestParams).length === 0 ? (
              <Text style={[s.jsonVal, { color: C.textMuted }]}>{"{}"}</Text>
            ) : (
              Object.entries(requestParams).map(([key, val]) => (
                <View key={key} style={s.jsonLine}>
                  <Text style={s.jsonKey}>{key}: </Text>
                  <Text style={s.jsonVal}>
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Step 4: Response Headers */}
          <Text style={s.stepLogTitle}>📥 STEP 4: RESPONSE STATUS & HEADERS</Text>
          <View style={[s.apiEndpointRow, { backgroundColor: er.status === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }]}>
            <Text style={[s.methodBadge, { color: er.status === 'success' ? C.success : C.danger }]}>
              {er.status === 'success' ? '200 OK' : '500 ERROR'}
            </Text>
            <Text style={s.apiPath}>Duration: {responseHeaders['X-Response-Time'] || '34ms'}</Text>
          </View>
          <View style={s.jsonPayload}>
            {Object.entries(responseHeaders).map(([key, val]) => (
              <View key={key} style={s.jsonLine}>
                <Text style={s.jsonKey}>{key}: </Text>
                <Text style={s.jsonVal}>{String(val)}</Text>
              </View>
            ))}
          </View>

          {/* Step 5: Response Payload */}
          <Text style={s.stepLogTitle}>💾 STEP 5: RESPONSE PAYLOAD (BODY)</Text>
          {er.result ? (
            <View style={s.jsonPayload}>
              {Object.entries(er.result)
                .filter(([k]) => !['service', 'method'].includes(k))
                .map(([key, val]) => (
                  <View key={key} style={s.jsonLine}>
                    <Text style={s.jsonKey}>{key}: </Text>
                    <Text style={s.jsonVal}>
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </Text>
                  </View>
                ))
              }
            </View>
          ) : er.error ? (
            <View style={s.errBlock}>
              <Text style={s.errText}>❌ Error: {er.error}</Text>
            </View>
          ) : (
            <View style={s.jsonPayload}>
              <Text style={s.jsonVal}>null</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ResultsScreen() {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const isSmallScreen = width < 380;

  const params = useLocalSearchParams();
  const [viewMode, setViewMode] = useState(params?.autoOpen === 'true' ? 'details' : 'index'); // 'index' or 'details'
  const [selectedRun, setSelectedRun] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async (customResult = null) => {
    try {
      setIsExporting(true);

      // Allow exporting a specific history run's data, or fallback to currently viewed result
      const activeResult = customResult?.contentParsing ? customResult : result;

      let html = `
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333; padding: 40px; background-color: #f8f9fa; }
            h1 { color: #1e293b; border-bottom: 3px solid #6366f1; padding-bottom: 10px; margin-bottom: 20px; font-size: 32px; }
            h2 { color: #334155; margin-top: 40px; margin-bottom: 16px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
            h3 { color: #475569; margin-top: 20px; margin-bottom: 10px; }
            .section { margin-bottom: 40px; padding: 24px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            ul { line-height: 1.6; padding-left: 20px; }
            li { margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px; }
            .box { padding: 12px; background: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 4px 8px; background-color: #e0e7ff; color: #4f46e5; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
            .priority-critical { background-color: #fee2e2; color: #b91c1c; }
            .priority-high { background-color: #fef3c7; color: #d97706; }
            .diff-pos { color: #15803d; font-weight: bold; }
            .diff-neg { color: #b91c1c; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>⚡ ActionFlow AI - Deep Audit Report</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      `;

      // --- 1. PARSING ---
      if (activeResult?.contentParsing) {
        const cp = activeResult.contentParsing;
        html += `
          <div class="section">
            <h2>📄 1. Content Parsing & Context</h2>
            <div class="grid">
              <div class="box"><strong>Domain:</strong> ${cp.context?.domain || 'N/A'}</div>
              <div class="box"><strong>Goal:</strong> ${cp.context?.goal || 'N/A'}</div>
              <div class="box"><strong>Tone:</strong> ${cp.context?.tone || 'N/A'}</div>
              <div class="box"><strong>Size:</strong> ${cp.metadata?.processedCharacters || 0} chars</div>
            </div>
            
            ${Array.isArray(cp.context?.requirements) ? `
              <h3>Core Requirements</h3>
              <ul>${cp.context.requirements.map(r => `<li>${r}</li>`).join('')}</ul>
            ` : ''}

            <h3>Extracted Entities</h3>
            <table>
              <tr><th>Entity</th><th>Type</th><th>Sentiment</th><th>Salience</th></tr>
              ${(cp.entities || []).map(e => `
                <tr>
                  <td><strong>${e.name || e.entity}</strong><br/><small>${e.description || ''}</small></td>
                  <td><span class="badge">${e.type}</span></td>
                  <td>${e.sentiment || 'Neutral'}</td>
                  <td>${e.salience || 'N/A'}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `;
      }

      // --- 2. INSIGHTS ---
      if (activeResult?.insights?.insights) {
        const ins = activeResult.insights;
        html += `
          <div class="section">
            <h2>💡 2. Extracted Insights</h2>
            ${Array.isArray(ins.keyFindings) ? `
              <h3>Key Findings</h3>
              <ul>${ins.keyFindings.map(kf => `<li>${kf}</li>`).join('')}</ul>
            ` : typeof ins.keyFindings === 'string' ? `
              <h3>Key Findings</h3>
              <p>${ins.keyFindings}</p>
            ` : ''}
            
            <h3>Detailed Insights</h3>
            ${Array.isArray(ins.insights) ? ins.insights.map(i => `
              <div class="box" style="margin-bottom: 12px;">
                <strong>${i.title || i.category}</strong> <span class="badge priority-${(i.severity || '').toLowerCase()}">${i.severity || 'Normal'}</span>
                <p>${i.description || i.observation}</p>
                <p><em>Implication:</em> ${i.implication}</p>
              </div>
            `).join('') : ''}
          </div>
        `;
      }

      // --- 3. IMPACT ASSESSMENT ---
      if (activeResult?.impactAnalysis?.impactAssessment) {
        const imp = activeResult.impactAnalysis;
        html += `
          <div class="section">
            <h2>⚡ 3. Impact Assessment</h2>
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="border: none; margin: 0; font-size: 48px; color: ${imp.overallRiskScore > 70 ? '#ef4444' : '#f59e0b'};">${imp.overallRiskScore || 0}/100</h1>
              <strong>Overall Risk Score</strong>
            </div>
            
            ${Array.isArray(imp.impactAssessment) ? imp.impactAssessment.map(i => `
              <div class="box" style="margin-bottom: 12px;">
                <strong style="font-size: 16px;">${(i.area || 'Area').toUpperCase().replace(/_/g, ' ')}</strong>
                <ul style="margin-top: 8px;">
                  ${Array.isArray(i.descriptions) ? i.descriptions.map(d => `<li>${d}</li>`).join('') : ''}
                </ul>
              </div>
            `).join('') : ''}
          </div>
        `;
      }

      // --- 4. ACTIONS ---
      if (activeResult?.actions?.actions) {
        html += `
          <div class="section">
            <h2>🎯 4. Recommended Actions</h2>
            ${Array.isArray(activeResult.actions.actions) ? activeResult.actions.actions.map(a => `
              <div class="box" style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
                  <strong style="font-size: 16px; color: #0f172a;">${a.title}</strong>
                  <span class="badge priority-${(a.priority || '').toLowerCase()}">${a.priority || 'N/A'} Priority</span>
                </div>
                <p style="margin: 0 0 10px 0;">${a.description}</p>
                
                <div class="grid" style="font-size: 13px; margin-bottom: 0;">
                  <div><strong>System:</strong> ${a.targetSystem}</div>
                  <div><strong>Type:</strong> ${a.type}</div>
                  <div><strong>Complexity:</strong> ${a.complexity || 'N/A'}</div>
                  <div><strong>Trigger:</strong> ${a.trigger || 'N/A'}</div>
                </div>
                
                ${Array.isArray(a.dependencies) && a.dependencies.length ? `<p style="font-size: 12px; margin-top: 10px;"><strong>Dependencies:</strong> ${a.dependencies.join(', ')}</p>` : ''}
                ${a.expectedOutput ? `<p style="font-size: 12px; margin-top: 4px;"><strong>Expected Output:</strong> ${a.expectedOutput}</p>` : ''}
              </div>
            `).join('') : ''}
          </div>
        `;
      }

      // --- 5. SIMULATION (BEFORE/AFTER) ---
      if (activeResult?.simulation) {
        const sim = activeResult.simulation;
        const b = sim.beforeState || {};
        const a = sim.afterState || {};

        html += `
          <div class="section">
            <h2>🔄 5. Execution Simulation & State Comparison</h2>
            
            ${Array.isArray(sim.executionResults) && sim.executionResults.length ? `
              <h3>Execution Logs</h3>
              <ul>
                ${sim.executionResults.map(er => `<li><strong>${er.service} (${er.status}):</strong> ${er.details}</li>`).join('')}
              </ul>
            ` : ''}

            <h3>System State Changes</h3>
            <table>
              <tr><th>Metric</th><th>Before</th><th>After</th><th>Delta</th></tr>
              
              <!-- CRM -->
              ${b.crm?.activities ? `<tr><td>CRM Activities</td><td>${b.crm.activities.length}</td><td>${a.crm?.activities?.length || 0}</td><td class="${(a.crm?.activities?.length || 0) > b.crm.activities.length ? 'diff-pos' : ''}">${(a.crm?.activities?.length || 0) - b.crm.activities.length}</td></tr>` : ''}
              ${b.crm?.campaigns ? `<tr><td>CRM Campaigns</td><td>${b.crm.campaigns.length}</td><td>${a.crm?.campaigns?.length || 0}</td><td class="${(a.crm?.campaigns?.length || 0) > b.crm.campaigns.length ? 'diff-pos' : ''}">${(a.crm?.campaigns?.length || 0) - b.crm.campaigns.length}</td></tr>` : ''}
              ${b.crm?.leads ? `<tr><td>Active Leads</td><td>${b.crm.leads.length}</td><td>${a.crm?.leads?.length || 0}</td><td class="${(a.crm?.leads?.length || 0) > b.crm.leads.length ? 'diff-pos' : ''}">${(a.crm?.leads?.length || 0) - b.crm.leads.length}</td></tr>` : ''}
              
              <!-- Campaign -->
              ${b.campaign?.campaigns ? `<tr><td>Marketing Campaigns</td><td>${b.campaign.campaigns.length}</td><td>${a.campaign?.campaigns?.length || 0}</td><td class="${(a.campaign?.campaigns?.length || 0) > b.campaign.campaigns.length ? 'diff-pos' : ''}">${(a.campaign?.campaigns?.length || 0) - b.campaign.campaigns.length}</td></tr>` : ''}
              ${typeof b.campaign?.budgetAllocated !== 'undefined' ? `<tr><td>Budget Allocated</td><td>$${b.campaign.budgetAllocated}</td><td>$${a.campaign?.budgetAllocated || 0}</td><td class="${(a.campaign?.budgetAllocated || 0) > b.campaign.budgetAllocated ? 'diff-pos' : 'diff-neg'}">$${(a.campaign?.budgetAllocated || 0) - b.campaign.budgetAllocated}</td></tr>` : ''}
              
              <!-- Email -->
              ${b.email?.drafts ? `<tr><td>Email Drafts</td><td>${b.email.drafts.length}</td><td>${a.email?.drafts?.length || 0}</td><td class="${(a.email?.drafts?.length || 0) > b.email.drafts.length ? 'diff-pos' : ''}">${(a.email?.drafts?.length || 0) - b.email.drafts.length}</td></tr>` : ''}
              
              <!-- Support -->
              ${b.support?.tickets ? `<tr><td>Support Tickets</td><td>${b.support.tickets.length}</td><td>${a.support?.tickets?.length || 0}</td><td class="${(a.support?.tickets?.length || 0) > b.support.tickets.length ? 'diff-pos' : ''}">${(a.support?.tickets?.length || 0) - b.support.tickets.length}</td></tr>` : ''}
              ${b.support?.kbArticles ? `<tr><td>KB Articles</td><td>${b.support.kbArticles.length}</td><td>${a.support?.kbArticles?.length || 0}</td><td class="${(a.support?.kbArticles?.length || 0) > b.support.kbArticles.length ? 'diff-pos' : ''}">${(a.support?.kbArticles?.length || 0) - b.support.kbArticles.length}</td></tr>` : ''}
            </table>
          </div>
        `;
      }

      html += `
        </body>
        </html>
      `;

      // Generate the local PDF file
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Download PDF Report' });
      } else {
        // Fallback for web
        await Print.printAsync({ html });
      }
    } catch (e) {
      Alert.alert('Export Error', e.message || 'An error occurred while generating the PDF.');
      console.error("PDF Export Error:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const [activeTab, setActiveTab] = useState('parsing');
  const [parsingSubTab, setParsingSubTab] = useState('entities');
  const activeAccent =
    activeTab === 'parsing' ? C.accent4 :
      activeTab === 'insights' ? C.accent1 :
        activeTab === 'impact' ? C.warning :
          activeTab === 'actions' ? C.success :
            C.accent2;

  const history = getResultsHistory();
  const result = selectedRun || getResult();

  // Create a mutable ref to track activeTab across PanResponder callbacks
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // High-Performance Swipe Navigation (Zero-Lag pageX touch trackers)
  const tabsList = ['parsing', 'insights', 'impact', 'actions', 'simulation'];
  const touchStartX = useRef(0);
  const swipeHandled = useRef(false);

  const handleTouchStart = (e) => {
    touchStartX.current = e.nativeEvent.pageX;
    swipeHandled.current = false; // Reset gesture flag
  };

  const handleTouchMove = (e) => {
    if (swipeHandled.current) return; // Prevent multiple page jumps in a single gesture

    const dx = e.nativeEvent.pageX - touchStartX.current;

    // Trigger tab shift immediately once finger moves past 25px, without waiting for touch release!
    if (Math.abs(dx) > 25) {
      swipeHandled.current = true;
      const currentIndex = tabsList.indexOf(activeTabRef.current);
      if (dx < 0) {
        if (currentIndex < tabsList.length - 1) {
          setActiveTab(tabsList[currentIndex + 1]);
        }
      } else {
        if (currentIndex > 0) {
          setActiveTab(tabsList[currentIndex - 1]);
        }
      }
    }
  };

  // If there are absolutely no results generated yet in the store
  if (history.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyView}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🧠</Text>
          <Text style={s.emptyTitle}>No Results Yet</Text>
          <Text style={s.emptyText}>Run an analysis first to see results here.</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/')}>
            <Text style={s.backBtnText}>← Go Back to Analyze</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render History Index view mode
  if (viewMode === 'index') {
    return (
      <SafeAreaView style={s.container}>
        {/* Header Bar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
          backgroundColor: '#0c0c1e',
        }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)'
            }}
            onPress={() => router.replace('/')}
          >
            <Text style={{ fontSize: 14, color: C.textSecondary, fontWeight: '800' }}>← Console</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#ffffff' }}>Runs Directory</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
          {/* Header Description */}
          <View style={{ marginBottom: 24, marginTop: 4 }}>
            <View style={{
              borderBottomWidth: 1.5,
              borderBottomColor: 'rgba(99, 102, 241, 0.25)',
              paddingBottom: 10,
              marginBottom: 10
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '900',
                color: C.accent1,
                letterSpacing: 0.5
              }}>
                📊 Audit History Hub
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: C.textSecondary, lineHeight: 20 }}>
              Select an agent execution pipeline run from the archive below to inspect its multi-agent results.
            </Text>
          </View>

          {/* List of history runs */}
          {history.map((entry, idx) => {
            const cardAccent = entry.icon === '💰' ? '#eab308' :
              entry.icon === '👥' ? '#06b6d4' :
                entry.icon === '🤝' ? '#ec4899' : C.accent1;

            const riskColor = entry.riskScore >= 70 ? C.danger :
              entry.riskScore >= 40 ? C.warning : C.success;

            const riskLabel = entry.riskScore >= 70 ? 'High' :
              entry.riskScore >= 40 ? 'Medium' : 'Low';

            return (
              <TouchableOpacity
                key={entry.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  backgroundColor: '#12122b',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                  borderLeftWidth: 4,
                  borderLeftColor: cardAccent,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3
                }}
                onPress={() => {
                  setSelectedResult(entry.data);
                  setSelectedRun(entry.data);
                  setViewMode('details');
                }}
                activeOpacity={0.8}
              >
                {/* Icon Circle */}
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: cardAccent + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: cardAccent + '30'
                }}>
                  <Text style={{ fontSize: 20 }}>{entry.icon}</Text>
                </View>

                {/* Info details */}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.textPrimary }} numberOfLines={1}>
                    Run #{history.length - idx}: {entry.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.accent4, fontWeight: '600' }} numberOfLines={1}>
                    {entry.data?.contentParsing?.entities?.[0]?.name ||
                      entry.data?.contentParsing?.entities?.[0]?.entity ||
                      'Custom Content'}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.textMuted }}>
                    ⏱️ {entry.timestamp}
                  </Text>
                </View>

                {/* Right action button */}
                <View style={{ alignItems: 'flex-end', gap: 6, justifyContent: 'center' }}>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: 'rgba(236, 72, 153, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(72, 203, 236, 0.3)',
                      marginTop: 2
                    }}
                    onPress={() => handleExportPDF(entry.data)}
                  >
                    <Text style={{ fontSize: 10, color: C.accent4, fontWeight: '900' }}>⬇️ PDF</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 18,
              marginBottom: 20
            }}
            onPress={() => router.replace('/')}
          >
            <Text style={{ color: C.textSecondary, fontSize: 14, fontWeight: '800' }}>
              📥 Back to Input Console
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const parse = result.contentParsing || {};
  const insights = result.insights?.insights || [];
  const impacts = result.impactAnalysis?.impactAssessment || [];
  const actions = result.actions?.actions || [];
  const sim = result.simulation || {};
  const riskScore = result.impactAnalysis?.overallRiskScore || 0;

  // Extract Before/After State Metrics
  const getDetailedMetrics = (state) => {
    if (!state) return [];
    const metrics = [];
    if (state.crm) {
      metrics.push({ icon: '👥', label: 'CRM Activities', value: state.crm.activities?.length || 0 });
      metrics.push({ icon: '📋', label: 'CRM Campaigns', value: state.crm.campaigns?.length || 0 });
      metrics.push({ icon: '🎯', label: 'Active Leads', value: state.crm.leads?.length || 0 });
    }
    if (state.campaign) {
      metrics.push({ icon: '📢', label: 'Marketing Campaigns', value: state.campaign.campaigns?.length || 0 });
      metrics.push({ icon: '💵', label: 'Budget Allocated', value: state.campaign.budgetAllocated || 0, isCurrency: true });
    }
    if (state.email) {
      metrics.push({ icon: '✉️', label: 'Emails Sent', value: state.email.sentEmails?.length || 0 });
      metrics.push({ icon: '📝', label: 'Email Drafts', value: state.email.drafts?.length || 0 });
    }
    if (state.notification) {
      metrics.push({ icon: '🔔', label: 'Notifications Sent', value: state.notification.notifications?.length || 0 });
    }
    if (state.pricing) {
      metrics.push({ icon: '💰', label: 'Price Changes', value: state.pricing.priceHistory?.length || 0 });
      metrics.push({ icon: '🏷️', label: 'Discount Rules', value: state.pricing.discountRules?.length || 0 });
    }
    if (state.dashboard) {
      metrics.push({ icon: '⚠️', label: 'Dashboard Alerts', value: state.dashboard.alerts?.length || 0 });
      metrics.push({ icon: '📊', label: 'KPI Updates', value: state.dashboard.updateLog?.length || 0 });
    }
    return metrics;
  };

  const beforeMetrics = getDetailedMetrics(sim.beforeState);
  const afterMetrics = getDetailedMetrics(sim.afterState);

  const changes = afterMetrics.map((m, i) => ({
    ...m,
    beforeVal: beforeMetrics[i]?.value || 0,
    diff: typeof m.value === 'number' && typeof beforeMetrics[i]?.value === 'number'
      ? m.value - beforeMetrics[i].value : null,
  })).filter(m => m.diff !== null && m.diff !== 0);

  const fmtVal = (v, isCurrency) => isCurrency ? `PKR ${v.toLocaleString()}` : v;

  return (
    <SafeAreaView style={s.container} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
      {/* Sticky Header Bar for mobile & large screens */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        backgroundColor: '#0c0c1e',
      }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
          onPress={() => setViewMode('index')}
        >
          <Text style={{ fontSize: 13, color: C.textSecondary, fontWeight: '800' }}>📁 Runs History</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff' }}>Audit Report</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: 'rgba(236, 72, 153, 0.1)',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(236, 72, 153, 0.25)'
            }}
            onPress={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? <ActivityIndicator size="small" color={C.accent3} /> : <Text style={{ fontSize: 13, color: C.accent3, fontWeight: '800' }}>⬇️ Save PDF</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Tab Navigation — all visible on screen */}
        <View style={[s.tabNavWrapper, { borderColor: activeAccent, shadowColor: activeAccent }]}>
          <View style={s.tabNavRow}>
            {[
              { id: 'parsing', label: 'Parsing', icon: '📄', accent: C.accent4 },
              { id: 'insights', label: 'Insights', icon: '💡', accent: C.accent1 },
              { id: 'impact', label: 'Impact', icon: '⚡', accent: C.warning },
              { id: 'actions', label: 'Actions', icon: '🎯', accent: C.success },
              { id: 'simulation', label: 'Sim', icon: '🚀', accent: C.accent2 },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    s.resultTabBtn,
                    isActive
                      ? {
                        backgroundColor: tab.accent,
                        borderColor: tab.accent,
                        borderWidth: 2,
                        shadowColor: tab.accent,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 4,
                      }
                      : {
                        backgroundColor: '#08081e',
                        borderColor: 'rgba(255,255,255,0.04)',
                        borderWidth: 1,
                      }
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 16, marginBottom: 2 }}>{tab.icon}</Text>
                  <Text style={[
                    s.resultTabText,
                    isActive && { color: '#ffffff', fontWeight: '900', fontSize: 13 }
                  ]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                  {isActive && <View style={[s.tabActiveBar, { backgroundColor: '#ffffff' }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 1. Content Parsing */}
        <View style={{ display: activeTab === 'parsing' ? 'flex' : 'none' }}>
          <SectionCard title="Content Parsing" icon="📄" accentColor={C.accent4} badge={`${parse.entities?.length || 0} entities`} badgeColor={C.accent4}>
            {renderBulletSummary(parse.summary, C.accent4)}

            {/* Professional Large Heading Switcher */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: '#0c0c28',
              borderRadius: 14,
              padding: 6,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(71, 126, 89, 0.06)',
              gap: 8
            }}>
              {[
                { id: 'entities', label: 'Entities', icon: '🏢' },
                { id: 'metrics', label: 'Metrics', icon: '📊' },
                { id: 'facts', label: 'Key Facts', icon: '📋' }
              ].map(sub => {
                const isSubActive = parsingSubTab === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => setParsingSubTab(sub.id)}
                    activeOpacity={0.75}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 14,
                      borderRadius: 10,
                      backgroundColor: isSubActive ? '#06b6d4' : 'transparent',
                      borderWidth: 1.5,
                      borderColor: isSubActive ? '#06b6d4' : 'transparent',
                      gap: 8,
                      shadowColor: isSubActive ? '#06b6d4' : 'transparent',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: isSubActive ? 3 : 0
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{sub.icon}</Text>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '900',
                      color: isSubActive ? '#ffffff' : '#94a3b8',
                      letterSpacing: 0.5
                    }}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Entities Sub-tab Content */}
            {parsingSubTab === 'entities' && parse.entities?.length > 0 && (() => {
              const categorized = parse.entities.reduce((acc, e) => {
                const type = (e.type || 'Other').toLowerCase();
                let cat = 'Other 🏷️';
                if (type.includes('loc') || type.includes('place') || type.includes('city') || type.includes('country') || type.includes('region')) {
                  cat = 'Locations 📍';
                } else if (type.includes('person') || type.includes('name') || type.includes('people') || type.includes('user')) {
                  cat = 'People 👤';
                } else if (type.includes('org') || type.includes('company') || type.includes('team') || type.includes('corp') || type.includes('brand')) {
                  cat = 'Organizations 🏢';
                } else {
                  cat = e.type.charAt(0).toUpperCase() + e.type.slice(1) + ' 🏷️';
                }
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(e.name);
                return acc;
              }, {});

              return (
                <View style={s.subSection}>
                  <Text style={s.subSectionTitle}>🏢 Categorized Entities</Text>
                  <View style={{ gap: 10, marginTop: 4 }}>
                    {Object.entries(categorized).map(([cat, names], catIdx) => (
                      <View key={catIdx} style={{
                        backgroundColor: '#0c0c24',
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.03)'
                      }}>
                        <View style={{
                          borderBottomWidth: 1,
                          borderBottomColor: 'rgba(6, 182, 212, 0.2)',
                          paddingBottom: 6,
                          marginBottom: 10
                        }}>
                          <Text style={{ fontSize: 14, fontWeight: '900', color: C.accent4, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            {cat}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                          {names.map((name, nIdx) => (
                            <View key={nIdx} style={{ paddingHorizontal: 0, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 14, color: '#e2e8f0', fontWeight: '600' }}>
                                {name}{nIdx < names.length - 1 ? '  •' : ''}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            {/* Metrics Sub-tab Content */}
            {parsingSubTab === 'metrics' && parse.metrics?.length > 0 && (
              <View style={s.subSection}>
                <Text style={s.subSectionTitle}>📊 Metrics Visualizations</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {parse.metrics.map((m, i) => {
                    const numericStr = String(m.value).replace(/[^0-9.]/g, '');
                    const valNum = parseFloat(numericStr) || 50;
                    const percent = Math.min(Math.max(valNum > 100 ? (valNum % 100) : valNum, 15), 100);
                    const isUp = m.trend === 'increasing';
                    const isDown = m.trend === 'decreasing';
                    const themeColor = isUp ? C.success : isDown ? C.danger : C.accent4;

                    return (
                      <View key={i} style={{
                        flex: 1,
                        minWidth: '46%',
                        backgroundColor: '#0f0f2d',
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.06)',
                        marginBottom: 6,
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 4 }}>
                          <Text style={{ fontSize: 13, color: '#cbd5e1', fontWeight: '800', flex: 1, lineHeight: 18 }}>
                            {m.name}
                          </Text>
                          {m.trend && m.trend !== 'unknown' && (
                            <View style={{
                              backgroundColor: themeColor + '22',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: themeColor + '66'
                            }}>
                              <Text style={{ fontSize: 10, color: themeColor, fontWeight: '900' }}>
                                {isUp ? '▲' : isDown ? '▼' : '◆'} {m.trend.substring(0, 3).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={{ marginBottom: 10 }}>
                          <Text style={{ fontSize: 20, fontWeight: '900', color: '#ffffff' }}>
                            {m.value}
                            {m.unit && <Text style={{ fontSize: 11, fontWeight: '500', color: '#94a3b8' }}> {m.unit}</Text>}
                          </Text>
                        </View>

                        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ height: 6, width: `${percent}%`, backgroundColor: themeColor, borderRadius: 3 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Facts Sub-tab Content */}
            {parsingSubTab === 'facts' && parse.facts?.length > 0 && (
              <View style={s.subSection}>
                <Text style={s.subSectionTitle}>📋 Key Facts</Text>
                <View style={{
                  backgroundColor: '#0d0d26',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                  padding: 16,
                  marginTop: 6
                }}>
                  {parse.facts.map((f, i) => {
                    const isLast = i === parse.facts.length - 1;
                    return (
                      <View key={i} style={{
                        paddingVertical: 10,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: 'rgba(255,255,255,0.06)',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12
                      }}>
                        <Text style={{ fontSize: 15, color: '#cbd5e1', flex: 1, lineHeight: 22 }}>
                          <Text style={{ color: C.accent1, fontWeight: '900' }}>✦  </Text>{f.statement}
                        </Text>
                        <View style={{
                          backgroundColor: C.accent2 + '22',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: C.accent2 + '66'
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#c084fc' }}>
                            {Math.round((f.confidence || 0.5) * 100)}% CONF
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </SectionCard>
        </View>

        {/* 2. Extracted Insights */}
        <View style={{ display: activeTab === 'insights' ? 'flex' : 'none' }}>
          <SectionCard title="Extracted Insights" icon="💡" accentColor={C.accent1} badge={`${insights.length} found`} badgeColor={C.accent1}>

            {/* Professional Insight Analytics Visualization */}
            <View style={{
              backgroundColor: '#0d0d28',
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: 'rgba(99,102,241,0.25)',
              marginBottom: 16
            }}>
              <View style={{
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(99, 102, 241, 0.2)',
                paddingBottom: 6,
                marginBottom: 12
              }}>
                <Text style={{ fontSize: 14, color: '#a5b4fc', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  💡 INSIGHT DISTRIBUTION & CONFIDENCE
                </Text>
              </View>

              {/* Flex Grid for Severity breakdown and average confidence */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: '#070712', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#f59e0b' }}>
                    {insights.filter(x => x.severity === 'critical' || x.severity === 'high').length}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600' }}>High/Crit Risks</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#070712', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#10b981' }}>
                    {Math.round((insights.reduce((acc, x) => acc + (x.confidence || 0.5), 0) / (insights.length || 1)) * 100)}%
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600' }}>Avg Confidence</Text>
                </View>
              </View>

              {/* Progress bars for Insight Categories */}
              <View style={{ gap: 8 }}>
                {[
                  { label: 'Security & Integrity', val: 85, color: '#ef4444' },
                  { label: 'Operational Efficiency', val: 92, color: '#6366f1' },
                  { label: 'Strategic Alignment', val: 78, color: '#3b82f6' }
                ].map((item, idx) => (
                  <View key={idx}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, color: '#cbd5e1', fontWeight: '700' }}>{item.label}</Text>
                      <Text style={{ fontSize: 13, color: '#ffffff', fontWeight: '900' }}>{item.val}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#070712', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${item.val}%`, backgroundColor: item.color, borderRadius: 3 }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {renderBulletSummary(result.insights?.keyFindings, C.accent1)}

            {insights.map((ins, i) => {
              const sevBg = ins.severity === 'critical' ? C.danger : ins.severity === 'high' ? C.warning : C.accent1;
              const conciseDesc = ins.description
                ? (ins.description.split(/(?<=[.!?])\s+/)[0] || ins.description)
                : '';

              return (
                <View key={i} style={[s.insightCard, { borderLeftColor: sevBg, paddingVertical: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <Text style={{ fontSize: 15, color: sevBg, fontWeight: '900', marginTop: 2 }}>✦</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(99, 102, 241, 0.2)',
                        paddingBottom: 6,
                        marginBottom: 8
                      }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', letterSpacing: 0.3 }}>
                          {ins.title}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, color: '#cbd5e1', fontWeight: '400', lineHeight: 22, textAlign: 'justify' }}>
                        {conciseDesc}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6, paddingLeft: 18 }}>
                    <Text style={{ fontSize: 11, color: '#a5b4fc', fontWeight: '800', backgroundColor: 'rgba(99,102,241,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      {ins.type.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 11, color: sevBg, fontWeight: '900', backgroundColor: sevBg + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                      {ins.severity.toUpperCase()}
                    </Text>
                    {ins.category && (
                      <Text style={{ fontSize: 11, color: '#cbd5e1', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        {ins.category.toUpperCase()}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </SectionCard>
        </View>

        {/* 3. Impact Analysis */}
        <View style={{ display: activeTab === 'impact' ? 'flex' : 'none' }}>
          <SectionCard title="Impact Analysis" icon="⚡" accentColor={C.warning} badge={`Risk: ${riskScore}`} badgeColor={riskScore >= 60 ? C.danger : C.warning}>

            {/* Big Premium Risk Meter */}
            <View style={[s.riskMeter, { borderColor: riskScore >= 75 ? 'rgba(239,68,68,0.4)' : riskScore >= 50 ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.4)' }]}>
              <View style={s.riskTopRow}>
                <View style={[s.riskScoreBadge, { backgroundColor: riskScore >= 75 ? C.danger : riskScore >= 50 ? C.warning : C.accent1 }]}>
                  <Text style={s.riskScoreText}>{riskScore}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.riskLabel}>Overall Risk Index</Text>
                  <View style={[s.riskLevelBadge, { backgroundColor: riskScore >= 75 ? C.danger : riskScore >= 50 ? C.warning : C.success }]}>
                    <Text style={s.riskLevelText}>
                      {riskScore >= 75 ? 'HIGH RISK' : riskScore >= 50 ? 'MODERATE' : 'LOW RISK'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={s.riskBarBg}>
                <View style={[s.riskBarFill, { width: `${riskScore}%`, backgroundColor: riskScore >= 75 ? C.danger : riskScore >= 50 ? C.warning : C.accent1 }]} />
              </View>
            </View>

            {/* Professional Threat Exposure Visualization Grid */}
            <View style={{
              backgroundColor: '#0d0d28',
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(252, 211, 77, 0.15)',
              marginBottom: 10
            }}>
              <Text style={{ fontSize: 11, color: '#fcd34d', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                ⚡ OPERATIONAL THREAT EXPOSURE GRID
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#070712', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: C.danger }}>CRITICAL</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' }}>Threat Level</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#070712', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: C.warning }}>4 Domains</Text>
                  <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' }}>Impact Areas</Text>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                {[
                  { label: 'Operational Downtime', val: 82, color: C.danger },
                  { label: 'Financial SLA Exposure', val: 65, color: C.warning },
                  { label: 'Customer / User Disruption', val: 45, color: C.accent1 }
                ].map((item, idx) => (
                  <View key={idx}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 11, color: '#cbd5e1', fontWeight: '700' }}>{item.label}</Text>
                      <Text style={{ fontSize: 11, color: '#ffffff', fontWeight: '900' }}>{item.val}% Exposure</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: '#070712', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${item.val}%`, backgroundColor: item.color, borderRadius: 3 }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {renderBulletSummary(result.impactAnalysis?.executiveSummary, C.warning)}

            {(() => {
              const grouped = {};
              impacts.forEach(ia => {
                ia.impacts?.forEach(imp => {
                  const areaKey = imp.area || 'other';
                  if (!grouped[areaKey]) {
                    grouped[areaKey] = {
                      area: areaKey,
                      descriptions: [],
                      quantifiedImpacts: [],
                      cascadingEffects: []
                    };
                  }
                  if (imp.description) {
                    const firstSentence = imp.description.split(/(?<=[.!?])\s+/)[0] || imp.description;
                    if (!grouped[areaKey].descriptions.includes(firstSentence)) {
                      grouped[areaKey].descriptions.push(firstSentence);
                    }
                  }
                  if (imp.quantifiedImpact && !grouped[areaKey].quantifiedImpacts.includes(imp.quantifiedImpact)) {
                    grouped[areaKey].quantifiedImpacts.push(imp.quantifiedImpact);
                  }
                  if (imp.cascadingEffects) {
                    imp.cascadingEffects.forEach(effect => {
                      if (!grouped[areaKey].cascadingEffects.includes(effect)) {
                        grouped[areaKey].cascadingEffects.push(effect);
                      }
                    });
                  }
                });
              });

              const groupedList = Object.values(grouped);

              return groupedList.map((item, i) => (
                <View key={i} style={s.impactCard}>
                  <Text style={s.impactArea}>{item.area.toUpperCase().replace(/_/g, ' ')}</Text>

                  {/* Descriptions rendered as concise bullet items */}
                  <View style={{ gap: 6, marginBottom: 8 }}>
                    {item.descriptions.map((desc, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={{ fontSize: 15, color: '#fbbf24', fontWeight: '900', marginTop: 2 }}>✦</Text>
                        <Text style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 22, flex: 1, textAlign: 'justify' }}>
                          {desc}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Quantified impacts */}
                  {item.quantifiedImpacts.map((quant, idx) => (
                    <View key={idx} style={{
                      marginTop: 12,
                      backgroundColor: 'rgba(252, 211, 77, 0.03)',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(252, 211, 77, 0.15)',
                      padding: 12,
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '900',
                        color: '#fcd34d',
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        marginBottom: 4
                      }}>
                        📊 QUANTIFIED IMPACT METRIC
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: '#ffffff',
                        lineHeight: 20,
                        fontWeight: '600'
                      }}>
                        ⚡ {quant}
                      </Text>
                    </View>
                  ))}

                  {/* Cascading Effects timeline */}
                  {item.cascadingEffects.length > 0 && (
                    <View style={s.cascadingBlock}>
                      <Text style={s.cascadingTitle}>Cascading Risks Flow</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cascadingScroll}>
                        {item.cascadingEffects.map((node, nIdx) => (
                          <View key={nIdx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {nIdx > 0 && <Text style={s.cascadingArrow}>→</Text>}
                            <View style={s.cascadingNodeBox}>
                              <Text style={s.cascadingNodeText}>{node}</Text>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ));
            })()}
          </SectionCard>
        </View>

        {/* 4. Recommended Actions */}
        <View style={{ display: activeTab === 'actions' ? 'flex' : 'none' }}>
          <SectionCard title="Recommended Actions" icon="🎯" accentColor={C.success} badge={`${actions.length} actions`} badgeColor={C.warning}>
            {renderBulletSummary(result.actions?.actionSummary, C.success)}
            {actions.map((act, i) => (
              <View key={i} style={s.actionCard}>
                <View style={[s.actionNum, { backgroundColor: act.priority === 'critical' ? C.danger : act.priority === 'high' ? C.warning : C.accent1, borderRadius: 18 }]}>
                  <Text style={[s.actionNumText, { color: '#ffffff' }]}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.actionHeaderRow}>
                    <Text style={s.actionTitle}>{act.title}</Text>
                    <Text style={[s.serviceBadge, { backgroundColor: C.accent2, color: '#ffffff' }]}>{act.targetService || act.type}</Text>
                  </View>
                  <Text style={s.actionDesc}>{act.description}</Text>
                  {act.expectedOutcome && (
                    <View style={{
                      marginTop: 12,
                      backgroundColor: 'rgba(34, 197, 94, 0.06)',
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(34, 197, 94, 0.25)',
                      padding: 12,
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '900',
                        color: '#4ade80',
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        marginBottom: 4
                      }}>
                        🎯 EXPECTED OUTCOME
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: '#e2e8f0',
                        lineHeight: 20,
                        fontWeight: '600'
                      }}>
                        {act.expectedOutcome}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </SectionCard>
        </View>

        {/* 5. Simulation Results */}
        <View style={{ display: activeTab === 'simulation' ? 'flex' : 'none' }}>
          <SectionCard title="Simulation Results" icon="🚀" accentColor={C.accent2} badge={sim.summary ? `${sim.summary.successful}/${sim.summary.totalActions} success` : ''} badgeColor={C.success}>
            {sim.summary && (() => {
              const total = sim.summary.totalActions || 0;
              const successful = sim.summary.successful || 0;
              const failed = sim.summary.failed || 0;
              const successPct = total > 0 ? Math.round((successful / total) * 100) : 0;
              const failedPct = total > 0 ? Math.round((failed / total) * 100) : 0;

              return (
                <View style={{ marginBottom: 16 }}>
                  {/* Visual Success Meter Card */}
                  <View style={{
                    backgroundColor: '#0d0d28',
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(34,197,94,0.3)',
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#86efac', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Simulation Reliability
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff', marginTop: 2 }}>
                        {successPct}% Success Rate
                      </Text>
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {successful} of {total} simulation calls executed flawlessly
                      </Text>
                    </View>

                    {/* Circular Gauge approximation */}
                    <View style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#166534',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: '#22c55e',
                      shadowColor: '#22c55e',
                      shadowRadius: 8,
                      elevation: 4
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff' }}>
                        {successPct}%
                      </Text>
                    </View>
                  </View>

                  {/* Compound Distribution Bar */}
                  <View style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: '#86efac', fontWeight: '700' }}>✅ Successful ({successPct}%)</Text>
                      {failed > 0 && <Text style={{ fontSize: 11, color: '#fca5a5', fontWeight: '700' }}>❌ Failed ({failedPct}%)</Text>}
                    </View>
                    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, flexDirection: 'row', overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${successPct}%`, backgroundColor: '#22c55e' }} />
                      <View style={{ height: 6, width: `${failedPct}%`, backgroundColor: '#ef4444' }} />
                    </View>
                  </View>

                  {/* Sim Stats Badge Row */}
                  <View style={s.simStats}>
                    <View style={s.simStat}>
                      <View style={[s.simValBadge, { backgroundColor: C.accent1 }]}>
                        <Text style={s.simValText}>{total}</Text>
                      </View>
                      <Text style={s.simLabel}>Total Actions</Text>
                    </View>
                    <View style={s.simStat}>
                      <View style={[s.simValBadge, { backgroundColor: C.success }]}>
                        <Text style={s.simValText}>{successful}</Text>
                      </View>
                      <Text style={s.simLabel}>Successful</Text>
                    </View>
                    <View style={s.simStat}>
                      <View style={[s.simValBadge, { backgroundColor: C.danger }]}>
                        <Text style={s.simValText}>{failed}</Text>
                      </View>
                      <Text style={s.simLabel}>Failed</Text>
                    </View>
                    <View style={s.simStat}>
                      <View style={[s.simValBadge, { backgroundColor: C.accent4 }]}>
                        <Text style={s.simValText}>{sim.summary.duration}ms</Text>
                      </View>
                      <Text style={s.simLabel}>Duration</Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Interactive Mock API Call Execution Logs */}
            {sim.executionResults?.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={s.subSectionTitle}>🔄 Execution Log — Mock API Details</Text>
                {sim.executionResults.map((er, idx) => (
                  <ExecutionLogCard key={idx} er={er} i={idx} />
                ))}
              </View>
            )}

            {/* State changes count summary */}
            {sim.stateChanges?.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={s.subSectionTitle}>📋 System State Changes</Text>
                {sim.stateChanges.map((ch, i) => (
                  <View key={i} style={s.changeRow}>
                    <View style={[s.changeServiceBadge, { backgroundColor: C.accent4 }]}>
                      <Text style={s.changeServiceText}>{ch.service}</Text>
                    </View>
                    <Text style={s.changeType}>{ch.type.replace(/_/g, ' ')}</Text>
                    <View style={[s.changeCountBadge, { backgroundColor: C.success }]}>
                      <Text style={s.changeCountText}>+{ch.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          {/* 6. Before / After State Comparison */}
          <SectionCard title="Before / After State" icon="🔄" accentColor={C.accent4} badge="Comparison">
            {/* Changes grid */}
            {changes.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={s.smallTitle}>⚡ System Modifications</Text>
                <View style={s.changesGrid}>
                  {changes.map((c, i) => {
                    const cardWidth = isLargeScreen ? '31%' : (width < 480 ? '100%' : '48%');
                    return (
                      <View key={i} style={[s.changeCard, { minWidth: cardWidth, borderColor: c.diff > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', backgroundColor: c.diff > 0 ? 'rgba(34,197,94,0.02)' : 'rgba(239,68,68,0.02)' }]}>
                        <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                        <Text style={s.changeLabel}>{c.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 }}>
                          <Text style={s.strikeVal}>{fmtVal(c.beforeVal, c.isCurrency)}</Text>
                          <Text style={{ color: C.accent4, fontSize: 11 }}>→</Text>
                          <Text style={s.finalVal}>{fmtVal(c.value, c.isCurrency)}</Text>
                        </View>
                        <View style={[s.diffBadge, { backgroundColor: c.diff > 0 ? C.success : C.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 }]}>
                          <Text style={[s.diffText, { color: '#6c4a4aff', fontWeight: '900', fontSize: 12 }]}>
                            {c.diff > 0 ? `▲ +${fmtVal(c.diff, c.isCurrency)}` : `▼ ${fmtVal(c.diff, c.isCurrency)}`}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Full stacked side-by-side style lists */}
            <View style={s.stateStackRow}>
              <View style={s.stateListPanel}>
                <Text style={[s.stateListLabel, { color: C.textMuted }]}>⬅ BEFORE SIMULATION</Text>
                {beforeMetrics.map((m, i) => (
                  <View key={i} style={s.stateListItem}>
                    <Text style={s.stateItemLabel}>{m.icon} {m.label}</Text>
                    <Text style={s.stateItemVal}>{fmtVal(m.value, m.isCurrency)}</Text>
                  </View>
                ))}
              </View>

              <View style={[s.stateListPanel, { marginTop: 14 }]}>
                <Text style={[s.stateListLabel, { color: C.accent1 }]}>AFTER SIMULATION ➡</Text>
                {afterMetrics.map((m, i) => {
                  const diff = typeof m.value === 'number' && typeof beforeMetrics[i]?.value === 'number'
                    ? m.value - beforeMetrics[i].value : null;
                  return (
                    <View key={i} style={[s.stateListItem, diff && diff !== 0 && { backgroundColor: 'rgba(34,197,94,0.04)' }]}>
                      <Text style={s.stateItemLabel}>{m.icon} {m.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={s.stateItemVal}>{fmtVal(m.value, m.isCurrency)}</Text>
                        {diff !== null && diff !== 0 && (
                          <View style={[s.stateDeltaPill, { backgroundColor: diff > 0 ? C.success : C.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }]}>
                            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '900' }}>
                              {diff > 0 ? `+${fmtVal(diff, m.isCurrency)}` : fmtVal(diff, m.isCurrency)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </SectionCard>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerDivider} />
          <View style={s.footerBadgeRow}>
            <View style={s.footerBadge}>
              <Text style={s.footerBadgeText}>☁️ GCP</Text>
            </View>
            <View style={s.footerBadge}>
              <Text style={s.footerBadgeText}>🔷 Antigravity</Text>
            </View>
            <View style={s.footerBadge}>
              <Text style={s.footerBadgeText}>⚡ Gemini 2.5</Text>
            </View>
          </View>
          <Text style={s.footerText}>Built with Google Antigravity</Text>
          <Text style={s.footerSub}>Powered by Gemini 2.5 Flash • Google Cloud</Text>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 32 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: C.textPrimary, marginBottom: 8 },
  emptyText: { color: C.textSecondary, fontSize: 16, marginBottom: 24, textAlign: 'center', lineHeight: 24 },
  backBtn: { backgroundColor: C.accent1, paddingHorizontal: 26, paddingVertical: 14, borderRadius: 12 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Results Tabs
  resultTabBtn: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0f0f22',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  resultTabBtnActive: {
    backgroundColor: '#6366f122',
    borderColor: '#6366f188',
  },
  resultTabText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  tabActiveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },

  // Header Bar
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bgCard,
  },
  headerBack: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgGlass },
  headerBackArrow: { color: C.textPrimary, fontSize: 20, fontWeight: 'bold' },
  headerBarTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },

  scroll: { padding: 16, paddingBottom: 40 },

  // Tab Navigation Header
  tabNavWrapper: {
    marginBottom: 20,
    padding: 8,
    backgroundColor: '#0c0c28',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.45)',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 4,
  },
  tabNavRow: {
    flexDirection: 'row',
    gap: 6,
  },

  // Section Styles
  section: {
    marginBottom: 16, borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', backgroundColor: '#0a0a1e'
  },
  sectionIconBadge: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#070714',
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#e2e8f0', letterSpacing: 0.3 },
  badge: {
    fontSize: 13, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1
  },
  toggleBtn: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  toggleBtnOpen: { transform: [{ rotate: '180deg' }] },
  sectionBody: { padding: 16, backgroundColor: '#0c0c1e' },

  summaryText: {
    fontSize: 17, color: '#cbd5e1', lineHeight: 26, marginBottom: 16,
    textAlign: 'justify'
  },

  // Subsections inside cards
  subSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(99,102,241,0.15)' },
  subSectionTitle: {
    fontSize: 18, fontWeight: '900', color: '#e2e8f0', letterSpacing: 0.8, marginBottom: 10,
    backgroundColor: '#070712', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
  },

  // Context Badges
  tagWrapperRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillTag: {
    fontSize: 13, color: '#ffffff', fontWeight: '800',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border
  },

  // Entities
  entityTagBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#1a0a2e', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)'
  },
  entityName: { fontSize: 15, fontWeight: '700', color: '#e2e8f0' },
  entityType: { fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  // Metrics
  metricRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 8, backgroundColor: '#0a1e24',
    borderWidth: 1, borderColor: 'rgba(6,182,212,0.25)', marginBottom: 6
  },
  metricName: { fontSize: 15, color: '#cbd5e1', fontWeight: '500' },
  trendPill: { fontSize: 12, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },

  // Key Facts
  factCard: {
    padding: 14, borderRadius: 8, backgroundColor: '#0a1e16',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10
  },
  factText: { fontSize: 15, color: '#cbd5e1', flex: 1, lineHeight: 20 },
  factConfidence: { fontSize: 12, fontWeight: '900', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },

  // Insight Cards
  insightCard: {
    padding: 16, marginBottom: 12,
    backgroundColor: '#0d0d28',
    borderRadius: 12, borderLeftWidth: 4, borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)'
  },
  insightTitle: { fontSize: 18, fontWeight: '900', color: '#e2e8f0', marginBottom: 6 },
  insightDesc: { fontSize: 15, color: '#cbd5e1', lineHeight: 22, marginBottom: 12, textAlign: 'justify' },
  confidenceContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  confidenceBg: { flex: 1, height: 8, backgroundColor: '#070712', borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: 8, backgroundColor: '#6366f1', borderRadius: 4 },
  confidenceText: { fontSize: 13, color: '#cbd5e1', fontWeight: '700' },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },

  // Risk Meter
  riskMeter: { padding: 12, backgroundColor: '#0a0a1a', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },
  riskTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  riskScoreBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  riskScoreText: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
  riskLabel: { fontSize: 12, color: C.textSecondary, fontWeight: '700' },
  riskLevelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  riskLevelText: { fontSize: 9, fontWeight: '900', color: '#ffffff' },
  riskBarBg: { height: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden' },
  riskBarFill: { height: 6, borderRadius: 3 },

  // Impact Blocks
  impactBlock: { gap: 10 },
  impactCard: {
    padding: 16, marginBottom: 10,
    backgroundColor: '#0d0d28',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.12)'
  },
  impactArea: {
    fontSize: 15, fontWeight: '900', color: '#fef3c7',
    marginBottom: 8, letterSpacing: 0.8,
    backgroundColor: '#070712',
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, overflow: 'hidden',
    alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.18)'
  },
  impactDesc: { fontSize: 15, color: '#cbd5e1', lineHeight: 22, marginBottom: 10, textAlign: 'justify' },
  quantifiedText: { borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)' },
  cascadingBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(252, 211, 77, 0.08)' },
  cascadingTitle: { fontSize: 13, fontWeight: '800', color: '#fef3c7', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, backgroundColor: '#070712', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, overflow: 'hidden', alignSelf: 'flex-start' },
  cascadingScroll: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  cascadingArrow: { color: '#fbbf24', fontWeight: '900', marginHorizontal: 8, fontSize: 18 },
  cascadingNodeBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#070712', borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.15)', maxWidth: 160 },
  cascadingNodeText: { fontSize: 13, color: '#fef3c7', fontWeight: '500' },

  // Actions
  actionCard: {
    flexDirection: 'row', gap: 14, padding: 16, marginBottom: 12,
    backgroundColor: '#0d0d28',
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)'
  },
  actionNum: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  actionNumText: { fontSize: 16, fontWeight: '900' },
  actionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(34, 197, 94, 0.2)',
    paddingBottom: 8, marginBottom: 8, gap: 10
  },
  actionTitle: { fontSize: 15, fontWeight: '900', color: '#e2e8f0', flex: 1 },
  serviceBadge: { fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actionDesc: { fontSize: 15, color: '#cbd5e1', lineHeight: 22, marginTop: 4, textAlign: 'justify' },
  actionOutcome: { fontSize: 14, marginTop: 8, fontWeight: '800', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },

  // Simulation Results
  simStats: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, padding: 14,
    backgroundColor: '#0d0d28', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  simStat: { alignItems: 'center', gap: 6 },
  simValBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  simValText: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  simLabel: { fontSize: 13, color: C.textMuted, fontWeight: '600' },

  smallTitle: { fontSize: 13, fontWeight: '800', color: C.textMuted, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },

  simExecCard: {
    padding: 14, marginBottom: 10,
    backgroundColor: '#0d0d28',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', borderLeftWidth: 4
  },
  simExecHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  simExecTitle: { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  simExecBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(6,182,212,0.15)' },
  stepLogTitle: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', letterSpacing: 0.5, marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },
  apiEndpointRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,102,241,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
  methodBadge: { fontSize: 13, fontWeight: '900', color: C.success },
  apiPath: { fontSize: 14, color: C.accent4, fontFamily: 'monospace', flex: 1, flexWrap: 'wrap' },
  jsonPayload: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 10, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  jsonLine: { flexDirection: 'row' },
  jsonKey: { fontSize: 13, color: C.accent2, fontFamily: 'monospace' },
  jsonVal: { fontSize: 13, color: C.success, fontFamily: 'monospace', flex: 1 },
  errBlock: { backgroundColor: 'rgba(239,68,68,0.12)', padding: 10, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errText: { fontSize: 14, color: C.danger, fontWeight: '600' },

  changeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, marginBottom: 6,
    backgroundColor: '#0d0d24', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)'
  },
  changeServiceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 80, alignItems: 'center' },
  changeServiceText: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  changeType: { fontSize: 14, color: C.textSecondary, flex: 1 },
  changeCountBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  changeCountText: { fontSize: 13, fontWeight: '900', color: '#ffffff' },

  // Before / After State
  changesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  changeCard: { flex: 1, minWidth: '45%', padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', gap: 2 },
  changeLabel: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  strikeVal: { fontSize: 13, color: C.textMuted, textDecorationLine: 'line-through' },
  finalVal: { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  diffText: { fontWeight: '900' },

  stateStackRow: { width: '100%', marginTop: 10, gap: 12 },
  stateListPanel: {
    backgroundColor: '#0d0d24',
    padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)'
  },
  stateListLabel: {
    fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)'
  },
  stateListItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  stateItemLabel: { fontSize: 15, color: '#94a3b8' },
  stateItemVal: { fontSize: 15, color: '#e2e8f0', fontWeight: '700' },
  stateDeltaPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  // Footer
  footer: { alignItems: 'center', marginTop: 24, paddingTop: 20 },
  footerDivider: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 16 },
  footerBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  footerBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)'
  },
  footerBadgeText: { fontSize: 12, color: '#a5b4fc', fontWeight: '700' },
  footerText: { fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 4 },
  footerSub: { fontSize: 12, color: '#334155', marginTop: 2 },
});
