FROM node:20-slim AS build

WORKDIR /app

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
