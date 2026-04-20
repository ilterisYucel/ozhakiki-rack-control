# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# package.json ve package-lock.json'u kopyala (root'tan)
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --omit=dev || npm install --omit=dev

# Geri kalan tüm dosyaları kopyala
COPY . .

# Build al
RUN npm run build

# Production stage
FROM nginx:alpine

# Nginx konfigürasyonunu kopyala
COPY deployment/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Build edilen dosyaları kopyala (dist klasörü)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]