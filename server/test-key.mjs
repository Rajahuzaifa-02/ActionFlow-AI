import { GoogleGenAI } from '@google/genai';

// Set project via env vars (not constructor) for Express Mode compatibility
process.env.GOOGLE_CLOUD_PROJECT = 'your-gcp-project-id';
process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';

const ai = new GoogleGenAI({
  vertexai: true,
  apiKey: process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE',
});

try {
  const r = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Say hello in exactly 5 words',
  });
  console.log('✅ SUCCESS:', r.text);
} catch (e) {
  console.log('❌ ERROR:', e.message.substring(0, 400));
}
