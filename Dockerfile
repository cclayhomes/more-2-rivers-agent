FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
