import mockCRM from '../services/mockCRM.js';
import mockEmail from '../services/mockEmail.js';
import mockDashboard from '../services/mockDashboard.js';
import mockNotification from '../services/mockNotification.js';
import mockPricing from '../services/mockPricing.js';
import mockCampaign from '../services/mockCampaign.js';

/**
 * Agent 5: Action Simulator
 * Executes recommended actions against mock services and captures state changes.
 */

const serviceMap = {
  crm: mockCRM,
  email: mockEmail,
  dashboard: mockDashboard,
  notification: mockNotification,
  pricing: mockPricing,
  campaign: mockCampaign,
};

function captureSystemState() {
  return {
    crm: mockCRM.getState(),
    email: mockEmail.getState(),
    dashboard: mockDashboard.getState(),
    notification: mockNotification.getState(),
    pricing: mockPricing.getState(),
    campaign: mockCampaign.getState(),
    capturedAt: new Date().toISOString(),
  };
}

export function resetAllServices() {
  Object.values(serviceMap).forEach(service => service.resetState());
}

export async function simulateActions(actions) {
  const startTime = Date.now();
  const trace = {
    agent: 'Action Simulator',
    status: 'running',
    startTime: new Date().toISOString(),
    steps: [],
  };

  // Reset all services to default state before simulation
  resetAllServices();

  // Capture BEFORE state
  const beforeState = captureSystemState();
  trace.steps.push({
    action: 'Captured BEFORE state',
    detail: 'All mock services state recorded',
    timestamp: new Date().toISOString(),
  });

  const executionResults = [];
  const actionsToExecute = actions.actions || [];
  const executionOrder = actions.executionOrder || actionsToExecute.map(a => a.id);

  for (const actionId of executionOrder) {
    const action = actionsToExecute.find(a => a.id === actionId);
    if (!action) continue;

    trace.steps.push({
      action: `Executing action: ${action.title}`,
      detail: `Service: ${action.targetService}, Priority: ${action.priority}`,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await executeAction(action);
      const params = action.simulationParams || {};
      const reqHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-antigravity-secure-token',
        'X-Requested-With': 'ActionFlowAISimulator'
      };
      const resHeaders = {
        'Content-Type': 'application/json',
        'X-Powered-By': 'ExpressJS-MockAPI',
        'X-Response-Time': `${Math.round(Math.random() * 60 + 15)}ms`
      };
      
      executionResults.push({
        actionId: action.id,
        actionTitle: action.title,
        status: 'success',
        service: params.service || action.targetService || 'unknown',
        method: params.method || 'execute',
        requestParams: params.params || {},
        requestHeaders: reqHeaders,
        responseHeaders: resHeaders,
        result: { ...result, service: params.service, method: params.method },
        timestamp: new Date().toISOString(),
      });

      trace.steps.push({
        action: `⚙️ API Request: POST /api/mock/${params.service || 'service'}/${params.method || 'execute'}`,
        detail: `Headers: ${JSON.stringify(reqHeaders)}\nBody: ${JSON.stringify(params.params || {})}`,
        timestamp: new Date().toISOString(),
      });
      trace.steps.push({
        action: `📥 API Response: 200 OK`,
        detail: `Headers: ${JSON.stringify(resHeaders)}\nBody: ${JSON.stringify(result)}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const params = action.simulationParams || {};
      const reqHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-antigravity-secure-token',
        'X-Requested-With': 'ActionFlowAISimulator'
      };
      const resHeaders = {
        'Content-Type': 'application/json',
        'X-Powered-By': 'ExpressJS-MockAPI'
      };

      executionResults.push({
        actionId: action.id,
        actionTitle: action.title,
        status: 'failed',
        service: params.service || action.targetService || 'unknown',
        method: params.method || 'execute',
        requestParams: params.params || {},
        requestHeaders: reqHeaders,
        responseHeaders: resHeaders,
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      });

      trace.steps.push({
        action: `⚙️ API Request: POST /api/mock/${params.service || 'service'}/${params.method || 'execute'}`,
        detail: `Headers: ${JSON.stringify(reqHeaders)}\nBody: ${JSON.stringify(params.params || {})}`,
        timestamp: new Date().toISOString(),
      });
      trace.steps.push({
        action: `❌ API Response: 500 Internal Server Error`,
        detail: error.message || String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Capture AFTER state
  const afterState = captureSystemState();
  trace.steps.push({
    action: 'Captured AFTER state',
    detail: 'All mock services state recorded post-execution',
    timestamp: new Date().toISOString(),
  });

  // Compute state changes
  const stateChanges = computeStateChanges(beforeState, afterState);

  trace.status = 'complete';
  trace.duration = Date.now() - startTime;

  const output = {
    beforeState,
    afterState,
    executionResults,
    stateChanges,
    summary: {
      totalActions: actionsToExecute.length,
      successful: executionResults.filter(r => r.status === 'success').length,
      failed: executionResults.filter(r => r.status === 'failed').length,
      duration: Date.now() - startTime,
    },
  };

  trace.output = output;
  return { result: output, trace };
}

async function executeAction(action) {
  const params = action.simulationParams;
  if (!params) {
    return { message: 'No simulation parameters provided', simulated: false };
  }

  const service = serviceMap[params.service];
  if (!service) {
    return { message: `Unknown service: ${params.service}`, simulated: false };
  }

  const method = service[params.method];
  if (!method) {
    // Try to find a reasonable fallback
    return executeFallback(params.service, action);
  }

  const p = params.params || {};

  // Handle methods that take multiple arguments vs single object
  if (params.method === 'updateCustomerStatus') {
    return method(p.customerId, p.status || p.newStatus);
  } else if (params.method === 'updatePipelineRegion') {
    return method(p.region, p.updates || p);
  } else if (params.method === 'updateKPI') {
    return method(p.kpiName || p.name, p.updates || p);
  } else if (params.method === 'updatePrice') {
    return method(p.productId, p.newPrice || p.price, p.reason);
  } else if (params.method === 'applyBulkPriceChange') {
    return method(p.category, p.changePercent, p.reason);
  } else if (params.method === 'updateWidget') {
    return method(p.widgetId, p.data);
  } else {
    return method(p);
  }
}

function executeFallback(serviceName, action) {
  switch (serviceName) {
    case 'campaign':
      return mockCampaign.createCampaign({
        name: action.title,
        type: action.type || 'promotional',
        region: 'all',
        budget: 200000,
        duration: 30,
        audience: { size: 5000, segment: 'targeted' },
      });
    case 'notification':
      return mockNotification.sendBulkNotification({
        title: action.title,
        message: action.description,
        channels: ['inApp', 'email'],
        priority: action.priority || 'normal',
      });
    case 'email':
      return mockEmail.createDraft({
        subject: action.title,
        body: action.description,
        audience: 'targeted_segment',
      });
    case 'dashboard':
      return mockDashboard.addAlert({
        severity: action.priority === 'critical' ? 'critical' : 'warning',
        message: action.title,
      });
    default:
      return { message: `Fallback executed for ${serviceName}`, action: action.title };
  }
}

function computeStateChanges(before, after) {
  const changes = [];

  // Check CRM changes
  if (after.crm.campaigns.length > before.crm.campaigns.length) {
    const newCampaigns = after.crm.campaigns.slice(before.crm.campaigns.length);
    changes.push({ service: 'CRM', type: 'campaigns_added', count: newCampaigns.length, details: newCampaigns });
  }
  if (after.crm.activities.length > before.crm.activities.length) {
    changes.push({ service: 'CRM', type: 'activities_logged', count: after.crm.activities.length - before.crm.activities.length });
  }

  // Check Email changes
  if (after.email.sentEmails.length > before.email.sentEmails.length) {
    changes.push({ service: 'Email', type: 'emails_sent', count: after.email.sentEmails.length - before.email.sentEmails.length });
  }
  if (after.email.drafts.length > before.email.drafts.length) {
    changes.push({ service: 'Email', type: 'drafts_created', count: after.email.drafts.length - before.email.drafts.length });
  }

  // Check Dashboard changes
  if (after.dashboard.alerts.length > before.dashboard.alerts.length) {
    changes.push({ service: 'Dashboard', type: 'alerts_added', count: after.dashboard.alerts.length - before.dashboard.alerts.length });
  }
  if (after.dashboard.updateLog.length > 0) {
    changes.push({ service: 'Dashboard', type: 'kpis_updated', count: after.dashboard.updateLog.length });
  }

  // Check Notification changes
  if (after.notification.notifications.length > before.notification.notifications.length) {
    changes.push({ service: 'Notifications', type: 'notifications_sent', count: after.notification.notifications.length - before.notification.notifications.length });
  }

  // Check Pricing changes
  if (after.pricing.priceHistory.length > before.pricing.priceHistory.length) {
    changes.push({ service: 'Pricing', type: 'prices_updated', count: after.pricing.priceHistory.length - before.pricing.priceHistory.length, details: after.pricing.priceHistory });
  }

  // Check Campaign changes
  if (after.campaign.campaigns.length > before.campaign.campaigns.length) {
    const newCamps = after.campaign.campaigns.slice(before.campaign.campaigns.length);
    changes.push({ service: 'Campaign Manager', type: 'campaigns_created', count: newCamps.length, details: newCamps });
  }

  return changes;
}

export default { simulateActions, resetAllServices };
