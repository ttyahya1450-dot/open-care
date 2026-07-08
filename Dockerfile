# ── Stage 1: Install production dependencies ──────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Build Next.js standalone bundle ───────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_OUTPUT=standalone tells next.config.js to produce .next/standalone/
# which bundles server.js + required node_modules into a single deployable dir.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone
RUN npm run build

# ── Stage 3: Minimal production runner ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user — defence-in-depth for a healthcare data platform.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs
EXPOSE 3000

# Runtime secrets are injected via --env-file or orchestrator environment.
# Required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
# Optional: GOOGLE_MAPS_API_KEY (falls back to Haversine geofence)
CMD ["node", "server.js"]
