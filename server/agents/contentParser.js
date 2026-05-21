import { callGemini } from '../services/gemini.js';

/**
 * Agent 1: Content Parser
 * Parses unstructured input and extracts structured facts, entities, and metrics.
 */

const SYSTEM_PROMPT = `You are a Content Parser Agent — the first stage in an agentic AI pipeline.
Your role is to parse unstructured text input and extract structured information.

You MUST return a JSON object with this exact structure:
{
  "entities": [
    { "name": "string", "type": "person|organization|location|product|service", "context": "string" }
  ],
  "metrics": [
    { "name": "string", "value": "number or string", "unit": "string", "trend": "increasing|decreasing|stable|unknown", "context": "string" }
  ],
  "facts": [
    { "statement": "string", "confidence": 0.0-1.0, "category": "string" }
  ],
  "context": {
    "domain": "business|logistics|finance|policy|news|healthcare|technology|other",
    "timePeriod": "string or null",
    "sourceType": "report|article|news|dashboard|memo|other",
    "region": "string or null",
    "urgency": "critical|high|medium|low"
  },
  "summary": "A concise 2-3 sentence summary of the content"
}

Rules:
- Extract ALL quantitative data (percentages, amounts, counts, rates)
- Identify ALL named entities (companies, people, locations, products)
- State facts as clear, atomic statements
- Determine the domain and urgency level
- Be thorough — missing data means worse downstream analysis
- Do NOT add information not present in the input`;

export async function parseContent(rawText) {
  const startTime = Date.now();
  const trace = {
    agent: 'Content Parser',
    status: 'running',
    startTime: new Date().toISOString(),
    steps: [],
  };

  trace.steps.push({
    action: 'Receiving raw input',
    detail: `Input length: ${rawText.length} characters`,
    timestamp: new Date().toISOString(),
  });

  try {
    trace.steps.push({
      action: 'Calling Gemini for content analysis',
      detail: 'Using structured JSON extraction prompt',
      timestamp: new Date().toISOString(),
    });

    const result = await callGemini(SYSTEM_PROMPT, `Parse the following content and extract structured information:\n\n---\n${rawText}\n---`);

    trace.steps.push({
      action: 'Parsing complete',
      detail: `Extracted ${result.entities?.length || 0} entities, ${result.metrics?.length || 0} metrics, ${result.facts?.length || 0} facts`,
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

export default { parseContent };
