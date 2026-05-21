import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
dotenv.config();

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'gen-lang-client-0495419444';
const REGION = process.env.GCP_REGION || 'us-central1';
const isCloudRun = !!process.env.K_SERVICE;

const adcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
const hasADC = existsSync(adcPath);

let ai;

if (isCloudRun) {
  // On Cloud Run, the default compute service account provides ADC automatically
  // via the metadata server — no key file needed.
  process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;
  process.env.GOOGLE_CLOUD_LOCATION = REGION;
  ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: REGION,
  });
  console.log(`✅ Gemini initialized via Cloud Run ADC (project: ${PROJECT_ID}, region: ${REGION})`);
} else if (process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;
  process.env.GOOGLE_CLOUD_LOCATION = REGION;
  ai = new GoogleGenAI({
    vertexai: true,
    apiKey: process.env.GEMINI_API_KEY,
  });
  console.log(`✅ Gemini initialized via Vertex AI Express Mode (project: ${PROJECT_ID})`);
} else if (hasADC) {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;
  }
  ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: REGION,
  });
  console.log(`✅ Gemini initialized via Vertex AI ADC (project: ${PROJECT_ID})`);
} else {
  console.error('❌ No Gemini credentials! Set GEMINI_API_KEY or run: gcloud auth application-default login');
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [3000, 6000, 12000];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call Gemini expecting JSON output. Includes retry with backoff.
 */
export async function callGemini(systemPrompt, userPrompt, model = 'gemini-2.5-flash') {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] || 12000;
        console.log(`🔄 Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
        await sleep(delay);
      }

      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const text = response.text;
      try {
        return JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
        return { rawResponse: text };
      }
    } catch (error) {
      lastError = error;
      const msg = error.message || String(error);
      const isRetryable = /503|429|UNAVAILABLE|high demand|overloaded|RESOURCE_EXHAUSTED|fetch failed|TypeError|network/i.test(msg);

      if (isRetryable && attempt < MAX_RETRIES) {
        console.warn(`⚠️ Gemini temporary error (attempt ${attempt + 1}): ${msg.substring(0, 120)}`);
        continue;
      }
      console.error(`❌ Gemini error (final): ${msg.substring(0, 200)}`);
      throw new Error(`Gemini API call failed: ${msg}`);
    }
  }
  throw new Error(`Gemini API failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

/**
 * Call Gemini for plain text response. Includes retry.
 */
export async function callGeminiText(systemPrompt, userPrompt, model = 'gemini-2.5-flash') {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1] || 12000);
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: { systemInstruction: systemPrompt, temperature: 0.7 },
      });
      return response.text;
    } catch (error) {
      lastError = error;
      const msg = error.message || String(error);
      if (/503|429|UNAVAILABLE|high demand|fetch failed|TypeError|network/i.test(msg) && attempt < MAX_RETRIES) continue;
      throw new Error(`Gemini API call failed: ${msg}`);
    }
  }
  throw new Error(`Gemini API failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

export { ai };
export default { callGemini, callGeminiText, ai };
