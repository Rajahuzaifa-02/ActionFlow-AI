import { Platform } from 'react-native';

let _resultsHistory = [];
let _selectedResult = null;

// Initialize history from localStorage if on Web
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
  try {
    const savedHistory = window.localStorage.getItem('actionflow_history');
    if (savedHistory) {
      _resultsHistory = JSON.parse(savedHistory);
    }
    const savedSelected = window.localStorage.getItem('actionflow_selected_result');
    if (savedSelected) {
      _selectedResult = JSON.parse(savedSelected);
    }
  } catch (e) {
    console.warn('Failed to load store data from localStorage:', e);
  }
}

export function getResultsHistory() {
  return _resultsHistory;
}

export function getSelectedResult() {
  if (!_selectedResult && _resultsHistory.length > 0) {
    return _resultsHistory[0].data; // Fallback to latest run payload
  }
  return _selectedResult;
}

export function setSelectedResult(result) {
  _selectedResult = result;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('actionflow_selected_result', JSON.stringify(result));
    } catch (e) {}
  }
}

export function addResultToHistory(data) {
  if (!data) return;

  // Add unique id and human-readable metadata
  const id = 'run_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  const timestamp = new Date().toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Create a nice display title
  const domain = data.contentParsing?.context?.domain || '';
  const firstAction = data.actions?.actions?.[0]?.title || '';
  const title = domain 
    ? `${domain.charAt(0).toUpperCase() + domain.slice(1)} Audit` 
    : (firstAction ? `${firstAction}` : 'Custom Business Audit');
  
  const icon = domain.toLowerCase().includes('sales') ? '💰' :
               domain.toLowerCase().includes('hr') || domain.toLowerCase().includes('employee') ? '👥' :
               domain.toLowerCase().includes('customer') ? '🤝' : '📄';

  const entry = {
    id,
    timestamp,
    title,
    icon,
    actionsCount: data.actions?.actions?.length || 0,
    riskScore: data.impactAnalysis?.overallRiskScore || 0,
    data: data // Hold full payload
  };

  // Push to history and keep last 15 items
  _resultsHistory = [entry, ..._resultsHistory].slice(0, 15);
  _selectedResult = data;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('actionflow_history', JSON.stringify(_resultsHistory));
      window.localStorage.setItem('actionflow_selected_result', JSON.stringify(data));
    } catch (e) {}
  }
}

// Retain backward-compatible functions
export function setResult(data) {
  addResultToHistory(data);
}

export function getResult() {
  return getSelectedResult();
}

export function clearResult() {
  _resultsHistory = [];
  _selectedResult = null;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('actionflow_history');
      window.localStorage.removeItem('actionflow_selected_result');
    } catch (e) {}
  }
}
