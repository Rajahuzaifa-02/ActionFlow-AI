# 🚀 ActionFlow AI

ActionFlow AI is an intelligent, multi-agent orchestration platform designed to analyze unstructured data (text, PDFs, URLs) and autonomously generate actionable business insights, assess impacts, formulate strategies, and even simulate API-driven actions.

This repository contains the complete stack:
- **Mobile Application:** A cross-platform React Native app (Expo).
- **Web Dashboard:** A React + Vite responsive web interface.
- **Backend Server:** An Express.js server featuring a multi-agent AI orchestrator powered by Google Gemini.

---

## 🏗️ Architecture Overview

The system is built on a modern, serverless, and highly scalable architecture:

1. **Frontend Layer (Web & Mobile):**
   - **Web:** React + Vite, utilizing Server-Sent Events (SSE) for real-time AI pipeline telemetry.
   - **Mobile:** React Native (Expo), providing a sleek, dark-mode mobile dashboard with a native `fetch` fallback for synchronous AI analysis.

2. **Backend Services (Node.js & Express):**
   - Serves as the central multi-agent orchestrator.
   - Handles file parsing (PDF/Images) and URL scraping.
   - Manages stateful simulation of generated actions.

3. **Multi-Agent Orchestrator (Google Gemini 2.5 Flash):**
   - **Content Parser:** Extracts structured entities and metadata from raw input.
   - **Insight Extractor:** Identifies key metrics, pain points, and trends.
   - **Impact Analyzer:** Computes risk probability and assesses systemic impacts.
   - **Action Generator:** Formulates strategic, step-by-step action plans.
   - **Simulation Agent:** Mocks execution flows against a simulated environment.

4. **Cloud Infrastructure (Google Cloud Platform):**
   - **Google Cloud Run:** Hosts the backend server for scalable, serverless execution.
   - **Application Default Credentials (ADC):** Provides secure, keyless authentication for Vertex AI/Gemini.
   - **Cloud Storage:** Handles secure document uploads.
   - **Cloud Logging:** Captures agent trace logs and execution metrics.

---

## 🛠️ Tools & APIs Used

### Core Technologies
- **Frontend:** React 19, Vite, React Native, Expo, EAS (Expo Application Services)
- **Backend:** Node.js, Express.js, Multer, `pdf-parse`
- **AI / LLM:** Google Gemini API (`gemini-2.5-flash`), Vertex AI SDK

### GCP Services
- Google Cloud Run
- Google Cloud Storage
- Google Cloud Logging
- Firebase Admin SDK

---

## 🤖 How Antigravity (AI Agent) Was Used

**Antigravity** (the autonomous agentic coding assistant) was heavily leveraged throughout the hackathon to rapidly prototype, debug, and finalize this application. Its involvement included:

1. **Full-Stack Implementation:** Generating the web dashboard UI, the React Native mobile screens, and building out the Node.js agentic orchestrator.
2. **UI/UX Polishing:** Antigravity independently restructured the dashboard to a mobile-friendly, tabbed horizontal layout using modern dark-mode aesthetics.
3. **Cloud DevOps & Debugging:** 
   - Antigravity deployed the backend to Google Cloud Run.
   - It autonomously debugged a critical authentication issue where the Google Auth Library crashed due to a missing local `service-account-key.json` file. Antigravity modified the codebase to utilize Cloud Run's native Metadata Server (ADC) dynamically.
4. **Mobile Build Support:** Guiding the transition from local development servers to production Cloud Run URLs and assisting with the EAS build process.

---

## 🕵️ Agent Trace / Logs from Antigravity

### 1. Workplan
- **Phase 1 (Foundation):** Scaffold the monorepo (Mobile, Web, Server). Set up Express.js and the Gemini multi-agent pipeline.
- **Phase 2 (Frontend):** Build a responsive web dashboard utilizing Server-Sent Events (SSE) to display AI thoughts and telemetry in real-time.
- **Phase 3 (Mobile):** Port the web experience to a native Expo app, implementing fallback synchronous endpoints since native React Native doesn't support SSE stream readers natively.
- **Phase 4 (Cloud Deployment):** Containerize the backend, deploy to Google Cloud Run, and configure Vertex AI credentials.
- **Phase 5 (Finalization):** Update mobile/web endpoints to production URLs and generate the final Android APK.

### 2. Tasks Plan & Reasoning Steps
- **Task:** *Implement PDF Uploading*
  - *Reasoning:* Users need to upload business reports. Standard text input isn't enough.
  - *Decision:* Use `multer` for memory buffering and `pdf-parse` for text extraction. Add a fallback to Gemini Multimodal OCR if the PDF is scanned or image-based.
- **Task:** *Real-time Pipeline Visualization*
  - *Reasoning:* Multi-agent LLM pipelines take 10-30 seconds. Users will bounce if there is no loading indicator.
  - *Decision:* Implement SSE (Server-Sent Events) on the backend. As each agent (Parser, Extractor, Analyzer) completes its task, stream a JSON event to the frontend to update a "Pipeline Telemetry" UI.
- **Task:** *Fixing Cloud Run Deployment Failure*
  - *Reasoning:* The `/api/analyze` endpoint returned `"Pipeline failed"` on production.
  - *Decision Flow:* Antigravity executed a `curl` test -> Read Cloud Run Logs via CLI -> Discovered an `ENOENT /root/.config` error from Google Auth Library -> Deduced that `dotenv` was aggressively injecting a local service account path -> Modified `index.js` to clear `GOOGLE_APPLICATION_CREDENTIALS` when `process.env.K_SERVICE` is detected -> Redeployed successfully.

### 3. Action Execution
- **Executed `gcloud run deploy`** to autonomously push the container to GCP.
- **Executed `eas build`** workflow support to generate the final APK.
- **Used `grep_search` and `replace_file_content`** to perform surgical code updates across the mobile and server codebases without breaking existing functionality.

---

## 📌 Assumptions

1. **Authentication:** The current system assumes an open (or optionally authenticated) internal tool environment. Firebase Auth is initialized but currently bypassable for demonstration purposes.
2. **File Size Limits:** PDF uploads are capped at 10MB to ensure stable processing within the serverless memory constraints.
3. **Execution Environment:** The mobile app assumes an Android environment (APK generated). Web app assumes a modern browser supporting SSE.
4. **API Simulation:** The final pipeline stage ("Action Simulation") currently mocks API interactions (e.g., "Mocking CRM Update") rather than hitting live third-party systems, ensuring the hackathon demo remains safe and self-contained.
