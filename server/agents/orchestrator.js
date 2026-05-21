import { parseContent } from './contentParser.js';
import { extractInsights } from './insightExtractor.js';
import { analyzeImpact } from './impactAnalyzer.js';
import { generateActions } from './actionGenerator.js';
import { simulateActions, resetAllServices } from './actionSimulator.js';
import { logAgentTrace, logPipelineResult } from '../services/cloudLogging.js';

/**
 * Orchestrator Agent
 * Coordinates the entire multi-agent pipeline, emits events at each stage,
 * and logs traces to Google Cloud Logging.
 */

export const cancelledPipelines = new Set();

export async function orchestrate(rawText, onEvent, pipelineId = `PIPE-${Date.now()}`) {
  const pipelineTrace = {
    id: pipelineId,
    startTime: new Date().toISOString(),
    stages: [],
    status: 'running',
  };

  const checkCancelled = () => {
    if (cancelledPipelines.has(pipelineId)) {
      throw new Error('Analysis stopped by user');
    }
  };

  const emit = (stage, status, data) => {
    const event = { stage, status, data, timestamp: new Date().toISOString() };
    pipelineTrace.stages.push(event);
    if (onEvent) onEvent(event);
    // Log to Cloud Logging (non-blocking)
    logAgentTrace(pipelineId, stage, { status, ...data }).catch(() => {});
  };

  try {
    // Stage 1: Content Parsing
    checkCancelled();
    emit('content_parsing', 'started', { message: 'Parsing unstructured content...', agent: 'Content Parser' });
    const parsed = await parseContent(rawText);
    checkCancelled();
    emit('content_parsing', 'completed', { trace: parsed.trace, result: parsed.result, agent: 'Content Parser' });

    // Stage 2: Insight Extraction
    checkCancelled();
    emit('insight_extraction', 'started', { message: 'Extracting meaningful insights...', agent: 'Insight Extractor' });
    const insights = await extractInsights(parsed.result);
    checkCancelled();
    emit('insight_extraction', 'completed', { trace: insights.trace, result: insights.result, agent: 'Insight Extractor' });

    // Stage 3: Impact Analysis
    checkCancelled();
    emit('impact_analysis', 'started', { message: 'Analyzing real-world impact...', agent: 'Impact Analyzer' });
    const impact = await analyzeImpact(insights.result, parsed.result);
    checkCancelled();
    emit('impact_analysis', 'completed', { trace: impact.trace, result: impact.result, agent: 'Impact Analyzer' });

    // Stage 4: Action Generation
    checkCancelled();
    emit('action_generation', 'started', { message: 'Generating recommended actions...', agent: 'Action Generator' });
    const actions = await generateActions(impact.result, insights.result, parsed.result);
    checkCancelled();
    emit('action_generation', 'completed', { trace: actions.trace, result: actions.result, agent: 'Action Generator' });

    // Stage 5: Action Simulation
    checkCancelled();
    emit('action_simulation', 'started', { message: 'Simulating action execution...', agent: 'Action Simulator' });
    const simulation = await simulateActions(actions.result);
    checkCancelled();
    emit('action_simulation', 'completed', { trace: simulation.trace, result: simulation.result, agent: 'Action Simulator' });

    // Pipeline complete
    pipelineTrace.status = 'complete';
    pipelineTrace.endTime = new Date().toISOString();
    pipelineTrace.totalDuration =
      new Date(pipelineTrace.endTime) - new Date(pipelineTrace.startTime);

    const finalResult = {
      pipeline: pipelineTrace,
      contentParsing: parsed.result,
      insights: insights.result,
      impactAnalysis: impact.result,
      actions: actions.result,
      simulation: simulation.result,
    };

    emit('pipeline', 'completed', { summary: 'All agents completed successfully' });

    // Log complete pipeline result to Cloud Logging (non-blocking)
    logPipelineResult(pipelineId, finalResult).catch(() => {});

    // Clean up cancellation map
    cancelledPipelines.delete(pipelineId);

    return finalResult;
  } catch (error) {
    pipelineTrace.status = 'error';
    pipelineTrace.error = error.message || error.error?.message || String(error);
    emit('pipeline', 'error', { error: pipelineTrace.error });
    cancelledPipelines.delete(pipelineId);
    throw error;
  }
}

export function resetSimulation() {
  resetAllServices();
}

export default { orchestrate, resetSimulation, cancelledPipelines };
