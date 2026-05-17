# Root Dockerfile that delegates to backend/Dockerfile
FROM node:18-slim

# Tell Puppeteer to skip downloading its own Chromium - we will use the system one installed below
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install latest chrome dev package and fonts to support major charsets
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (production only, skip devDependencies, audits, and funds for speed)
RUN npm install --omit=dev --no-audit --no-fund

# Copy backend source code
COPY backend/ .

# Ensure port is set to 8080 as required by Cloud Run
ENV PORT=8080
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
