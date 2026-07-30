FROM node:20-slim AS build

WORKDIR /app

# URL de l'API vue depuis le navigateur (hôte, pas le réseau Docker)
ARG VITE_API_BASE_URL=http://localhost:8001/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/package*.json ./
RUN npm install --force

COPY frontend/ ./
RUN npm run build

FROM node:20-slim
RUN npm install -g serve
WORKDIR /app
COPY --from=build /app/dist ./dist
EXPOSE 5174
CMD ["serve", "-s", "dist", "-l", "5174"]
