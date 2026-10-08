FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --fetch-timeout=120000 --fetch-retries=2 --loglevel=info
COPY . .
ARG PORTAL=reader
RUN case "$PORTAL" in reader|librarian|admin) ;; *) exit 1 ;; esac \
    && npm run build:$PORTAL

FROM nginx:stable-alpine
ARG PORTAL=reader
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/${PORTAL}/ /usr/share/nginx/html/
EXPOSE 80

