# OpenCare MVP Rules

## Product Overview
OpenCare is an NDIS support worker marketplace MVP focused on transparent pricing, trusted worker matching, and coordinator oversight.

## Core User Roles
1. Participant
   - Browses support workers.
   - Views transparent pricing before booking.
   - Books care sessions and checks out with clear fee breakdowns.

2. Support Worker
   - Lists an hourly rate.
   - Manages profile details and support traits.
   - Receives transparent payout calculations after each booking.

3. Support Coordinator
   - Manages multiple participants.
   - Tracks NDIS plan budget burn-rate and remaining balance.
   - Oversees bookings and support delivery progress.

## Marketplace Fee Logic
- Total blended take-rate: 12.5%
- Participant checkout cost: base hourly rate + 5%
- Support worker payout: base hourly rate - 7.5%
- Platform fee amount: 12.5% of the hourly rate, split across both sides

### Fee Calculation Rules
- participantCheckoutTotal = hourlyRate * 1.05
- workerPayoutAmount = hourlyRate * 0.925
- platformFeeAmount = participantCheckoutTotal - workerPayoutAmount

## MVP Screens
- Search and filter marketplace page
- Worker profile page with custom trait badges
- Transparent booking and checkout experience
- Coordinator dashboard with NDIS plan budget burn-rate tracking

## Data Model Expectations
- Users should be stored with role-based profiles.
- Bookings should retain participant, worker, coordinator, pricing, and status details.
- Budget tracking should be available for coordinator oversight and participant plan visibility.
