FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/
RUN cd backend && npm run build

EXPOSE 3000
CMD ["node", "backend/dist/app.js"]
