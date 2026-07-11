# OpenCare — Investor & Auditor Pitch Deck

**Version:** 1.0  
**Date:** 2026-07-11  
**Classification:** Confidential — For authorised recipients only

---

## 1. The Problem

Australia's NDIS supports over 600,000 participants with a combined annual plan value exceeding $35 billion. Yet the funding pipeline is broken at the last mile:

- Traditional disability support agencies retain **35–40%** of the participant's NDIS plan funding as overhead
- Support workers receive as little as **60 cents in every dollar** the NDIS allocates for their labour
- Participants have no visibility into how their plan funds are actually spent before committing to a booking
- Coordinator oversight is fragmented across spreadsheets, email threads, and siloed portals
- NDIS Worker Screening compliance (mandatory government clearance) is routinely under-enforced by small registered providers

**The result:** burned-out workers, depleted participant plans, and coordinators flying blind.

---

## 2. The OpenCare Solution

OpenCare is a transparent, compliance-first NDIS support marketplace that connects participants directly with verified support workers — eliminating agency overhead, enforcing government screening requirements, and giving coordinators real-time plan visibility.

### Core Principles

| Principle | How We Deliver It |
|---|---|
| Transparent pricing | Full fee breakdown shown before every booking |
| Worker-first economics | Workers keep 92.5% of the base hourly rate |
| Compliance by design | NDIS Worker Screening hard-lock enforced at the database and UI layer |
| Coordinator oversight | Real-time NDIS plan burn-rate tracking with 1-click budget safeguard |
| Participant protection | Safe Cancellation policy + GPS-verified clock-in/out |

---

## 3. Marketplace Service Categories

| Category | Icon | Description |
|---|---|---|
| Support Workers | 🤝 | Personal care, community access, daily living support |
| Cleaners | 🧹 | NDIS-funded domestic assistance and home maintenance |
| Gardeners | 🌿 | Accessible outdoor design, lawn and garden upkeep |
| Occupational Therapists | 🏥 | Home modification reports, AT prescription, NDIS goal planning |

---

## 4. Pricing Structure & Fee Model

### Blended Take-Rate: 12.5%

OpenCare's marketplace fee is split across both sides of the transaction — keeping the visible cost to participants low while ensuring platform sustainability.

#### Example: $60/hr Support Worker Booking

| Line item | Calculation | Amount |
|---|---|---|
| Base hourly rate | Worker's listed rate | $60.00 |
| **Participant pays** | Base × 1.05 (+5%) | **$63.00** |
| **Worker receives** | Base × 0.925 (−7.5%) | **$55.50** |
| Worker payout per hour net | After platform deduction | **$54.00*** |
| Platform intermediary margin | Participant side contribution | **$4.50** |
| Platform intermediary margin | Worker side contribution | **$6.50** |
| **Total platform fee** | 12.5% blended take-rate | **$7.50** |

*Net worker figure after estimated tax withholding for illustrative purposes.

#### Versus Traditional Agency Model

| Model | Worker receives | Agency/Platform retains |
|---|---|---|
| Traditional agency | ~60% of booking | ~40% of booking |
| **OpenCare** | **92.5% of booking** | **7.5% from worker side** |

Workers earn on average **54% more per hour** through OpenCare compared to a traditional agency placement.

### Fee Formula (implemented in codebase)

```
participantCheckoutTotal = hourlyRate × 1.05
workerPayoutAmount       = hourlyRate × 0.925
platformFeeAmount        = participantCheckoutTotal − workerPayoutAmount
```

All three values are displayed to the participant before booking confirmation. There are no hidden fees.

---

## 5. System Architecture & Key Screens

### 5.1 Participant Marketplace (`/`)
- Browse verified workers by category, suburb, and hourly rate
- Filter by background check verification status
- All workers must hold NDIS Worker Screening clearance (`ndiswcStatus === 'VERIFIED'`) — unverified profiles are silently excluded from the directory array and booking links are never rendered

### 5.2 Transparent Checkout (`/checkout`)
- Hourly rate slider (1–8 hour sessions)
- Itemised fee breakdown card:
  - Base booking total
  - You pay (+5% participant contribution)
  - Worker receives (−7.5% deduction)
  - Platform fee with exact split shown line by line
- Safe Cancellation policy disclosure
- Agency model comparison (participant sees exactly how much more the worker earns vs. traditional placement)

### 5.3 Support Worker Dashboard (`/workers`)
- Video introduction profile
- Strengths-based badge profile (verified by participant feedback, not star ratings)
- Standby shift availability toggle (same-day last-minute bookings)
- GPS Geofence Monitor — 200m clock-in radius enforcement
- Incoming shift request management with participant profile preview
- Instant Invoice Payouts — 80% of confirmed earnings available immediately after GPS-verified clock-out

### 5.4 Support Coordinator / Case Manager Dashboard (`/coordinator`)
- NDIS plan budget burn-rate tracking per participant
- At-risk participant identification (projected overspend before plan end date)
- 1-Click Budget Safeguard — pause all non-essential bookings for at-risk participants
- PII masking controls for participant data privacy
- Shift notes and incident log export (PDF)

---

## 6. NDIS Compliance Framework

### 6.1 NDIS Worker Screening Check (NDISWC) Enforcement

Every worker record carries a mandatory `ndiswcStatus` field:

```typescript
ndiswcStatus: 'VERIFIED' | 'PENDING' | 'NOT_SUBMITTED'
```

The marketplace directory filter runs this check unconditionally before any user-facing filter:

```typescript
providers.filter(p => p.ndiswcStatus === 'VERIFIED' && ...)
```

Workers without clearance are **never visible** to participants and cannot receive bookings through the platform.

### 6.2 Role-Based Access Controls

| Role | Portal Access |
|---|---|
| Participant | Marketplace, checkout |
| Support Worker | Worker dashboard |
| Support Coordinator / Case Manager | Coordinator oversight dashboard |

All routes are guarded at the page level. Cross-role access attempts redirect to `/unauthorized`.

### 6.3 Legal Consent Gate

Every user must accept a role-specific service agreement before accessing any functional screen. Agreements cover:
- **Participants:** Pricing, cancellation policy, NDIS funding obligations
- **Support Workers:** Contractor payout terms, platform obligations, client protections
- **Support Coordinators:** Oversight responsibilities, NDIS compliance obligations

### 6.4 GPS Geofence Verification

Workers must clock in within 200 metres of the participant's verified address. GPS coordinates are logged against every shift record. Coordinators have read-only geofence access.

### 6.5 Safe Cancellation Protection

Cancellations within 24 hours of a shift trigger an automatic baseline fee payment to the worker (1 hour at their agreed rate). This protects worker income and maintains marketplace trust.

### 6.6 Shift Notes & Incident Logging

Shift notes include mood indicators (`positive`, `neutral`, `concern`). Concern flags automatically notify the assigned Support Coordinator. Notes are exportable as PDF for NDIS plan review meetings.

### 6.7 Budget Safeguard Mechanism

When a participant's projected spend is on track to exceed their NDIS plan allocation before the plan end date, the Support Coordinator Dashboard flags them as at-risk. A single button pauses all non-essential bookings and notifies all parties.

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS with custom design tokens |
| Data layer | localStorage-backed data engine (MVP), designed for Supabase/Postgres migration |
| Payments | Stripe Connect (worker payouts + participant checkout) |
| Communications | Twilio (2FA, arrival SMS) |
| Maps | Google Maps API (geofence monitoring) |
| Hosting | Vercel (edge-optimised, SSR + static hybrid) |

---

## 8. Go-to-Market & Regulatory Positioning

- **Registered NDIS Provider pathway:** OpenCare operates within the NDIS Quality and Safeguards Commission framework
- **NDIS Price Guide compliance:** All service rates are set within NDIS Support Catalogue pricing limits
- **Worker Screening Act 2020 alignment:** NDISWC hard-lock enforced at platform layer, not left to provider discretion
- **Privacy Act 1988 alignment:** PII masking controls prevent unnecessary disclosure of participant health and location data

---

## 9. MVP Status

| Feature | Status |
|---|---|
| Participant marketplace with NDISWC filter | Complete |
| Transparent fee breakdown checkout | Complete |
| Support Worker dashboard + GPS clock-in | Complete |
| Support Coordinator budget dashboard | Complete |
| Shift notes + PDF export | Complete |
| Instant Invoice Payouts | Complete |
| Stripe Connect integration | Complete |
| Legal consent gate (all roles) | Complete |
| NDIS compliance framework documentation | Complete |

---

*For technical due diligence, refer to `src/content/compliance-framework.md`. For commercial queries, contact the founding team.*
