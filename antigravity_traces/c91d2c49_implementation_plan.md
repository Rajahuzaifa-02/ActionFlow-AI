# Implementation Plan — Responsive & Premium Mobile App

Make the ActionFlow AI mobile application highly responsive, visually stunning (premium glassmorphic styling), and 100% crash-proof across all target devices (Web, iOS, Android).

## User Review Required

> [!IMPORTANT]
> - **Removal of Native Window Listeners**: We are replacing the custom `window.addEventListener('resize')` logic inside `index.jsx` with the official Expo / React Native `useWindowDimensions()` hook. The previous implementation crashes on native iOS/Android devices because `window.addEventListener` is not a valid function in a pure React Native environment.
> - **Auto-Navigation on Mobile**: On standard phone/portrait viewports, the execution logs and results stack extremely far down the screen. We plan to automatically transition the view to the dedicated `/results` route once agent execution completes, making the mobile UX feel organic and immersive.

## Proposed Changes

### Mobile Client Component

---

#### [MODIFY] [index.jsx](file:///d:/AISeekho2026/google-hackathon/google-hackathon/mobile/app/index.jsx)

- **Import `useWindowDimensions` & `router`**: Ensure standard react-native and expo-router tools are imported.
- **Remove crashing event listener**: Swap out the manual window resize listener that crashes native mobile runtimes.
- **Implement Responsive Metrics**:
  - `isLargeScreen = width > 768` (Tablet / Desktop mode)
  - `isSmallScreen = width < 380` (Compact Phone mode like iPhone SE)
- **Implement Connection Status Bar**: Render the currently unrendered `mobileStatusBar` based on the API health check state (`connected`).
- **Dynamic CSS & Element wrapping**:
  - Adjust header layout padding and stack badges vertically on screen sizes below `600px` to prevent overflow.
  - Dynamically resize tab bar text and margins on small phone viewports.
  - Dynamically calculate the column width of the `changesGrid` cards (`100%` on small phones, `47%` on regular mobile, and `31%` on tablets/desktop).
- **Active Navigation**:
  - Automatically route the user to `/results` on completion when `!isLargeScreen`.
  - Add a floating indicator or "View Results" shortcut button if latest results exist in the store.

#### [MODIFY] [results.jsx](file:///d:/AISeekho2026/google-hackathon/google-hackathon/mobile/app/results.jsx)

- **Import `useWindowDimensions`**: Enable dynamic responsiveness.
- **Responsive Font Sizing & Layouts**:
  - Adjust margins and font sizes for a more comfortable reading experience on small devices.
  - Make the `changesGrid` cards responsively wrap (1, 2, or 3 columns) based on viewport width.
  - Limit the cascading effect flow cards' width on narrow phones to avoid layout distortion.

## Verification Plan

### Automated Tests
- Build and run the Expo development server:
  ```bash
  npm run mobile
  ```
- Test responsiveness dynamically across multiple viewport widths (Web browser window resize) to verify fluid column snapping, font scaling, and tab squeezing.

### Manual Verification
- Verify the mobile status bar shows `Connected to ActionFlow Server` when backend is online.
- Perform a complete mock analysis run on a mobile viewport size and verify:
  1. The pipeline progress circles render nicely.
  2. The page automatically redirects to the dedicated results screen upon final step completion.
  3. The Before/After state change cards wrap properly instead of being squished.
