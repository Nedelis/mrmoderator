FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Подставляются в бандл на этапе сборки (import.meta.env.*)
ARG VITE_API_BASE=/api
ARG VITE_USE_API_MOCK=false
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_USE_API_MOCK=$VITE_USE_API_MOCK

RUN npm run build


FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
