FROM node:20-slim

# Required for Prisma + bcrypt native modules
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/main.js"]
