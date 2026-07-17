# Codebase Audit & Implementation Plan

This plan documents a comprehensive security, safety-critical, and architectural audit of the SafeCommute codebase under **Murphy's Law** and **YAGNI (You Aren't Gonna Need It)**.

---

## 1. Codebase Ratings

### Murphy's Law Rating: 1 / 10 (Critical Failure)
> **"Anything that can go wrong will go wrong."**
> In a safety-critical application, a rating of 1 represents failures where the core safety features (emergency alerts, real-time location sharing, security handshake, OCR scanning, and data masking) are either completely mocked (fake), unimplemented, or pointing to non-existent API routes. If a passenger is in danger, the app will fail silently.

### YAGNI Rating: 4 / 10 (Moderate Bloat)
> **"You Aren't Gonna Need It."**
> The codebase contains entire folders and modules (Trusted Devices, Help & Support, Notifications settings) that are fully styled and written but completely unrouted. Clicking them in the UI results in broken redirects, causing confusion. The backend model `EncryptionKey` is defined but entirely bypassed in favor of simple env variables.

---

## 2. Key Audit Findings & Failure Modes

### Murphy's Law: Reliability & Safety Failures

| # | Component | Critical Issue | Murphy's Law Failure Mode |
|---|---|---|---|
| **1** | **Emergency Alert** | Frontend calls `/emergency/:tripId/trigger` but backend expects a two-step `initiate` and `verify` (via code) flow. | **Silent Failure in Danger:** User triggers alert, HTTP request 404s, and contacts are never notified. |
| **2** | **Location Tracking** | `useTripSocket` is defined in the frontend but never imported or called in `ActiveTripScreen.tsx`. | **Blind Tracking:** The passenger sees themselves moving on the map, but no GPS coordinates are sent to the server. |
| **3** | **Contact Tracking Map** | `ShareTrackingPage.tsx` does not render a map or request location updates. | **Static Tracking:** The trusted contact sees only a static card of details instead of the passenger's live movement. |
| **4** | **OCR Scanner** | Frontend `LicensePlateCaptureScreen.tsx` mocks the OCR camera scan by using `setTimeout` and hardcoding the license plate `LND-582-FK`. | **Spoofed Vehicle Details:** If a passenger is abducted in a vehicle with plate `XYZ-123-GP`, the app reports the dummy `LND-582-FK` to the family. |
| **5** | **Auth Logout** | Logout button only resets local React state. Cookies `sb-access-token` and `sb-refresh-token` are not cleared, and no `/auth/logout` API exists. | **Session Hijacking:** On page refresh, the user is logged right back in. Anyone accessing the device remains logged in. |
| **6** | **Socket Security** | Sockets handler in `trip.socket.ts` only checks if `sb-access-token=` is present but never validates the JWT payload. | **Eavesdropping:** Attackers can connect with fake tokens, join any trip room, and track any passenger. |
| **7** | **Signature Bypass** | `trip.socket.ts` checks the HMAC signature only if `data.signature` is provided. | **Spoofing Bypass:** Attackers omit the signature to bypass checks and spoof trip locations. |
| **8** | **Database Persistence** | Sockets emit location updates to rooms but never write to the `trip_locations` DB table. | **Loss of History:** If a tracking page is refreshed, the contact gets no history of where the user has been. |
| **9** | **User Name in SMS** | `TripService.createTrip` uses the raw user UUID as the notification sender name. | **Anonymous SMS:** The contact receives a WhatsApp/SMS saying `"c0e25d2b-... is on a trip"` instead of `"Jessica is on a trip"`. |
| **10** | **Nigeria City Fallback** | GPS failures fallback to Lagos coordinates. | **Misleading Map:** A user in Port Harcourt with GPS issues is shown in Lagos, misdirecting emergency services. |
| **11** | **Contact Decryption** | `contacts.routes.ts` calls `maskPhone` directly on encrypted bytes. | **Corrupted Text:** The UI displays hex garbage like `iv:au***3ef2` as the contact's phone number. |
| **12** | **Blocking SMS Calls** | Starting a trip blocks on external SMS/WhatsApp HTTP requests without timeouts. | **Trip Creation Timeout:** Network issues with Africa's Talking or WhatsApp hang the start-trip action. |

---

### YAGNI's Law: Bloat & Unrouted Features

1. **Dead Frontend Feature Folders:**
   - `frontend/src/features/devices/` (`TrustedDevicesPage.tsx`)
   - `frontend/src/features/help/` (`HelpSupportPage.tsx`)
   - `frontend/src/features/notifications/` (`NotificationSettingsPage.tsx`, `NotificationsPage.tsx`, `NotificationsScreen.tsx`, `notificationStore.ts`)
   *Status:* Fully implemented but never imported or routed in `App.tsx`. Profile screen buttons lead to them, causing broken redirects back to the dashboard/signup.
2. **Dead Backend Model:**
   - `EncryptionKey` database model is declared but never imported or used by `EncryptionService.ts`, which instead relies on environment variables with insecure defaults.

---

## 3. Implementation Plan: Corrective Actions

We will address the findings in three distinct phases:

### Phase 1: Security & Core Safety Fixes (High Priority)
*Objective: Make sure the emergency and location tracking systems actually work under pressure.*

1. **Fix Emergency Alert Flow:**
   - Update `ActiveTripScreen.tsx` to handle the two-step alert flow:
     - **Step 1:** Call `/api/v1/emergency/:tripId/initiate` to receive a confirmation code.
     - **Step 2:** Open a verification code modal where the user types the code sent to their phone (or displays the dev code `123456` in development).
     - **Step 3:** Call `/api/v1/emergency/:tripId/verify` with the code to trigger the emergency.
2. **Wire Up Real-Time Socket Updates:**
   - Import and use `useTripSocket` inside `ActiveTripScreen.tsx`.
   - On start, call `joinTrip(tripId)`.
   - Whenever `useLocation` emits new coordinates, call `sendLocation` (which is already rate-limited to 10s).
   - Ensure location updates are signed with HMAC.
3. **Add Map & Live Updates to Share Tracking Page:**
   - Update `ShareTrackingPage.tsx` to include Leaflet maps (matching `ActiveTripScreen`).
   - Use `useTripSocket` in `ShareTrackingPage.tsx` to join the room `tripId` and listen to `location:updated` events to move the marker in real time.
   - Fetch historical coordinates from `/api/v1/share/:share_token/locations` on mount to draw the polyline path.
4. **Fix Socket Security & Signature Verification:**
   - Update `trip.socket.ts` to verify the JWT cookie against Supabase Auth (extracting user ID) during handshake.
   - Enforce that `data.signature` is **required** and verified via HMAC. Rejections must disconnect the socket.
   - Authorize that the connected user owns the trip (or is the designated contact) before allowing them to join the room.
5. **Persist Location Updates in Database:**
   - Update `trip.socket.ts` to write incoming coordinates to the `trip_locations` table before broadcasting.

---

### Phase 2: User Experience & Encryption Fixes (Medium Priority)
*Objective: Secure user data and eliminate bugs on critical user paths.*

1. **Implement Secure Logout Route:**
   - Add a `POST /api/v1/auth/logout` endpoint in the backend that clears `sb-access-token` and `sb-refresh-token` cookies.
   - Update `AuthContext.tsx` to make an API post call to `/auth/logout` on logout before clearing the React state.
2. **Fix Contact Phone Decryption & Masking:**
   - Update `contacts.routes.ts` to decrypt the contact's phone number using `EncryptionService.decryptPhone` before passing it to `maskPhone`.
   - Update the success confirmation screen as requested in `rough.md`: display the phone number in full for the user's reference.
3. **Fix Notification Sender Name (UUID issue):**
   - Update `authenticate.ts` to extract `user_metadata.name` from the Supabase JWT payload and append it to `req.user.name`.
   - Update `TripService.createTrip` to use `req.user.name` (or `user_metadata.name`) instead of the raw UUID when sending notifications.
4. **Optimize Nominatim Client-Side Geocoding:**
   - Add a timeout wrapper (e.g. 5 seconds) to Nominatim fetch calls so they don't block indefinitely on poor network connections.
   - Improve city geolocation fallbacks to use the user's last known location instead of always defaulting to Lagos.
5. **Implement True OCR Flow:**
   - Replace the fake `setTimeout` mock in `LicensePlateCaptureScreen.tsx` with:
     - Client-side OCR using Tesseract.js (already mentioned in rules).
     - If confidence is < 80%, send the base64 image to `/api/v1/ocr/scan-plate` (Google Vision) as fallback.
     - Keep the manual input fallback if OCR fails after retries.

---

### Phase 3: YAGNI Clean-Up & Styling Fixes (Low Priority)
*Objective: Remove dead features, clean up code bloat, and fix design tokens.*

1. **Remove or Integrate Unrouted Features:**
   - **Option A (Cleanup):** Delete the unrouted folders `devices`, `help`, and `notifications` from the frontend, and remove their navigation items from the `ProfileScreen.tsx` to avoid dead links.
   - **Option B (Implement):** Register these routes properly in `App.tsx` and ensure backend hooks exist.
   - *(Recommendation: Option A, since they represent unimplemented bloat not currently specified in the core product flow).*
2. **Clean Up `EncryptionKey` Model:**
   - Refactor `EncryptionService` to fetch/rotate keys from the `encryption_keys` table using AWS/GCP KMS, or remove the unused database model if simple static envelope encryption is the final decision.
3. **Fix Design Tokens Violations:**
   - Replace the red color `#DC2626` in `TrustedDevicesPage` and `ProfileScreen` (Logout button) with `Gray 700` as specified in design tokens (red is strictly reserved for the emergency alert button).
   - Change the green pulse dot in `ActiveTripScreen` (`#059669`) to brand teal (`#0891B2`).

---

## 4. Verification Plan

### Automated Tests
- Run backend unit and integration tests:
  ```powershell
  npm --prefix backend run test
  ```
- Run frontend test suite:
  ```powershell
  npm --prefix frontend run test
  ```
- Write new tests verifying:
  - CSRF rejection on logout/emergency alert paths.
  - JWT token verification on WebSocket handshakes.
  - Correct masking and decryption of contact phone numbers.

### Manual Verification
1. Log in, click "Logout", refresh page, verify that the login page renders (confirming cookies are cleared).
2. Start a trip, simulate location updates, verify they are stored in the database.
3. Open the share track URL in a separate browser tab, verify that leafmap renders and updates dynamically.
4. Trigger emergency alert, verify that the verification OTP modal is shown, type correct/incorrect codes, and verify the alert state is triggered.
