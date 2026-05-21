# Make Mobile (8081) Identical to Web (5173)

After a thorough line-by-line comparison of the web `App.jsx` (771 lines) and the mobile `index.jsx` (1156 lines), here are every difference found and the changes to achieve 100% parity.

## Key Differences Found

### 1. Real-Time Streaming vs Fake Animations (CRITICAL)
The **biggest behavioral difference** between the two apps:

| Feature | Web (5173) | Mobile (8081) |
|---------|-----------|---------------|
| API Endpoint | `/api/analyze` (SSE streaming) | `/api/analyze-sync` (waits for full result) |
| Pipeline Updates | Real-time — each agent stage fires as it runs | Fake — calls sync API, then fakes logs with `setInterval` |
| Trace Log | Shows actual agent timestamps & durations | Shows mock messages at 1.2s intervals |
| Pipeline Dots | Update live from real SSE events | Animated from fake timer |

> [!IMPORTANT]  
> **Fix**: Add `analyzeContentSSE()` to mobile's `api.js` that reads the SSE stream exactly like the web does. Replace the fake timer logic in `index.jsx` with real event-driven state updates.

### 2. Navigation Header Duplication
The mobile app shows **TWO headers** — Expo Router's built-in Stack header ("ActionFlow AI") PLUS the custom branded header inside the page. The web app has only ONE header.

> **Fix**: Hide the Expo Router Stack header for the index screen using `headerShown: false`.

### 3. Missing "Key Facts" Column in Content Parsing
The web shows 3 columns: **Entities**, **Metrics**, and **Key Facts**. The mobile shows Entities and Metrics but Key Facts rendering is inconsistent (styled differently).

### 4. Missing Pipeline Visualizer on Initial Load
The web shows the pipeline dots horizontally as soon as analysis starts. The mobile wraps it inside a separate card panel instead of rendering it inline.

### 5. Footer Differences
| Web Footer | Mobile Footer |
|-----------|--------------|
| "Built with **Google Antigravity** • Powered by Gemini 2.5 Flash" | Two separate lines |
| "☁️ GCP: Cloud Run • Firebase • Cloud Storage • Cloud Logging" | Missing GCP services text |

### 6. Mobile Connection Status Bar
The mobile has an extra "Server online/offline" status bar that the web doesn't show.

> **Fix**: Remove the status bar entirely to match the web. The health check can stay in the background.

## Proposed Changes

### API Service
#### [MODIFY] [api.js](file:///d:/AISeekho2026/google-hackathon/google-hackathon/mobile/services/api.js)
- Add `analyzeContentSSE(content, onEvent)` function that reads `/api/analyze` as an SSE stream using `fetch` + `ReadableStream`, exactly like the web's `api.js`.
- Keep `analyzeContentSync()` as fallback for native mobile (where ReadableStream may not work).

---

### Layout
#### [MODIFY] [_layout.jsx](file:///d:/AISeekho2026/google-hackathon/google-hackathon/mobile/app/_layout.jsx)
- Set `headerShown: false` on the index screen to eliminate duplicate header.
- Keep results screen header as-is (though we won't navigate there on desktop).

---

### Main Screen  
#### [MODIFY] [index.jsx](file:///d:/AISeekho2026/google-hackathon/google-hackathon/mobile/app/index.jsx)
- **Replace fake timer pipeline** with real SSE streaming from `analyzeContentSSE()`.
- **Remove "Server online" status bar** (not in web).
- **Fix Content Parsing view**: Add Key Facts column rendering.
- **Fix Footer**: Match web footer text exactly: one line "Built with Google Antigravity • Powered by Gemini 2.5 Flash", second line with GCP services.
- **Pipeline Visualizer**: Render identically to web — inline horizontal dots, not wrapped in a card.
- **Trace Log**: Show actual SSE events with timestamps and agent names.

## UI Improvement Suggestions

> [!TIP]
> These are optional enhancements I noticed could improve both apps:
> 1. **Confidence % label on insight cards** — Web shows confidence bar but the percentage text is inside meta tags, not adjacent. Both could show it inline next to the bar.
> 2. **Cascading Effects** — Web just shows text "Cascading: A → B → C". The mobile already has styled cascade nodes. Could upgrade the web to match the mobile's nicer cascade visualization.
> 3. **Before/After "Captured At" timestamp** — Web shows this, mobile doesn't. Should add.

## Verification Plan

### Automated Tests
- Open `http://localhost:8081/` in browser
- Confirm single header (no duplicate)
- Confirm no status bar
- Select "Regional Sales Decline", click Analyze
- Confirm pipeline dots animate in real-time (not delayed)
- Confirm trace log shows real agent events with durations
- Confirm all 6 result sections render identically to web
- Confirm footer matches exactly
