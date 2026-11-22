ARG BUILD_VERSION=dev
FROM node:20.19.6-bookworm-slim@sha256:b342de02eb4a57cd6986290a69833d20818508db8078dba0197a024193410aee AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY index.html tsconfig.json vite.config.ts ./
COPY public/ public/
COPY src/ src/
ARG VITE_DASHBOARD_AUTH_MODE=legacy
ENV VITE_DASHBOARD_AUTH_MODE=${VITE_DASHBOARD_AUTH_MODE}
ARG VITE_EXPECTED_CYCLE_INTERVAL_MS=90000
ENV VITE_EXPECTED_CYCLE_INTERVAL_MS=${VITE_EXPECTED_CYCLE_INTERVAL_MS}
RUN npm run build

FROM deps AS bff-build
COPY bff/ bff/
COPY tsconfig.json tsconfig.bff.json ./
RUN npm run build:bff && npm prune --omit=dev --no-audit --no-fund

FROM node:20.19.6-bookworm-slim@sha256:b342de02eb4a57cd6986290a69833d20818508db8078dba0197a024193410aee AS bff
ARG BUILD_VERSION
LABEL org.opencontainers.image.source="https://github.com/cmarin001/dex-orchestrator-app" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.revision="${BUILD_VERSION}"
WORKDIR /app
COPY --from=bff-build /app/dist-bff ./dist-bff
COPY --from=bff-build /app/node_modules ./node_modules
COPY package.json ./
USER node
CMD ["node", "dist-bff/index.js"]

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
ARG BUILD_VERSION
ARG VITE_DASHBOARD_AUTH_MODE=legacy
LABEL org.opencontainers.image.source="https://github.com/cmarin001/dex-orchestrator-app" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.revision="${BUILD_VERSION}" \
      io.tradekeel.auth-mode="${VITE_DASHBOARD_AUTH_MODE}"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
