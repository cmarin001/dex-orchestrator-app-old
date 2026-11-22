FROM node:20.19.6-bookworm-slim@sha256:b342de02eb4a57cd6986290a69833d20818508db8078dba0197a024193410aee AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY public/ public/
COPY src/ src/
ARG VITE_EXPECTED_CYCLE_INTERVAL_MS=90000
ENV VITE_EXPECTED_CYCLE_INTERVAL_MS=${VITE_EXPECTED_CYCLE_INTERVAL_MS}
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
COPY deploy/container/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
