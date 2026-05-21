/**
 * Mock Dashboard Service
 * Simulates a business intelligence dashboard with KPIs and metrics.
 */

let dashboardState = getDefaultState();

function getDefaultState() {
  return {
    kpis: {
      totalRevenue: { value: 2750000, unit: 'PKR', trend: 'declining', change: -8.5 },
      activeCustomers: { value: 156, unit: 'count', trend: 'stable', change: -2.1 },
      orderVolume: { value: 1243, unit: 'orders', trend: 'declining', change: -15.3 },
      avgOrderValue: { value: 22120, unit: 'PKR', trend: 'stable', change: 1.2 },
      customerSatisfaction: { value: 4.2, unit: 'rating', trend: 'declining', change: -0.3 },
      deliveryCost: { value: 350, unit: 'PKR/order', trend: 'stable', change: 0 },
    },
    alerts: [
      { id: 'ALT001', severity: 'warning', message: 'Revenue declining in Lahore region', timestamp: '2026-05-10T08:00:00Z', acknowledged: false },
      { id: 'ALT002', severity: 'info', message: 'New customer onboarding rate below target', timestamp: '2026-05-11T10:30:00Z', acknowledged: false },
    ],
    widgets: [
      { id: 'W001', type: 'chart', title: 'Revenue by Region', data: { Lahore: 850000, Karachi: 920000, Islamabad: 580000, Peshawar: 400000 } },
      { id: 'W002', type: 'chart', title: 'Monthly Orders', data: { Jan: 1450, Feb: 1380, Mar: 1320, Apr: 1243 } },
      { id: 'W003', type: 'metric', title: 'Pipeline Health', data: { healthy: 60, warning: 25, critical: 15 } },
    ],
    updateLog: [],
  };
}

export function getState() {
  return JSON.parse(JSON.stringify(dashboardState));
}

export function resetState() {
  dashboardState = getDefaultState();
  return getState();
}

export function updateKPI(kpiName, updates) {
  if (dashboardState.kpis[kpiName]) {
    const before = { ...dashboardState.kpis[kpiName] };
    Object.assign(dashboardState.kpis[kpiName], updates);
    dashboardState.updateLog.push({
      type: 'kpi_update',
      kpi: kpiName,
      from: before,
      to: dashboardState.kpis[kpiName],
      timestamp: new Date().toISOString(),
    });
    return { success: true, before, after: dashboardState.kpis[kpiName] };
  }
  return { success: false, error: 'KPI not found' };
}

export function addAlert(alert) {
  const newAlert = {
    id: `ALT${String(dashboardState.alerts.length + 1).padStart(3, '0')}`,
    ...alert,
    timestamp: new Date().toISOString(),
    acknowledged: false,
  };
  dashboardState.alerts.push(newAlert);
  dashboardState.updateLog.push({
    type: 'alert_added',
    alert: newAlert,
    timestamp: new Date().toISOString(),
  });
  return { success: true, alert: newAlert };
}

export function updateWidget(widgetId, data) {
  const widget = dashboardState.widgets.find(w => w.id === widgetId);
  if (widget) {
    const before = { ...widget.data };
    widget.data = { ...widget.data, ...data };
    dashboardState.updateLog.push({
      type: 'widget_update',
      widgetId,
      from: before,
      to: widget.data,
      timestamp: new Date().toISOString(),
    });
    return { success: true, before, after: widget.data };
  }
  return { success: false, error: 'Widget not found' };
}

export function getUpdateLog() {
  return [...dashboardState.updateLog];
}

export default {
  getState,
  resetState,
  updateKPI,
  addAlert,
  updateWidget,
  getUpdateLog,
};
