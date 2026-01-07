# беремо нормальний образ, не latest (latest = сюрпризи)
FROM node:20-alpine

# робоча директорія в контейнері
WORKDIR /app

# спочатку тільки залежності (для кешу)
COPY package*.json ./
RUN npm ci

# тепер код
COPY . .

# Build arg для client_id (передається під час docker build)
ARG VITE_DISCORD_CLIENT_ID
ENV VITE_DISCORD_CLIENT_ID=${VITE_DISCORD_CLIENT_ID}

# білд клієнта (Vite вбудовує VITE_* змінні в JS bundle)
RUN npm run build

# порт, який слухає app
EXPOSE 3000

# запуск
CMD ["npm", "start"]