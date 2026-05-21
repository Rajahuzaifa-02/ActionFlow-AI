import { callGemini } from '../services/gemini.js';

const SYSTEM_PROMPT = `You are an Action Generator Agent — the fourth stage in an agentic AI pipeline.
You receive impact analysis and must generate concrete, actionable recommendations.

AVAILABLE SIMULATION SERVICES:
1. CRM System — update customer status, add leads, create campaigns, update pipeline
2. Email/SMS Service — send emails, bulk emails, SMS, create drafts
3. Dashboard — update KPIs, add alerts, update widgets
4. Notification Engine — send notifications across channels
5. Pricing Engine — update product prices, add discount rules, bulk price changes
6. Campaign Manager — create marketing campaigns, set budgets, define audiences

Return JSON with structure:
{
  "actions": [
    {
      "id": "ACT-001",
      "title": "Short action title",
      "description": "Detailed description",
      "priority": "critical|high|medium|low",
      "type": "campaign|pricing|notification|crm_update|dashboard_update|email|process_change",
      "targetService": "crm|email|dashboard|notification|pricing|campaign",
      "expectedOutcome": "What this achieves",
      "estimatedImpact": "Quantified result",
      "timeline": "immediate|hours|days|weeks",
      "resources": ["resources needed"],
      "simulationParams": {
        "service": "which mock service",
        "method": "which method",
        "params": {}
      },
      "linkedInsightId": "INS-001",
      "riskOfInaction": "What happens if we don't do this"
    }
  ],
  "executionOrder": ["ACT-001", "ACT-002"],
  "totalEstimatedImpact": "Overall expected improvement",
  "actionSummary": "Paragraph explaining the action plan"
}

SimulationParams methods:
- CRM: addCampaign({name, type, region, discount}), updateCustomerStatus(customerId, status), addLead({company, region, score, value}), updatePipelineRegion(region, {trend, value})
- Email: sendBulkEmail({recipients, subject, body, templateId}), createDraft({subject, body, audience})
- Dashboard: updateKPI(kpiName, {value, trend, change}), addAlert({severity, message})
- Notification: sendBulkNotification({title, message, channels, priority})
- Pricing: updatePrice(productId, newPrice, reason), applyBulkPriceChange(category, changePercent, reason), addDiscountRule({name, threshold, discountPercent})
- Campaign: createCampaign({name, type, region, budget, duration, audience, discount})

Generate 2-5 concrete actions. Each MUST have valid simulationParams.`;

export async function generateActions(impactAnalysis, insights, parsedContent) {
  const startTime = Date.now();
  const trace = {
    agent: 'Action Generator',
    status: 'running',
    startTime: new Date().toISOString(),
    steps: [],
  };

  trace.steps.push({
    action: 'Processing impact analysis for action generation',
    detail: `Risk score: ${impactAnalysis.overallRiskScore || 'N/A'}`,
    timestamp: new Date().toISOString(),
  });

  try {
    trace.steps.push({
      action: 'Generating action recommendations via Gemini',
      detail: 'Creating executable action plans with simulation parameters',
      timestamp: new Date().toISOString(),
    });

    const result = await callGemini(
      SYSTEM_PROMPT,
      `Generate action recommendations:\n\nIMPACT:\n${JSON.stringify(impactAnalysis, null, 2)}\n\nINSIGHTS:\n${JSON.stringify(insights, null, 2)}\n\nCONTEXT:\n${JSON.stringify(parsedContent.context, null, 2)}`
    );

    trace.steps.push({
      action: 'Action generation complete',
      detail: `Generated ${result.actions?.length || 0} actions`,
      timestamp: new Date().toISOString(),
    });

    trace.status = 'complete';
    trace.duration = Date.now() - startTime;
    trace.output = result;

    return { result, trace };
  } catch (error) {
    trace.status = 'error';
    trace.error = error.message;
    trace.duration = Date.now() - startTime;
    throw { error, trace };
  }
}

export default { generateActions };
