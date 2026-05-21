import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
dotenv.config();

const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
const hasGcpCredentials = existsSync(adcPath) || !!process.env.K_SERVICE;

let agentLog = null;

if (hasGcpCredentials) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
  }
  try {
    const { Logging } = await import('@google-cloud/logging');
    const logging = new Logging({
      projectId: process.env.GCP_PROJECT_ID || 'turing-lyceum-496405-e0',
    });
    agentLog = logging.log('actionflow-agent-traces');
    console.log('✅ Cloud Logging initialized');
  } catch (error) {
    console.warn('⚠️ Cloud Logging init failed:', error.message);
  }
} else {
  console.log('ℹ️ Cloud Logging skipped (run: gcloud auth application-default login)');
}

export async function logAgentTrace(pipelineId, stage, data) {
  const entry = {
    pipelineId, stage,
    timestamp: new Date().toISOString(),
    ...data,
  };

  console.log(`[TRACE] ${pipelineId} | ${stage} |`, JSON.stringify(data).substring(0, 200));

  if (!agentLog) return entry;

  try {
    const metadata = {
      resource: { type: 'global' },
      severity: data.status === 'error' ? 'ERROR' : 'INFO',
      labels: { pipeline_id: pipelineId, stage, agent: data.agent || stage },
    };
    await agentLog.write(agentLog.entry(metadata, entry));
  } catch {
    // Never crash pipeline for logging
  }

  return entry;
}

export async function logPipelineResult(pipelineId, result) {
  return logAgentTrace(pipelineId, 'pipeline_complete', {
    status: 'completed',
    totalStages: 5,
    duration: result.pipeline?.totalDuration,
    insightCount: result.insights?.insights?.length || 0,
    actionCount: result.actions?.actions?.length || 0,
    simulationSuccess: result.simulation?.summary?.successful || 0,
  });
}

export async function getRecentLogs(limit = 50) {
  if (!agentLog) return [];
  try {
    const { Logging } = await import('@google-cloud/logging');
    const logging = new Logging({ projectId: process.env.GCP_PROJECT_ID });
    const [entries] = await logging.getEntries({
      filter: `logName="projects/${process.env.GCP_PROJECT_ID}/logs/actionflow-agent-traces"`,
      orderBy: 'timestamp desc',
      pageSize: limit,
    });
    return entries.map(e => ({
      timestamp: e.metadata.timestamp,
      severity: e.metadata.severity,
      stage: e.metadata.labels?.stage,
      data: e.data,
    }));
  } catch { return []; }
}

export default { logAgentTrace, logPipelineResult, getRecentLogs };
