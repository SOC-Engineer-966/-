FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Build frontend
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend source
COPY backend/ ./backend/

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "backend/server.js"]
