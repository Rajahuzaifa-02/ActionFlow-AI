import { callGemini } from '../services/gemini.js';

/**
 * Agent 2: Insight Extractor
 * Identifies meaningful patterns, anomalies, and non-obvious insights from structured data.
 */

const SYSTEM_PROMPT = `You are an Insight Extractor Agent — the second stage in an agentic AI pipeline.
You receive structured facts, entities, and metrics from the Content Parser.
Your role is to identify MEANINGFUL, NON-OBVIOUS insights — not just restate the facts.

You MUST return a JSON object with this exact structure:
{
  "insights": [
    {
      "id": "INS-001",
      "title": "Short insight title",
      "description": "Detailed explanation of the insight",
      "type": "trend|anomaly|correlation|risk|opportunity",
      "confidence": 0.0-1.0,
      "severity": "critical|high|medium|low",
      "supportingEvidence": ["fact or metric that supports this insight"],
      "affectedEntities": ["entity names affected"],
      "category": "revenue|operations|customer|market|compliance|cost"
    }
  ],
  "patterns": [
    {
      "name": "Pattern name",
      "description": "What pattern was detected",
      "dataPoints": ["supporting data points"]
    }
  ],
  "keyFindings": "A paragraph summarizing the most critical findings"
}

Rules:
- Go BEYOND summarization — find hidden patterns and correlations
- Rank insights by business impact and confidence
- Each insight must have supporting evidence from the input data
- Identify at least 2-3 insights, more if the data supports it
- Consider cross-entity relationships and cascading effects
- Flag anomalies that deviate from expected patterns`;

export async function extractInsights(parsedContent) {
  const startTime = Date.now();
  const trace = {
    agent: 'Insight Extractor',
    status: 'running',
    startTime: new Date().toISOString(),
    steps: [],
  };

  trace.steps.push({
    action: 'Analyzing parsed content',
    detail: `Processing ${parsedContent.entities?.length || 0} entities, ${parsedContent.metrics?.length || 0} metrics, ${parsedContent.facts?.length || 0} facts`,
    timestamp: new Date().toISOString(),
  });

  try {
    trace.steps.push({
      action: 'Running insight extraction via Gemini',
      detail: 'Looking for patterns, anomalies, and non-obvious correlations',
      timestamp: new Date().toISOString(),
    });

    const result = await callGemini(
      SYSTEM_PROMPT,
      `Analyze the following structured data and extract meaningful insights:\n\n${JSON.stringify(parsedContent, null, 2)}`
    );

    trace.steps.push({
      action: 'Insight extraction complete',
      detail: `Found ${result.insights?.length || 0} insights and ${result.patterns?.length || 0} patterns`,
      timestamp: new Date().toISOString(),
    });

    // Sort insights by severity
    if (result.insights) {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      result.insights.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));
    }

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

export default { extractInsights };
