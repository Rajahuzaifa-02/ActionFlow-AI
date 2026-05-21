import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert, SafeAreaView, Platform,
  useWindowDimensions, Animated, Easing
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { fetchSamples, analyzeContentSSE, analyzeContentSync, checkHealth, uploadFileAPI, fetchURLContent, fetchActiveTraces, cancelAnalysis } from '../services/api';
import { setResult, getResultsHistory } from '../services/store';

const COLORS = {
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
  warning: '#f59e0b',
  danger: '#ef4444',
};

const STAGES = [
  { key: 'content_parsing', label: 'Parse', icon: '📄' },
  { key: 'insight_extraction', label: 'Insights', icon: '💡' },
  { key: 'impact_analysis', label: 'Impact', icon: '⚡' },
  { key: 'action_generation', label: 'Actions', icon: '🎯' },
  { key: 'action_simulation', label: 'Simulate', icon: '🚀' },
];

const getAgentColor = (stage) => {
  switch (stage) {
    case 'content_parsing': return COLORS.accent4;
    case 'insight_extraction': return COLORS.accent2;
    case 'impact_analysis': return COLORS.danger;
    case 'action_generation': return COLORS.warning;
    case 'action_simulation': return COLORS.success;
    default: return COLORS.textSecondary;
  }
};

// Collapsible Section Card Component
function ResultSectionCard({ title, icon, badge, badgeColor, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={resStyles.section}>
      <TouchableOpacity style={resStyles.sectionHeader} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={resStyles.sectionTitle}>{icon} {title}</Text>
          {badge && <Text style={[resStyles.badge, { color: badgeColor || COLORS.accent4, borderColor: badgeColor || COLORS.accent4 }]}>{badge}</Text>}
        </View>
        <Text style={[resStyles.toggleBtn, open && resStyles.toggleBtnOpen]}>▼</Text>
      </TouchableOpacity>
      {open && <View style={resStyles.sectionBody}>{children}</View>}
    </View>
  );
}

// Collapsible Simulation Execution Log Card
function SimulationLogCard({ er, i }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[resStyles.simExecCard, { borderLeftColor: er.status === 'success' ? COLORS.success : COLORS.danger }]}>
      <TouchableOpacity style={resStyles.simExecHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Text style={{ fontSize: 14 }}>{er.status === 'success' ? '✅' : '❌'}</Text>
          <Text style={resStyles.simExecTitle} numberOfLines={1}>{er.actionTitle}</Text>
        </View>
        <Text style={resStyles.toggleBtn}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {expanded && (
        <View style={resStyles.simExecBody}>
          <View style={resStyles.apiEndpointRow}>
            <Text style={resStyles.methodBadge}>POST</Text>
            <Text style={resStyles.apiPath}>/api/mock/{er.result?.service || 'service'}/{er.result?.method || er.result?.action || 'execute'}</Text>
          </View>
          {er.result && (
            <View style={resStyles.jsonPayload}>
              {Object.entries(er.result)
                .filter(([k]) => !['service','method'].includes(k))
                .map(([key, val]) => (
                  <View key={key} style={resStyles.jsonLine}>
                    <Text style={resStyles.jsonKey}>{key}: </Text>
                    <Text style={resStyles.jsonVal}>
                      {typeof val === 'object' ? JSON.stringify(val).substring(0, 100) : String(val)}
                    </Text>
                  </View>
                ))
              }
            </View>
          )}
          {er.error && (
            <View style={resStyles.errBlock}>
              <Text style={resStyles.errText}>❌ Error: {er.error}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── AI Thought Messages ──────────────────────────────────────────────────────
const AI_THOUGHTS = [
  '🧠 Parsing document structure and metadata...',
  '🔍 Identifying key entities and relationships...',
  '📊 Extracting business metrics and KPIs...',
  '💡 Cross-referencing industry benchmarks...',
  '⚡ Computing risk probability distributions...',
  '🎯 Formulating strategic action plans...',
  '🚀 Simulating multi-step execution flows...',
  '🔗 Evaluating cascading system impacts...',
  '📈 Projecting market trend responses...',
  '🤖 Synchronizing multi-agent outputs...',
];

// ── Animated Execution Screen ─────────────────────────────────────────────────
function ExecutionAnimation({ stages, stageStatus, traces, loading, localError, onCancel, onReturn }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const thoughtFade = useRef(new Animated.Value(1)).current;
  const [thoughtIdx, setThoughtIdx] = useState(0);

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true })
    );
    const wave = Animated.loop(Animated.sequence([
      Animated.timing(dot1, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(dot2, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(dot3, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(dot1, { toValue: 0.3, duration: 280, useNativeDriver: true }),
      Animated.timing(dot2, { toValue: 0.3, duration: 280, useNativeDriver: true }),
      Animated.timing(dot3, { toValue: 0.3, duration: 280, useNativeDriver: true }),
    ]));
    pulse.start(); rotate.start(); wave.start();
    const tid = setInterval(() => {
      Animated.timing(thoughtFade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setThoughtIdx(i => (i + 1) % AI_THOUGHTS.length);
        Animated.timing(thoughtFade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      });
    }, 2600);
    return () => { pulse.stop(); rotate.stop(); wave.stop(); clearInterval(tid); };
  }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const completed = Object.values(stageStatus).filter(s => s === 'complete').length;
  const progress = stages.length > 0 ? (completed / stages.length) * 100 : 0;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Hero area */}
      <View style={{ alignItems: 'center', paddingVertical: 28 }}>
        <Animated.View style={{
          position: 'absolute', width: 130, height: 130, borderRadius: 65,
          borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.35)', borderStyle: 'dashed',
          transform: [{ rotate: spin }]
        }}>
          <View style={{ position: 'absolute', top: -5, left: '50%', marginLeft: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: '#6366f1' }} />
        </Animated.View>
        <Animated.View style={{
          width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(99,102,241,0.08)',
          borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
          alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulseAnim }]
        }}>
          <Text style={{ fontSize: 44 }}>🧠</Text>
        </Animated.View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#f1f5f9', marginTop: 24, textAlign: 'center' }}>⚡ AI Pipeline Running</Text>
        <Text style={{ fontSize: 16, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>Multi-Agent Orchestrator is active</Text>
        <Animated.View style={{
          opacity: thoughtFade, marginTop: 14,
          paddingHorizontal: 16, paddingVertical: 10,
          backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 12,
          borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', maxWidth: 280
        }}>
          <Text style={{ fontSize: 15, color: '#a5b4fc', textAlign: 'center' }}>{AI_THOUGHTS[thoughtIdx]}</Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 14 }}>
          <Animated.View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#6366f1', opacity: dot1 }} />
          <Animated.View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#8b5cf6', opacity: dot2 }} />
          <Animated.View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#06b6d4', opacity: dot3 }} />
        </View>
        {completed > 0 && (
          <View style={{ width: '100%', marginTop: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Overall Progress</Text>
              <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: '700' }}>{completed}/{stages.length} stages</Text>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, width: `${progress}%`, backgroundColor: '#6366f1', borderRadius: 3 }} />
            </View>
          </View>
        )}
      </View>

      {/* Pipeline steps */}
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', letterSpacing: 0.8, marginBottom: 12, textTransform: 'uppercase' }}>Pipeline Telemetry</Text>
      {stages.map((st, idx) => {
        const status = stageStatus[st.key] || 'idle';
        const stageTraces = traces.filter(t => t.stage === st.key);
        const isLast = idx === stages.length - 1;
        const clr = status === 'complete' ? '#22c55e' : status === 'running' ? '#6366f1' : status === 'error' ? '#ef4444' : '#64748b';
        return (
          <View key={st.key} style={{ flexDirection: 'row', gap: 12, marginBottom: isLast ? 0 : 2 }}>
            <View style={{ alignItems: 'center', width: 32 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: status === 'complete' ? 'rgba(34,197,94,0.12)' : status === 'running' ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', borderWidth: 2, borderColor: clr, alignItems: 'center', justifyContent: 'center' }}>
                {status === 'running' ? <ActivityIndicator size="small" color="#6366f1" /> : <Text style={{ fontSize: 15, color: '#ffffff', fontWeight: '900' }}>{status === 'complete' ? '✓' : status === 'error' ? '✕' : st.icon}</Text>}
              </View>
              {!isLast && <View style={{ width: 2, flex: 1, minHeight: 20 + stageTraces.length * 20, backgroundColor: status === 'complete' ? '#22c55e' : 'rgba(255,255,255,0.05)', marginTop: 2 }} />}
            </View>
            <View style={{ flex: 1, paddingTop: 5, paddingBottom: isLast ? 0 : 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: clr, marginBottom: 3 }}>{st.label}</Text>
              {stageTraces.map((t, i) => {
                const msg = t.status === 'started' ? (t.data?.message || 'Starting...') : t.status === 'completed' ? `✓ Done${t.data?.trace?.duration ? ` (${t.data.trace.duration}ms)` : ''}` : t.status === 'error' ? `✕ ${t.data?.error}` : (t.data?.message || '');
                return (
                  <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 12, color: '#475569', minWidth: 54 }}>{t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</Text>
                    <Text style={{ fontSize: 14, color: '#94a3b8', flex: 1 }}>{msg}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}

      {localError && <View style={{ marginTop: 12, padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}><Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '700' }}>⚠️ {localError}</Text></View>}

      <View style={{ marginTop: 20 }}>
        {loading
          ? <TouchableOpacity style={{ backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }} onPress={onCancel}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>⏹ Stop Execution</Text></TouchableOpacity>
          : <TouchableOpacity style={{ backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }} onPress={onReturn}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>👈 Return to Input</Text></TouchableOpacity>
        }
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const isSmallScreen = width < 380;

  const [tab, setTab] = useState('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [samples, setSamples] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [logFilter, setLogFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Pipeline Loading Telemetry States
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [connected, setConnected] = useState(null);
  
  const [stageStatus, setStageStatus] = useState({});
  const [currentStage, setCurrentStage] = useState(null);
  const [traces, setTraces] = useState([]);
  const [localResult, setLocalResult] = useState(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState('parsing');

  const traceScrollRef = useRef(null);
  const activeRunIdRef = useRef(null);
  const activeIntervalIdRef = useRef(null);

  const handleCancel = async () => {
    if (activeRunIdRef.current) {
      const targetRunId = activeRunIdRef.current;
      activeRunIdRef.current = null;

      if (activeIntervalIdRef.current) {
        clearInterval(activeIntervalIdRef.current);
        activeIntervalIdRef.current = null;
      }

      try {
        await cancelAnalysis(targetRunId);
      } catch (e) {}

      setLoading(false);
      setLocalError('Analysis stopped by user');

      // Update running stages to error style
      setStageStatus(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k] === 'running') {
            next[k] = 'error';
          }
        });
        return next;
      });
      setCurrentStage('error');
    }
  };

  useEffect(() => {
    checkHealth().then(setConnected);
    fetchSamples().then(setSamples).catch(() => {});
    setHasHistory(getResultsHistory().length > 0);
  }, []);

  // Scroll to bottom of agent logs whenever new traces are loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (traceScrollRef.current && typeof traceScrollRef.current.scrollToEnd === 'function') {
          traceScrollRef.current.scrollToEnd({ animated: true });
        }
      } catch (e) {}
    }, 150);
    return () => clearTimeout(timer);
  }, [traces]);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setLocalResult(null);
    setLocalError(null);
    setStageStatus({});
    setCurrentStage(null);

    // Uniquely identify this pipeline run to prevent multi-client cross-talk or visual overrides
    const runId = 'run_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    activeRunIdRef.current = runId;

    const initialTraces = [
      {
        stage: 'orchestrator',
        status: 'started',
        message: '🤖 Initiating Multi-Agent Orchestrator Pipeline...',
        timestamp: new Date().toISOString()
      },
      {
        stage: 'orchestrator',
        status: 'started',
        message: '📡 Establishing Server Connection...',
        timestamp: new Date().toISOString()
      }
    ];
    setTraces(initialTraces);

    // Unified live polling every 500ms for both Desktop and Mobile layouts.
    // This is 100% immune to SSE network buffering, proxies, or stream delivery delays.
    const intervalId = setInterval(async () => {
      try {
        if (activeRunIdRef.current !== runId) {
          clearInterval(intervalId);
          return;
        }

        const activeTracesData = await fetchActiveTraces(runId);
        if (activeRunIdRef.current !== runId) {
          clearInterval(intervalId);
          return;
        }

        if (activeTracesData && activeTracesData.length > 0) {
          setTraces([...initialTraces, ...activeTracesData]);
          
          const realStages = {};
          activeTracesData.forEach(event => {
            if (event.stage && event.stage !== 'pipeline' && event.stage !== 'final_result') {
              if (event.status === 'started') {
                realStages[event.stage] = 'running';
                setCurrentStage(event.stage);
              } else if (event.status === 'completed') {
                realStages[event.stage] = 'complete';
              } else if (event.status === 'error') {
                realStages[event.stage] = 'error';
                setCurrentStage('error');
              }
            }
          });
          setStageStatus(realStages);
        } else {
          setTraces(initialTraces);
        }
      } catch (err) {
        if (activeRunIdRef.current === runId) {
          setTraces(initialTraces);
        }
      }
    }, 500);

    activeIntervalIdRef.current = intervalId;

    try {
      const response = await analyzeContentSync(text.trim(), runId);
      if (activeRunIdRef.current !== runId) {
        clearInterval(intervalId);
        return;
      }
      clearInterval(intervalId);
      activeIntervalIdRef.current = null;
      activeRunIdRef.current = null;

      const realStages = {};
      if (response.traces && response.traces.length > 0) {
        setTraces([...initialTraces, ...response.traces]);
        response.traces.forEach(event => {
          if (event.stage && event.stage !== 'pipeline' && event.stage !== 'final_result') {
            if (event.status === 'started') {
              realStages[event.stage] = 'running';
            } else if (event.status === 'completed') {
              realStages[event.stage] = 'complete';
            } else if (event.status === 'error') {
              realStages[event.stage] = 'error';
            }
          }
        });
        setStageStatus(realStages);
      } else {
        setTraces([...initialTraces, { stage: 'orchestrator', status: 'completed', message: 'All pipeline stages successfully orchestrated.', timestamp: new Date().toISOString() }]);
      }

      const { traces: responseTraces, ...cleanResult } = response;

      setResult(cleanResult);
      setLocalResult(cleanResult);
      setHasHistory(true);
      setLoading(false);
      setCurrentStage('complete');

      if (!isLargeScreen) {
        setTimeout(() => {
          router.push({ pathname: '/results', params: { autoOpen: 'true' } });
        }, 600);
      }
    } catch (err) {
      if (activeRunIdRef.current === runId) {
        clearInterval(intervalId);
        activeIntervalIdRef.current = null;
        activeRunIdRef.current = null;
        setLocalError(err.message || 'Pipeline failed');
        setLoading(false);
        setCurrentStage('error');
      }
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setFetchingUrl(true);
    try {
      const res = await fetchURLContent(url.trim());
      if (res.text) {
        setText(res.text);
        setTab('text');
        Alert.alert('Success', 'Content successfully fetched from URL!');
      } else {
        Alert.alert('Empty Content', 'No readable text was found at the URL.');
      }
    } catch (e) {
      Alert.alert('Fetch Failed', e.message || 'Could not retrieve URL content.');
    } finally {
      setFetchingUrl(false);
    }
  };

  const uploadFile = async (asset) => {
    setUploading(true);
    try {
      const fileName = asset.name || asset.fileName || 'upload.jpg';
      const fileType = asset.mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      
      const response = await uploadFileAPI(asset.uri, fileType, fileName);
      if (response.text) {
        setText(response.text);
        setTab('text');
        Alert.alert('Success', 'Content successfully extracted from file!');
      } else {
        Alert.alert('Upload complete', 'No text could be extracted.');
      }
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Could not process the file.');
    } finally {
      setUploading(false);
    }
  };

  const getAgentColor = (stage) => {
    const a = String(stage).toLowerCase();
    if (a.includes('content_pars') || a.includes('parse')) return COLORS.accent4;
    if (a.includes('insight')) return COLORS.accent1;
    if (a.includes('impact')) return COLORS.warning;
    if (a.includes('action')) return COLORS.accent2;
    if (a.includes('sim')) return COLORS.accent3;
    return COLORS.textMuted;
  };

  // Helper to extract system state metrics for Before/After view
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

  const fmtVal = (v, isCurrency) => isCurrency ? `PKR ${v.toLocaleString()}` : v;

  // Render Input Form Layout
  const renderInputForm = () => (
    <View style={isLargeScreen ? styles.leftColumn : null}>
      <View style={{
        borderBottomWidth: 1.5,
        borderBottomColor: 'rgba(99, 102, 241, 0.25)',
        paddingBottom: 8,
        marginBottom: 16,
        marginTop: 4
      }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '900',
          color: COLORS.accent1,
          letterSpacing: 0.8,
          textTransform: 'uppercase'
        }}>
          📥 Input Content
        </Text>
      </View>

      {/* Segmented Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabBtn, tab === 'text' && styles.tabBtnActive, { paddingVertical: isSmallScreen ? 6 : 10 }]} 
          onPress={() => setTab('text')}
        >
          <Text style={[styles.tabBtnText, tab === 'text' && styles.tabBtnActiveText, { fontSize: isSmallScreen ? 11 : 13 }]}>✏️ Text</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, tab === 'pdf' && styles.tabBtnActive, { paddingVertical: isSmallScreen ? 6 : 10 }]} 
          onPress={() => setTab('pdf')}
        >
          <Text style={[styles.tabBtnText, tab === 'pdf' && styles.tabBtnActiveText, { fontSize: isSmallScreen ? 11 : 13 }]}>📄 PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, tab === 'url' && styles.tabBtnActive, { paddingVertical: isSmallScreen ? 6 : 10 }]} 
          onPress={() => setTab('url')}
        >
          <Text style={[styles.tabBtnText, tab === 'url' && styles.tabBtnActiveText, { fontSize: isSmallScreen ? 11 : 13 }]}>🔗 URL</Text>
        </TouchableOpacity>
      </View>

      {/* Input Fields */}
      {tab === 'text' && (
        <TextInput
          style={styles.textInput}
          placeholder="Paste your report, article, news, or any unstructured content here..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          value={text}
          onChangeText={setText}
        />
      )}

      {tab === 'pdf' && (
        <TouchableOpacity 
          style={[styles.uploadZone, uploading && styles.uploadZoneDisabled]} 
          onPress={handlePickDocument} 
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.accent1} size="large" />
          ) : (
            <View style={styles.uploadInner}>
              <Text style={styles.uploadIcon}>📤</Text>
              <Text style={styles.uploadTitle}>Pick a PDF Report</Text>
              <Text style={styles.uploadDesc}>Tap to browse device storage</Text>
              <Text style={styles.uploadHint}>Supports files up to 10MB</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {tab === 'url' && (
        <View style={styles.urlInputContainer}>
          <TextInput
            style={styles.urlTextInput}
            placeholder="https://example.com/article"
            placeholderTextColor={COLORS.textMuted}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
          />
          <TouchableOpacity 
            style={[styles.fetchBtn, fetchingUrl && { opacity: 0.7 }]} 
            onPress={handleFetchUrl} 
            disabled={fetchingUrl}
          >
            {fetchingUrl ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.fetchBtnText}>🔍 Fetch</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Text Extraction Preview */}
      {tab !== 'text' && text.trim().length > 0 && (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>📄 Extracted Content Preview</Text>
            <TouchableOpacity onPress={() => setText('')}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.previewText} numberOfLines={4}>
            {text.trim()}
          </Text>
        </View>
      )}

      {/* Analyze & Execute Button */}
      <TouchableOpacity
        style={[styles.analyzeBtn, (!text.trim() || loading) && styles.analyzeBtnDisabled]}
        onPress={handleAnalyze}
        disabled={!text.trim() || loading}
      >
        {loading ? (
          <View style={styles.btnLoadingRow}>
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
            <Text style={styles.analyzeBtnText}>Processing Agents...</Text>
          </View>
        ) : (
          <Text style={styles.analyzeBtnText}>⚡ Analyze & Execute</Text>
        )}
      </TouchableOpacity>

      {/* Floating/Inline View Results Button for Mobile */}
      {!isLargeScreen && localResult && (
        <TouchableOpacity
          style={[styles.analyzeBtn, { backgroundColor: COLORS.accent2, marginTop: -8, marginBottom: 20 }]}
          onPress={() => router.push('/results')}
        >
          <Text style={styles.analyzeBtnText}>📊 View Latest Results</Text>
        </TouchableOpacity>
      )}

      {/* Samples Scenarios */}
      {samples.length > 0 && (() => {
        const categories = ['All', ...new Set(samples.map(s => s.category))];
        const filteredSamples = selectedCategory === 'All'
          ? samples
          : samples.filter(s => s.category === selectedCategory);

        return (
          <>
            <View style={{
              borderBottomWidth: 1.5,
              borderBottomColor: 'rgba(139, 92, 246, 0.25)',
              paddingBottom: 8,
              marginBottom: 16,
              marginTop: 18
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '900',
                color: COLORS.accent2,
                letterSpacing: 0.8,
                textTransform: 'uppercase'
              }}>
                📋 Sample Scenarios
              </Text>
            </View>
            
            {/* Horizontal Category Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.samplesContainer}>
              {filteredSamples.map((s) => {
                const getCategoryColor = (cat) => {
                  const c = cat?.toLowerCase() || '';
                  if (c.includes('sales') || c.includes('revenue') || c.includes('finance')) return '#eab308'; // Gold / Yellow
                  if (c.includes('hr') || c.includes('workforce') || c.includes('employee')) return '#06b6d4'; // Cyan
                  if (c.includes('customer') || c.includes('experience')) return '#ec4899'; // Pink / Magenta
                  return '#6366f1'; // Violet
                };
                const leftAccentColor = getCategoryColor(s.category);

                return (
                  <TouchableOpacity 
                    key={s.id} 
                    style={[styles.sampleCard, { borderLeftColor: leftAccentColor }]} 
                    onPress={() => {
                      setText(s.content);
                      setTab('text');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sampleIcon}>{s.icon}</Text>
                    <View style={styles.sampleInfo}>
                      <Text style={styles.sampleTitle}>{s.title}</Text>
                      <View style={{
                        alignSelf: 'flex-start',
                        backgroundColor: leftAccentColor + '15',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: leftAccentColor + '35',
                        marginTop: 4
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: leftAccentColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.category}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        );
      })()}
    </View>
  );

  // Render Pipeline Visualizer & Logs Panel
  const renderPipelineAndTraces = () => (
    <View style={resStyles.pipelinePanel}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>⛓️ MULTI-AGENT EXECUTION PIPELINE</Text>
        {loading && (
          <TouchableOpacity 
            style={{ backgroundColor: COLORS.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
            onPress={handleCancel}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>⏹ Stop</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Vertical Pipeline Steps with Inline Logs */}
      <View style={resStyles.pipelineVerticalContainer}>
        {STAGES.map((st, sIdx) => {
          const status = stageStatus[st.key] || 'idle';
          const stageTraces = traces.filter(t => t.stage === st.key);
          const isLast = sIdx === STAGES.length - 1;

          return (
            <View key={st.key} style={resStyles.pipelineVerticalRow}>
              {/* Left Column: Node and Line */}
              <View style={resStyles.nodeLineCol}>
                <View style={[
                  resStyles.pipelineDot,
                  status === 'running' && resStyles.pipelineDotRunning,
                  status === 'complete' && resStyles.pipelineDotComplete,
                  status === 'error' && resStyles.pipelineDotError
                ]}>
                  {status === 'running' ? (
                    <ActivityIndicator size="small" color={COLORS.accent1} />
                  ) : (
                    <Text style={{ fontSize: 13, color: '#ffffff', fontWeight: '900' }}>
                      {status === 'complete' ? '✓' : status === 'error' ? '✕' : st.icon}
                    </Text>
                  )}
                </View>
                {!isLast && (
                  <View style={[
                    resStyles.pipelineVerticalLine,
                    (status === 'complete') && { backgroundColor: COLORS.success },
                    (status === 'running') && { backgroundColor: COLORS.accent1 },
                    stageTraces.length > 0 && { minHeight: 20 + (stageTraces.length * 20) } // extend line height dynamically based on inline logs
                  ]} />
                )}
              </View>

              {/* Right Column: Info and Traces */}
              <View style={resStyles.nodeInfoCol}>
                <Text style={[
                  resStyles.pipelineVerticalLabel,
                  (status === 'running' || status === 'complete') && { color: COLORS.textPrimary }
                ]}>{st.label}</Text>
                
                {/* Inline Traces for this specific step */}
                {stageTraces.length > 0 && (
                  <View style={resStyles.inlineTraceContainer}>
                    {stageTraces.map((t, idx) => {
                      const msg = t.status === 'started'
                        ? (t.data?.message || 'Starting...')
                        : t.status === 'completed'
                        ? `✓ Done${t.data?.trace?.duration ? ` (${t.data.trace.duration}ms)` : ''}`
                        : t.status === 'error'
                        ? `✕ Error: ${t.data?.error}`
                        : (t.data?.message || '');
                      return (
                        <View key={idx} style={resStyles.inlineTraceRow}>
                          <Text style={resStyles.inlineTraceTime}>{t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''}</Text>
                          <Text style={resStyles.inlineTraceMsg}>{msg}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Global Errors or Orchestrator messages */}
      {(() => {
        const errorTrace = traces.find(t => t.stage === 'pipeline' && t.status === 'error');
        if (!errorTrace) return null;
        return (
          <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <Text style={{ color: COLORS.danger, fontSize: 12, fontWeight: '700' }}>❌ Pipeline Error:</Text>
            <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: 4 }}>
              {errorTrace.data?.message || errorTrace.data?.error || errorTrace.message || 'Unknown error occurred'}
            </Text>
          </View>
        );
      })()}
    </View>
  );

  // Render Main Results View
  const renderResults = () => {
    if (!localResult) return null;

    const parse = localResult.contentParsing || {};
    const insights = localResult.insights?.insights || [];
    const impacts = localResult.impactAnalysis?.impactAssessment || [];
    const actions = localResult.actions?.actions || [];
    const sim = localResult.simulation || {};
    const riskScore = localResult.impactAnalysis?.overallRiskScore || 0;

    const beforeMetrics = getDetailedMetrics(sim.beforeState);
    const afterMetrics = getDetailedMetrics(sim.afterState);
    const changes = afterMetrics.map((m, i) => ({
      ...m,
      beforeVal: beforeMetrics[i]?.value || 0,
      diff: typeof m.value === 'number' && typeof beforeMetrics[i]?.value === 'number'
        ? m.value - beforeMetrics[i].value : null,
    })).filter(m => m.diff !== null && m.diff !== 0);

    const RESULT_TABS = [
      { id: 'parsing', label: 'Parsing', icon: '📄' },
      { id: 'insights', label: 'Insights', icon: '💡' },
      { id: 'impact', label: 'Impact', icon: '⚡' },
      { id: 'actions', label: 'Actions', icon: '🎯' },
      { id: 'simulation', label: 'Simulation', icon: '🚀' },
    ];

    return (
      <View style={resStyles.resultsContainer}>
        {/* Horizontal Tab Navigation */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>📊 ANALYSIS RESULTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
            {RESULT_TABS.map(tab => {
              const isActive = activeResultTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[resStyles.resultTabBtn, isActive && resStyles.resultTabBtnActive]}
                  onPress={() => setActiveResultTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 14, marginRight: 4 }}>{tab.icon}</Text>
                  <Text style={[resStyles.resultTabText, isActive && resStyles.resultTabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 1. Content Parsing */}
        {activeResultTab === 'parsing' && (
          <ResultSectionCard title="Content Parsing" icon="📄" badge={`${parse.entities?.length || 0} entities`} badgeColor={COLORS.accent4}>
            {parse.summary && <Text style={resStyles.summaryText}>{parse.summary}</Text>}
            {parse.context && (
              <View style={resStyles.tagWrapperRow}>
                {parse.context.domain && <Text style={resStyles.pillTag}>🌐 {parse.context.domain}</Text>}
                {parse.context.region && <Text style={resStyles.pillTag}>📍 {parse.context.region}</Text>}
                {parse.context.timePeriod && <Text style={resStyles.pillTag}>📅 {parse.context.timePeriod}</Text>}
                {parse.context.urgency && (
                  <Text style={[resStyles.pillTag, { backgroundColor: 'rgba(239,68,68,0.1)', color: COLORS.danger }]}>
                    ⚡ {parse.context.urgency.toUpperCase()}
                  </Text>
                )}
              </View>
            )}

            {parse.entities?.length > 0 && (
              <View style={resStyles.subSection}>
                <Text style={resStyles.subSectionTitle}>🏢 Entities</Text>
                <View style={resStyles.tagWrapperRow}>
                  {parse.entities.map((e, i) => (
                    <View key={i} style={resStyles.entityTagBox}>
                      <Text style={resStyles.entityName}>{e.name}</Text>
                      <Text style={resStyles.entityType}>{e.type}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {parse.metrics?.length > 0 && (
              <View style={resStyles.subSection}>
                <Text style={resStyles.subSectionTitle}>📊 Metrics ({parse.metrics.length})</Text>
                {parse.metrics.map((m, i) => (
                  <View key={i} style={resStyles.metricRow}>
                    <Text style={resStyles.metricName}>{m.name}: <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{m.value}{m.unit ? ` ${m.unit}` : ''}</Text></Text>
                    {m.trend && m.trend !== 'unknown' && (
                      <Text style={[resStyles.trendPill, m.trend === 'decreasing' ? resStyles.trendDown : resStyles.trendUp]}>
                        {m.trend === 'decreasing' ? '↓' : m.trend === 'increasing' ? '↑' : '→'} {m.trend}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {parse.facts?.length > 0 && (
              <View style={resStyles.subSection}>
                <Text style={resStyles.subSectionTitle}>📋 Key Facts ({parse.facts.length})</Text>
                {parse.facts.slice(0, 6).map((f, i) => (
                  <View key={i} style={resStyles.metricRow}>
                    <Text style={[resStyles.metricName, { flex: 1 }]}>{f.statement}</Text>
                    <Text style={resStyles.trendPill}>{Math.round((f.confidence || 0.5) * 100)}%</Text>
                  </View>
                ))}
              </View>
            )}
          </ResultSectionCard>
        )}

        {/* 2. Insights */}
        {activeResultTab === 'insights' && (
          <ResultSectionCard title="Extracted Insights" icon="💡" badge={`${insights.length} found`} badgeColor={COLORS.accent1}>
            {localResult.insights?.keyFindings && <Text style={resStyles.summaryText}>{localResult.insights.keyFindings}</Text>}
            {insights.map((ins, i) => (
              <View key={i} style={[resStyles.insightCard, { borderLeftColor: ins.severity === 'critical' ? COLORS.danger : ins.severity === 'high' ? COLORS.warning : COLORS.accent1 }]}>
                <Text style={resStyles.insightTitle}>{ins.title}</Text>
                <Text style={resStyles.insightDesc}>{ins.description}</Text>
                <View style={resStyles.confidenceContainer}>
                  <View style={resStyles.confidenceBg}>
                    <View style={[resStyles.confidenceFill, { width: `${(ins.confidence || 0.5) * 100}%` }]} />
                  </View>
                  <Text style={resStyles.confidenceText}>{Math.round((ins.confidence || 0.5) * 100)}% confidence</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {ins.type && <Text style={resStyles.insightTag}>{ins.type}</Text>}
                  {ins.severity && <Text style={resStyles.insightTag}>{ins.severity}</Text>}
                  <Text style={resStyles.insightTag}>{Math.round((ins.confidence || 0.5) * 100)}% confidence</Text>
                  {ins.category && <Text style={resStyles.insightTag}>{ins.category}</Text>}
                </View>
              </View>
            ))}
          </ResultSectionCard>
        )}

        {/* 3. Impact */}
        {activeResultTab === 'impact' && (
          <ResultSectionCard title="Impact Analysis" icon="⚡" badge={`Risk: ${riskScore}`} badgeColor={COLORS.danger}>
            <View style={resStyles.riskMeter}>
              <View style={resStyles.riskTopRow}>
                <Text style={resStyles.riskScore}>{riskScore}</Text>
                <Text style={resStyles.riskLabel}>Overall Risk Index</Text>
              </View>
              <View style={resStyles.riskBarBg}>
                <View style={[resStyles.riskBarFill, { width: `${riskScore}%`, backgroundColor: riskScore >= 50 ? COLORS.danger : COLORS.accent1 }]} />
              </View>
            </View>
            {localResult.impactAnalysis?.executiveSummary && <Text style={resStyles.summaryText}>{localResult.impactAnalysis.executiveSummary}</Text>}
            
            {impacts.map((ia, i) => (
              <View key={i} style={{ marginTop: 8 }}>
                {ia.impacts?.map((imp, j) => (
                  <View key={j} style={resStyles.innerImpactCard}>
                    <Text style={resStyles.innerImpactArea}>{imp.area?.toUpperCase()}</Text>
                    <Text style={resStyles.innerImpactDesc}>{imp.description}</Text>
                    {imp.cascadingEffects?.length > 0 && (
                      <View style={resStyles.cascadeBox}>
                        <Text style={resStyles.cascadeTitle}>CASCADING PATHWAY</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {imp.cascadingEffects.map((item, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {idx > 0 && <Text style={resStyles.cascadeArrow}>→</Text>}
                              <View style={resStyles.cascadeNode}><Text style={resStyles.cascadeText}>{item}</Text></View>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </ResultSectionCard>
        )}

        {/* 4. Actions */}
        {activeResultTab === 'actions' && (
          <ResultSectionCard title="Recommended Actions" icon="🎯" badge={`${actions.length} actions`} badgeColor={COLORS.warning}>
            {actions.map((act, i) => (
              <View key={i} style={resStyles.actionCard}>
                <View style={[resStyles.actionNum, { backgroundColor: 'rgba(99,102,241,0.1)' }]}>
                  <Text style={[resStyles.actionNumText, { color: COLORS.accent1 }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={resStyles.actionHeaderRow}>
                    <Text style={resStyles.actionTitle}>{act.title}</Text>
                    <Text style={resStyles.serviceBadge}>{act.targetService || act.type}</Text>
                  </View>
                  <Text style={resStyles.actionDesc}>{act.description}</Text>
                  {act.expectedOutcome && (
                    <Text style={resStyles.actionOutcome}>✓ Outcome: {act.expectedOutcome}</Text>
                  )}
                </View>
              </View>
            ))}
          </ResultSectionCard>
        )}

        {/* 5. Simulation */}
        {activeResultTab === 'simulation' && (
          <>
            <ResultSectionCard title="Simulation Results" icon="🚀" badge={sim.summary ? `${sim.summary.successful}/${sim.summary.totalActions}` : ''} badgeColor={COLORS.success}>
              {sim.summary && (
                <View style={resStyles.simStats}>
                  <View style={resStyles.simStat}><Text style={resStyles.simValTotal}>{sim.summary.totalActions}</Text><Text style={resStyles.simLabel}>Total</Text></View>
                  <View style={resStyles.simStat}><Text style={[resStyles.simVal, { color: COLORS.success }]}>{sim.summary.successful}</Text><Text style={resStyles.simLabel}>Success</Text></View>
                  <View style={resStyles.simStat}><Text style={[resStyles.simVal, { color: COLORS.danger }]}>{sim.summary.failed}</Text><Text style={resStyles.simLabel}>Failed</Text></View>
                </View>
              )}
              {sim.executionResults?.slice(0, 10).map((er, idx) => (
                <SimulationLogCard key={idx} er={er} i={idx} />
              ))}
            </ResultSectionCard>

            <ResultSectionCard title="Before / After State" icon="🔄" badge="Comparison">
              {changes.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={resStyles.subSectionTitle}>⚡ System Modifications</Text>
                  <View style={resStyles.changesGrid}>
                    {changes.map((c, i) => {
                      const cardWidth = isLargeScreen ? '31%' : (width < 480 ? '100%' : '48%');
                      return (
                        <View key={i} style={[resStyles.changeGridCard, { minWidth: cardWidth, borderColor: c.diff > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                          <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                          <Text style={resStyles.changeGridLabel} numberOfLines={1}>{c.label}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={resStyles.strikeVal}>{fmtVal(c.beforeVal, c.isCurrency)}</Text>
                            <Text style={{ color: COLORS.textMuted, fontSize: 10 }}>→</Text>
                            <Text style={resStyles.finalVal}>{fmtVal(c.value, c.isCurrency)}</Text>
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: c.diff > 0 ? COLORS.success : COLORS.danger }}>
                            {c.diff > 0 ? `▲ +${fmtVal(c.diff, c.isCurrency)}` : `▼ ${fmtVal(c.diff, c.isCurrency)}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={resStyles.stateStackContainer}>
                <View style={resStyles.statePanelBox}>
                  <Text style={[resStyles.stateLabelTitle, { color: COLORS.textMuted }]}>⬅ BEFORE Simulation</Text>
                  {beforeMetrics.map((m, i) => (
                    <View key={i} style={resStyles.stateItemLine}>
                      <Text style={resStyles.stateItemText}>{m.icon} {m.label}</Text>
                      <Text style={resStyles.stateItemVal}>{fmtVal(m.value, m.isCurrency)}</Text>
                    </View>
                  ))}
                  {sim.beforeState?.capturedAt && (
                    <View style={[resStyles.stateItemLine, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 4, paddingTop: 8 }]}>
                      <Text style={resStyles.stateItemText}>🕐 Captured At</Text>
                      <Text style={[resStyles.stateItemVal, { fontSize: 11 }]}>{new Date(sim.beforeState.capturedAt).toLocaleTimeString()}</Text>
                    </View>
                  )}
                </View>

                <View style={[resStyles.statePanelBox, { marginTop: 12 }]}>
                  <Text style={[resStyles.stateLabelTitle, { color: COLORS.accent1 }]}>AFTER Simulation ➡</Text>
                  {afterMetrics.map((m, i) => {
                    const diff = typeof m.value === 'number' && typeof beforeMetrics[i]?.value === 'number'
                      ? m.value - beforeMetrics[i].value : null;
                    return (
                      <View key={i} style={[resStyles.stateItemLine, diff && diff !== 0 && { backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: 4 }]}>
                        <Text style={resStyles.stateItemText}>{m.icon} {m.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={resStyles.stateItemVal}>{fmtVal(m.value, m.isCurrency)}</Text>
                          {diff !== null && diff !== 0 && (
                            <Text style={{ fontSize: 10, fontWeight: '800', color: diff > 0 ? COLORS.success : COLORS.danger }}>
                              {diff > 0 ? `+${fmtVal(diff, m.isCurrency)}` : fmtVal(diff, m.isCurrency)}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {sim.afterState?.capturedAt && (
                    <View style={[resStyles.stateItemLine, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 4, paddingTop: 8 }]}>
                      <Text style={resStyles.stateItemText}>🕐 Captured At</Text>
                      <Text style={[resStyles.stateItemVal, { fontSize: 11 }]}>{new Date(sim.afterState.capturedAt).toLocaleTimeString()}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ResultSectionCard>
          </>
        )}
      </View>
    );
  };

  const renderExecutionScreen = () => (
    <ExecutionAnimation
      stages={STAGES}
      stageStatus={stageStatus}
      traces={traces}
      loading={loading}
      localError={localError}
      onCancel={handleCancel}
      onReturn={() => { setLoading(false); setLocalError(null); }}
    />
  );

  // Render Right Column Container (Either Pink Brain Empty State, Loading Logs, or Results)
  const renderRightColumn = () => {
    if (!isLargeScreen) {
      return null;
    }

    // Desktop mode renders the right column in side-by-side mode
    return (
      <View style={styles.rightColumn}>
        {loading || traces.length > 0 || localResult ? (
          <View style={{ flex: 1 }}>
            {renderPipelineAndTraces()}
            {renderResults()}
          </View>
        ) : (
          // Default beautiful Pink Brain empty state (100% parity with port 5173 screenshot)
          <View style={styles.emptyContainer}>
            <View style={styles.brainWrapper}>
              <Text style={styles.brainEmoji}>🧠</Text>
            </View>
            <Text style={styles.emptyTitle}>Ready to Analyze</Text>
            <Text style={styles.emptyDesc}>
              Paste a business report, upload a PDF, or fetch a URL — ActionFlow AI will extract insights, analyze impact, recommend actions, and simulate execution in real-time.
            </Text>
            <View style={styles.emptyFooterGCP}>
              <Text style={styles.footerGcpText}>☁️ Google Cloud Platform</Text>
              <Text style={styles.footerGcpDot}>•</Text>
              <Text style={styles.footerGcpText}>🔷 Antigravity</Text>
              <Text style={styles.footerGcpDot}>•</Text>
              <Text style={styles.footerGcpText}>⚡ Gemini 2.5</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky Header Bar on Desktop / Tablets */}
      {isLargeScreen && (
        <View style={[
          styles.header,
          {
            flexDirection: width < 600 ? 'column' : 'row',
            alignItems: width < 600 ? 'flex-start' : 'center',
            paddingHorizontal: width < 600 ? 16 : 28,
            paddingVertical: width < 600 ? 12 : 18,
            gap: width < 600 ? 10 : 0,
          }
        ]}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>AF</Text>
            </View>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>ActionFlow AI</Text>
              <Text style={styles.headerSub}>Autonomous Content-to-Action Agent • Business Operations</Text>
            </View>
          </View>

          {/* Glowing badges matching Web Client screenshot */}
          <View style={[styles.headerBadgesRow, width < 600 && { marginTop: 4 }]}>
            <Text style={styles.badgeTextGlow}>🔷 GOOGLE ANTIGRAVITY</Text>
            <Text style={styles.badgeTextGlow}>⚡ GEMINI 2.5</Text>
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={isLargeScreen ? styles.largeScroll : styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Scrollable Header on Mobile */}
        {!isLargeScreen && (
          <View style={[styles.headerMobile, { marginBottom: 10 }]}>
            {/* Logo Left - Moved down few pixels (marginTop: 6) */}
            <View style={{ width: 44 }}>
              <View style={[styles.logoBox, { marginTop: 6 }]}>
                <Text style={styles.logoText}>AF</Text>
              </View>
            </View>

            {/* Centered Name */}
            <View style={{
              position: 'absolute',
              left: 0, right: 0,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: -1,
            }}>
              <Text style={styles.headerTitle}>ActionFlow AI</Text>
              <Text style={styles.headerSub}>Autonomous Operations</Text>
            </View>

            {/* Hamburger Dropdown Menu Button Right */}
            <TouchableOpacity
              style={{ width: 44, alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 8 }}
              onPress={() => setMenuOpen(prev => !prev)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24, color: menuOpen ? COLORS.accent1 : COLORS.textPrimary }}>
                {menuOpen ? '✕' : '☰'}
              </Text>
            </TouchableOpacity>
          </View>
        )}



        {/* Responsive Grid layout */}
        {!isLargeScreen && loading ? (
          renderExecutionScreen()
        ) : (
          <View style={isLargeScreen ? styles.appLayout : styles.mobileLayout}>
            {renderInputForm()}
            {isLargeScreen && renderRightColumn()}
          </View>
        )}

        {/* Footer — matches web exactly */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Built with <Text style={{ color: COLORS.accent1, fontWeight: '700' }}>Google Antigravity</Text> • Powered by Gemini 2.5 Flash</Text>
          <Text style={styles.footerSub}>☁️ GCP: Cloud Run • Firebase • Cloud Storage • Cloud Logging</Text>
        </View>
      </ScrollView>

      {/* Full-screen backdrop — outside ScrollView so it covers everything */}
      {menuOpen && (
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        />
      )}

      {/* Dropdown Menu — outside ScrollView, floats above all content */}
      {menuOpen && !isLargeScreen && (
        <View style={styles.dropdownMenu}>
          <Text style={{
            fontSize: 10,
            fontWeight: '900',
            color: COLORS.accent4,
            letterSpacing: 1.5,
            paddingHorizontal: 6,
            paddingBottom: 8,
            textTransform: 'uppercase',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.06)',
            marginBottom: 10
          }}>
            ⚡ ACTIONFLOW CONSOLE
          </Text>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setMenuOpen(false);
              router.push('/results');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>📊 View Latest Results</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setMenuOpen(false);
              if (samples.length > 0) {
                const randomSample = samples[Math.floor(Math.random() * samples.length)];
                setText(randomSample.content);
                setTab('text');
                Alert.alert('🎲 Scenario Loaded', `"${randomSample.title}" is now loaded in the text input console!`);
              } else {
                Alert.alert('No Samples', 'Could not locate any active scenario samples.');
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>🎲 Load Random Scenario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setMenuOpen(false);
              setText('');
              setUrl('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>🧹 Clear Input Form</Text>
          </TouchableOpacity>



          <View style={styles.dropdownDivider} />
          <View style={styles.dropdownInfo}>
            <Text style={styles.dropdownInfoText}>🔷 Google Antigravity</Text>
            <Text style={styles.dropdownInfoText}>⚡ Gemini 2.5 Flash</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  largeScroll: { padding: 0 },
  
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 28, 
    borderBottomWidth: 1, borderBottomColor: '#1d1d3a',
    backgroundColor: '#0c0c1e',
    ...Platform.select({
      web: { position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' },
      default: {}
    })
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.accent1, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent1, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)' },
      default: {}
    })
  },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerTitleContainer: { justifyContent: 'center' },
  headerTitle: { 
    fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 0.3,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
        color: 'transparent',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      },
      default: {}
    })
  },
  headerSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, letterSpacing: 0.2 },
  
  headerBadgesRow: { flexDirection: 'row', gap: 8 },
  badgeTextGlow: {
    fontSize: 10, color: COLORS.accent4, fontWeight: '700',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    letterSpacing: 0.5,
  },

  // Connection Indicator
  mobileStatusBar: {
    flexDirection: 'row', justifyContent: 'center', paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.02)', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statusInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  // Responsive layout grids
  appLayout: {
    flexDirection: 'row',
    maxWidth: 1400,
    alignSelf: 'center',
    width: '100%',
    padding: 24,
    gap: 24,
  },
  mobileLayout: { flexDirection: 'column', padding: 14 },
  
  leftColumn: { width: 440, gap: 14 },
  rightColumn: { flex: 1, minHeight: 480, paddingLeft: 12 },

  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: COLORS.textMuted,
    letterSpacing: 1.5, marginBottom: 12, marginTop: 4,
  },
  
  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: 'rgba(15, 15, 38, 0.7)',
    borderRadius: 14, padding: 4, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)',
    marginBottom: 14,
  },
  tabBtn: { 
    flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent',
  },
  tabBtnActive: { 
    backgroundColor: COLORS.accent1,
    borderColor: COLORS.accent1,
    borderWidth: 1.5,
    shadowColor: COLORS.accent1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4
  },
  tabBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
  tabBtnActiveText: { color: '#ffffff', fontWeight: '900' },
  
  // Text Input
  textInput: {
    backgroundColor: '#0d0d22', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 14, padding: 16, color: COLORS.textPrimary,
    fontSize: 14, lineHeight: 22, minHeight: 220, marginBottom: 16,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1
  },
  
  // URL Input
  urlInputContainer: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  urlTextInput: {
    flex: 1, backgroundColor: '#0d0d22', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8, color: COLORS.textPrimary,
    fontSize: 15,
  },
  fetchBtn: {
    backgroundColor: COLORS.accent4, borderWidth: 1.5, borderColor: COLORS.accent4,
    borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.accent4, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 6, elevation: 3
  },
  fetchBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },

  // Upload Zone
  uploadZone: {
    backgroundColor: '#0d0d25', borderWidth: 1.5, borderColor: 'rgba(99, 102, 241, 0.3)',
    borderStyle: 'dashed', borderRadius: 14, minHeight: 220, marginBottom: 16,
    justifyContent: 'center', alignItems: 'center', padding: 20,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 2
  },
  uploadZoneDisabled: { opacity: 0.6 },
  uploadInner: { alignItems: 'center' },
  uploadIcon: { fontSize: 32, marginBottom: 8 },
  uploadTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  uploadDesc: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  uploadHint: { fontSize: 10, color: COLORS.textMuted },
  
  // Text Preview
  previewContainer: {
    backgroundColor: 'rgba(99,102,241,0.04)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  previewTitle: { fontSize: 12, fontWeight: '700', color: COLORS.accent1 },
  clearText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  previewText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  
  // Actions
  analyzeBtn: {
    backgroundColor: COLORS.accent1, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 20,
    shadowColor: COLORS.accent1, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  btnLoadingRow: { flexDirection: 'row', alignItems: 'center' },
  
  // Samples
  samplesContainer: { gap: 10, marginBottom: 24 },
  sampleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, backgroundColor: '#0a0a20', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 2,
    borderLeftWidth: 4,
  },
  sampleIcon: { fontSize: 24 },
  sampleInfo: { flex: 1 },
  sampleTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sampleCategory: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  categoryScroll: { flexDirection: 'row', gap: 8, paddingVertical: 4, marginBottom: 12 },
  categoryPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#6366f1', borderColor: '#6366f1',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  categoryText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  categoryTextActive: { color: '#ffffff', fontWeight: '800' },
  
  // Empty State (Pink Brain)
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 40, textAlign: 'center', marginTop: 40,
  },
  brainWrapper: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(236,72,153,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.2)',
  },
  brainEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
  emptyDesc: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 440, marginBottom: 28 },
  emptyFooterGCP: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerGcpText: { fontSize: 12, color: COLORS.textMuted },
  footerGcpDot: { color: COLORS.textMuted },
  headerMobile: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#1d1d3a',
    backgroundColor: '#0c0c1e', position: 'relative',
    borderRadius: 14, zIndex: 1000, overflow: 'visible',
  },
  dropdownMenu: {
    position: 'absolute', top: 70, right: 16, width: 230,
    backgroundColor: 'rgba(15, 15, 38, 0.98)', borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.4)',
    borderRadius: 16, padding: 14, zIndex: 9999,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 24,
  },
  menuBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
    marginBottom: 6, backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  dropdownText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700' },
  dropdownDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 10,
  },
  dropdownInfo: {
    paddingHorizontal: 6, paddingVertical: 4, gap: 4,
  },
  dropdownInfoText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 0.5 },

  // Footer
  footer: { 
    alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: 'rgba(6,6,15,0.6)', 
    width: '90%', maxWidth: 500, alignSelf: 'center',
    borderRadius: 14, marginTop: 24, marginBottom: 16,
  },
  footerText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  footerSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
});

const resStyles = StyleSheet.create({
  // Pipeline Dashboard Layout
  pipelinePanel: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  pipelineScroll: { paddingVertical: 10, alignItems: 'center' },
  pipelineLine: { width: 30, height: 2, backgroundColor: COLORS.border, marginHorizontal: 2 },
  pipelineNode: { alignItems: 'center', gap: 6, minWidth: 70 },
  pipelineDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.bg, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pipelineDotRunning: { borderColor: COLORS.accent1, shadowColor: COLORS.accent1, shadowRadius: 8, elevation: 4 },
  pipelineDotComplete: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  pipelineDotError: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  pipelineLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  // Vertical Pipeline layout for mobile
  pipelineVerticalContainer: {
    paddingVertical: 14,
    gap: 16,
  },
  pipelineVerticalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  nodeLineCol: {
    alignItems: 'center',
    width: 32,
  },
  pipelineVerticalLine: {
    width: 2,
    height: 38,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  nodeInfoCol: {
    flex: 1,
    paddingTop: 4,
  },
  pipelineVerticalLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pipelineVerticalDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  
  // Inline Traces
  inlineTraceContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.06)',
    marginLeft: 4,
  },
  inlineTraceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  inlineTraceTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginRight: 6,
    width: 58,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inlineTraceMsg: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16,
  },

  // Results Tabs
  resultTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultTabBtnActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: COLORS.accent1,
  },
  resultTabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  resultTabTextActive: {
    color: COLORS.accent1,
    fontWeight: '800',
  },

  // Terminal Trace log
  traceLog: {
    backgroundColor: '#030308', borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, maxHeight: 180, overflow: 'hidden', marginTop: 14,
  },
  traceHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.01)',
  },
  traceHeaderTitle: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.5 },
  traceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  filterRow: {
    flexDirection: 'row', gap: 4, paddingVertical: 6, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.01)',
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 4, marginRight: 2,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(99,102,241,0.15)', borderColor: COLORS.accent1,
  },
  filterBtnText: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '500' },
  filterBtnActiveText: { color: COLORS.textPrimary, fontWeight: '700' },
  traceBody: { padding: 8, height: 130 },
  traceEntry: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  traceTime: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  traceAgent: { fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
  traceMsg: { fontSize: 10, color: COLORS.textSecondary, flex: 1, fontFamily: 'monospace' },

  // Results Layout
  resultsContainer: { gap: 16 },
  section: { 
    borderRadius: 14, borderWidth: 1, 
    borderColor: COLORS.border, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.015)' 
  },
  sectionHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.01)'
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  badge: { 
    fontSize: 9, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, 
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.02)'
  },
  toggleBtn: { fontSize: 11, color: COLORS.textMuted, fontWeight: 'bold' },
  toggleBtnOpen: { transform: [{ rotate: '180deg' }] },
  sectionBody: { padding: 14 },

  summaryText: { 
    fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12, 
    padding: 12, backgroundColor: 'rgba(99,102,241,0.04)', borderRadius: 10, 
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.1)' 
  },

  subSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  subSectionTitle: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },

  tagWrapperRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pillTag: { 
    fontSize: 11, color: COLORS.textSecondary, fontWeight: '500', 
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, 
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border 
  },

  insightTag: {
    fontSize: 11, color: COLORS.textMuted, fontWeight: '500',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border,
  },

  entityTagBox: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, 
    backgroundColor: COLORS.bgGlass, borderWidth: 1, borderColor: COLORS.border 
  },
  entityName: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  entityType: { fontSize: 9, fontWeight: '700', color: COLORS.accent4, backgroundColor: 'rgba(6,182,212,0.1)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },

  metricRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' 
  },
  metricName: { fontSize: 12, color: COLORS.textSecondary },
  metricValue: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  trendPill: { fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  trendDown: { backgroundColor: 'rgba(239,68,68,0.1)', color: COLORS.danger },
  trendUp: { backgroundColor: 'rgba(34,197,94,0.1)', color: COLORS.success },

  insightCard: { padding: 12, marginBottom: 8, backgroundColor: COLORS.bgCard, borderRadius: 10, borderLeftWidth: 3, borderWidth: 1, borderColor: COLORS.border },
  insightTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  insightDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  confidenceContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  confidenceBg: { flex: 1, height: 4, backgroundColor: COLORS.bgGlass, borderRadius: 2, overflow: 'hidden' },
  confidenceFill: { 
    height: 4, backgroundColor: COLORS.accent1, borderRadius: 2,
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(135deg, #06b6d4, #6366f1)' },
      default: {}
    })
  },
  confidenceText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },

  riskMeter: { padding: 12, backgroundColor: COLORS.bgGlass, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  riskTopRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  riskScore: { 
    fontSize: 26, fontWeight: '900', color: COLORS.accent1,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
        color: 'transparent',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      },
      default: {}
    })
  },
  riskLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  riskBarBg: { height: 6, backgroundColor: COLORS.bgCard, borderRadius: 3, overflow: 'hidden' },
  riskBarFill: { height: 6, borderRadius: 3 },

  innerImpactCard: { padding: 12, marginBottom: 8, backgroundColor: COLORS.bgCard, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  innerImpactArea: { fontSize: 10, fontWeight: '800', color: COLORS.accent4, marginBottom: 4 },
  innerImpactDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  cascadeBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
  cascadeTitle: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, marginBottom: 6 },
  cascadeArrow: { color: COLORS.accent1, fontWeight: '900', marginHorizontal: 6, fontSize: 12 },
  cascadeNode: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: COLORS.bgGlass, borderWidth: 1, borderColor: COLORS.border, maxWidth: 160 },
  cascadeText: { fontSize: 10, color: COLORS.textSecondary },

  actionCard: { flexDirection: 'row', gap: 10, padding: 12, marginBottom: 8, backgroundColor: COLORS.bgCard, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  actionNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionNumText: { fontSize: 11, fontWeight: '800' },
  actionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 10 },
  actionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  serviceBadge: { fontSize: 9, fontWeight: '700', color: COLORS.accent2, backgroundColor: 'rgba(139,92,246,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  actionOutcome: { fontSize: 10, color: COLORS.success, marginTop: 4, fontWeight: '600' },

  simStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, padding: 8, backgroundColor: COLORS.bgCard, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  simStat: { alignItems: 'center' },
  simVal: { fontSize: 18, fontWeight: '900' },
  simValTotal: {
    fontSize: 18, fontWeight: '900', color: COLORS.accent1,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
        color: 'transparent',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      },
      default: {}
    })
  },
  simLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 1, fontWeight: '500' },
  
  simExecCard: { padding: 10, marginBottom: 6, backgroundColor: COLORS.bgCard, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3 },
  simExecHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  simExecTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  simExecBody: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
  apiEndpointRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,102,241,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
  methodBadge: { fontSize: 9, fontWeight: '800', color: COLORS.success },
  apiPath: { fontSize: 10, color: COLORS.accent4, fontFamily: 'monospace', flex: 1 },
  jsonPayload: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6, gap: 2 },
  jsonLine: { flexDirection: 'row' },
  jsonKey: { fontSize: 10, color: COLORS.accent2, fontFamily: 'monospace' },
  jsonVal: { fontSize: 10, color: COLORS.success, fontFamily: 'monospace', flex: 1 },
  errBlock: { backgroundColor: 'rgba(239,68,68,0.08)', padding: 6, borderRadius: 4, marginTop: 4 },
  errText: { fontSize: 10, color: COLORS.danger, fontWeight: '500' },

  changesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  changeGridCard: { flex: 1, minWidth: '31%', padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', gap: 2, backgroundColor: COLORS.bgCard },
  changeGridLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  strikeVal: { fontSize: 10, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  finalVal: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '700' },

  stateStackContainer: { width: '100%', marginTop: 8 },
  statePanelBox: { backgroundColor: COLORS.bgCard, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  stateLabelTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  stateItemLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  stateItemText: { fontSize: 11, color: COLORS.textSecondary },
  stateItemVal: { fontSize: 11, color: COLORS.textPrimary, fontWeight: '600' },
});
