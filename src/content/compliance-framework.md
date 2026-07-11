# OpenCare Platform — NDIS Compliance Framework

**Document version:** 1.0  
**Prepared for:** Independent NDIS Quality & Safeguards Auditor  
**Effective date:** 2026-07-11  

---

## 1. NDIS Worker Screening Check (NDISWC) Hard-Lock

### Requirement
Under the NDIS (Supports for Participants) Rules 2013 and the NDIS Worker Screening Act 2020, registered NDIS providers must only engage workers who hold a current NDIS Worker Screening clearance.

### Platform Enforcement

**Data model** (`src/lib/dataStore.ts`)

```typescript
ndiswcStatus: 'VERIFIED' | 'PENDING' | 'NOT_SUBMITTED'
```

Every worker record carries an `ndiswcStatus` field set at onboarding.

**Directory hard-lock** (`src/app/page.tsx`)

```typescript
const filtered = providers.filter(
  (p) =>
    p.ndiswcStatus === 'VERIFIED' &&  // mandatory — not user-toggleable
    p.category === category &&
    // ... additional user filters
);
```

Workers with `ndiswcStatus !== 'VERIFIED'` are **completely excluded** from the public directory array before any other filter runs. They cannot appear in search results and their booking links are never rendered.

**Booking trigger block:** Because unverified workers never appear in `filtered`, the `Book now` link leading to `/checkout` is structurally unreachable for those workers. No route-level bypass exists.

---

## 2. Transparent Pricing Model

### Fee Structure

| Side | Fee | Calculation |
|---|---|---|
| Participant pays | +5% on base rate | `baseRate × 1.05` |
| Worker receives | −7.5% from base rate | `baseRate × 0.925` |
| Platform total take | 12.5% blended | `participantCheckoutTotal − workerPayoutAmount` |

### Checkout Disclosure (`src/app/checkout/page.tsx`)

Every participant sees an itemised fee card before confirming a booking:

- **Base booking total** — hourly rate × session duration
- **You pay (+5% participant fee)** — exact dollar amount displayed
- **Worker receives (−7.5%)** — exact dollar amount displayed
- **OpenCare platform fee** — total shown with an expanded split:
  - Participant side (+5% on base): `+$X.XX`
  - Worker side (−7.5% of base): `−$X.XX`
  - Total blended take-rate: **12.5%**

No booking can be confirmed without the participant having viewed this breakdown on the same screen.

### Comparison Disclosure
A secondary panel on the checkout page shows the worker's OpenCare payout versus the equivalent agency model payout (agency retains 40%), making the fairness differential explicit to participants.

---

## 3. Role-Based Access Controls

| Role | Accessible routes | Blocked routes |
|---|---|---|
| Participant | `/`, `/checkout` | `/workers` (write), `/coordinator` |
| Support Worker | `/workers` | `/`, `/coordinator`, `/checkout` |
| Support Coordinator / Case Manager | `/coordinator` | `/`, `/workers`, `/checkout` |

Access is enforced via `useRouteGuard` on every protected page. Unauthenticated users are redirected to `/auth`. Incorrect roles are redirected to `/unauthorized`.

---

## 4. Budget Safeguard (Support Coordinator Dashboard)

**Location:** `src/app/coordinator/page.tsx`

The Support Coordinator Dashboard provides:

- **NDIS plan burn-rate tracking** per participant — remaining budget vs. plan end date
- **At-risk participant identification** — automatic flagging when projected spend exceeds remaining allocation before plan end
- **1-Click Budget Safeguard** — coordinator can pause all non-essential bookings for at-risk participants in a single action. On activation, participants, workers, and families are notified.

---

## 5. GPS Geofence Clock-In Verification

**Location:** `src/components/GeofenceMonitor.tsx`

- Workers must clock in within a 200-metre geofence of the participant's verified address
- GPS coordinates and verified address are logged against every shift (`DSShiftLog.gpsVerified`)
- Clock-in/clock-out timestamps are immutable once recorded
- Support Coordinators have read-only access to geofence data (`viewOnly` prop)

---

## 6. Shift Notes & Incident Logging

**Location:** `src/components/ShiftNotesExport.tsx`

- Shift notes are recorded per session with mood indicators: `positive`, `neutral`, `concern`
- Concern-flagged notes trigger a Support Coordinator notification
- Notes are exportable as a PDF report for NDIS plan review meetings
- All notes reference worker, participant, date, and service type for audit traceability

---

## 7. PII Masking Controls

**Location:** `src/components/DataMaskProvider.tsx`, `src/components/DataMaskToggle.tsx`

- Participant personally identifiable information (name, diagnosis, suburb) is masked by default in coordinator and worker views
- Coordinators may unmask PII via an explicit toggle; the unmask action is visible on-screen
- Masking is controlled at the React context level and applies consistently across all dashboard components

---

## 8. Safe Cancellation Protection

- Participants may cancel up to 24 hours before a shift without charge
- Cancellations inside the 24-hour window guarantee the worker a baseline fee of 1 hour at their agreed rate
- This policy is displayed on the checkout screen before booking confirmation and on the worker payout dashboard

---

## 9. Legal Consent & Onboarding Gate

**Location:** `src/components/LegalConsentModal.tsx`

- On first login, each role is presented with a role-specific service agreement before accessing any functional screen
- Participants accept client terms covering pricing, cancellation, and NDIS obligations
- Support Workers accept contractor terms covering payout structure, platform obligations, and client protections
- Support Coordinators / Case Managers accept compliance terms covering oversight responsibilities and NDIS obligations
- No dashboard route is accessible until consent is recorded in the session

---

*This document reflects the safeguards implemented in the OpenCare MVP codebase as of version 1.0. For technical queries, refer to the source files listed in each section.*
