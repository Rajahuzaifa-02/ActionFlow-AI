import { callGemini } from '../services/gemini.js';

/**
 * Agent 3: Impact Analyzer
 * Assesses real-world consequences and implications of each insight.
 */

const SYSTEM_PROMPT = `You are an Impact Analyzer Agent — the third stage in an agentic AI pipeline.
You receive insights and must assess their real-world impact and consequences.

You MUST return a JSON object with this exact structure:
{
  "impactAssessment": [
    {
      "insightId": "INS-001",
      "insightTitle": "string",
      "impacts": [
        {
          "area": "revenue|operations|customer_satisfaction|market_share|compliance|cost|reputation|workforce",
          "description": "Specific impact description",
          "severity": "critical|high|medium|low",
          "likelihood": 0.0-1.0,
          "timeframe": "immediate|short_term|medium_term|long_term",
          "quantifiedImpact": "e.g., PKR 500,000 revenue loss, 15% customer churn",
          "cascadingEffects": ["downstream effects"]
        }
      ],
      "riskLevel": "critical|high|medium|low",
      "urgency": "immediate|urgent|planned|monitor"
    }
  ],
  "overallRiskScore": 0-100,
  "criticalThreats": ["list of most critical threats"],
  "opportunities": ["list of potential opportunities identified"],
  "executiveSummary": "A concise paragraph for decision-makers explaining why this matters and what's at stake"
}

Rules:
- Be SPECIFIC about impacts — quantify wherever possible
- Consider cascading/downstream effects (e.g., revenue decline → workforce reduction → morale drop)
- Differentiate between immediate and long-term impacts
- Identify both threats AND opportunities
- The executive summary should be compelling and actionable
- Consider regional and industry context`;

export async function analyzeImpact(insights, parsedContent) {
  const startTime = Date.now();
  const trace = {
    agent: 'Impact Analyzer',
    status: 'running',
    startTime: new Date().toISOString(),
    steps: [],
  };

  trace.steps.push({
    action: 'Receiving insights for impact analysis',
    detail: `Analyzing ${insights.insights?.length || 0} insights`,
    timestamp: new Date().toISOString(),
  });

  try {
    trace.steps.push({
      action: 'Running impact assessment via Gemini',
      detail: 'Evaluating real-world consequences, risks, and opportunities',
      timestamp: new Date().toISOString(),
    });

    const result = await callGemini(
      SYSTEM_PROMPT,
      `Analyze the real-world impact of these insights:\n\nINSIGHTS:\n${JSON.stringify(insights, null, 2)}\n\nORIGINAL CONTEXT:\n${JSON.stringify(parsedContent.context, null, 2)}\n\nMETRICS:\n${JSON.stringify(parsedContent.metrics, null, 2)}`
    );

    trace.steps.push({
      action: 'Impact analysis complete',
      detail: `Risk score: ${result.overallRiskScore || 'N/A'}, Critical threats: ${result.criticalThreats?.length || 0}`,
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

export default { analyzeImpact };
