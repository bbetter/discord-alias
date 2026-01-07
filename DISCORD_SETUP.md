# Discord Activity Setup Guide

## Покрокова інструкція налаштування Discord Activity

### 1. Отримайте Client Secret

1. Перейдіть на [Discord Developer Portal](https://discord.com/developers/applications/REMOVED_CLIENT_ID/information)
2. Оберіть вкладку **"OAuth2"** на сайдбарі
3. Під секцією "Client Secret" натисніть **"Reset Secret"** або скопіюйте існуючий
4. **Скопіюйте Client Secret** і додайте його в файл `.env`:
   ```
   DISCORD_CLIENT_SECRET=ваш_client_secret_тут
   ```

### 2. Налаштуйте Discord Activity

1. В Developer Portal перейдіть на вкладку **"Activities"**
2. Якщо Activity ще не активована:
   - Натисніть **"Enable Activity"**
   - Прочитайте та погодьтесь з умовами

### 3. Налаштуйте URL Mappings (для локального тестування)

Для тестування локально використовуйте Discord's proxy:

#### Опція А: Використання Cloudflared (рекомендовано)

1. Встановіть cloudflared:
   ```bash
   # Linux
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. Запустіть тунель:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. Скопіюйте згенерований URL (наприклад: `https://your-tunnel.trycloudflare.com`)

4. В Discord Developer Portal → Activities:
   - **Root Mapping**: Додайте згенерований URL
   - **Target**: `/`

#### Опція Б: Використання ngrok

1. Встановіть ngrok: https://ngrok.com/download
2. Запустіть:
   ```bash
   ngrok http 3000
   ```
3. Скопіюйте HTTPS URL
4. Додайте в Discord Developer Portal → Activities → URL Mappings

### 4. Запуск для тестування

#### Для локального тестування:

1. Запустіть проксі тунель (cloudflared або ngrok)
2. Запустіть сервер:
   ```bash
   npm run build  # Збірка клієнта
   npm start      # Запуск production сервера
   ```
3. В Discord:
   - Відкрийте будь-який голосовий канал
   - Натисніть на іконку "Activities" (ракета)
   - Оберіть вашу Activity зі списку

#### Для розробки з hot-reload:

```bash
npm run dev  # Запустить і клієнт (Vite) і сервер (nodemon)
```

Але для Discord потрібно використовувати production build на порту 3000.

### 5. OAuth2 Redirect URLs

В Discord Developer Portal → OAuth2 додайте:
- `http://localhost:3000` (для локального тестування)
- Ваш production URL (коли деплоїте)

### 6. Деплой на Production

Для production вам потрібен публічний HTTPS URL:

#### Рекомендовані платформи:

**Render.com (безкоштовно):**
1. Створіть акаунт на https://render.com
2. Створіть новий Web Service
3. Підключіть GitHub репозиторій
4. Налаштування:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables: додайте `VITE_DISCORD_CLIENT_ID` та `DISCORD_CLIENT_SECRET`

**Railway.app:**
1. Створіть акаунт на https://railway.app
2. New Project → Deploy from GitHub
3. Додайте environment variables
4. Railway автоматично виявить Node.js проект

**Heroku:**
```bash
heroku create your-app-name
git push heroku main
heroku config:set VITE_DISCORD_CLIENT_ID=your_id
heroku config:set DISCORD_CLIENT_SECRET=your_secret
```

### 7. Оновіть URL Mappings для Production

Після деплою:
1. Перейдіть в Discord Developer Portal → Activities
2. Оновіть URL Mappings на ваш production URL
3. Збережіть зміни

### 8. Тестування

1. Відкрийте Discord (desktop або web)
2. Зайдіть в голосовий канал
3. Натисніть Activities (іконка ракети)
4. Оберіть вашу гру
5. Гра відкриється в iframe всередині Discord!

### Troubleshooting

**Проблема**: "Failed to initialize discord sdk"
- **Рішення**: Переконайтесь що ви запускаєте гру ВСЕРЕДИНІ Discord, а не в звичайному браузері

**Проблема**: "Token exchange failed"
- **Рішення**: Перевірте що `DISCORD_CLIENT_SECRET` правильно вказаний в `.env`

**Проблема**: Гра не відкривається в Discord
- **Рішення**: Перевірте URL Mappings в Developer Portal

**Проблема**: CORS помилки
- **Рішення**: Переконайтесь що ваш сервер дозволяє CORS від Discord доменів

### Корисні посилання

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord Activities Documentation](https://discord.com/developers/docs/activities/overview)
- [Embedded App SDK Documentation](https://discord.com/developers/docs/developer-tools/embedded-app-sdk)
- [Discord Developers Server](https://discord.gg/discord-developers) - канал #activities-dev-help

## Наступні кроки

Після успішної інтеграції з Discord:
1. Додайте іконку та банер для Activity в Developer Portal
2. Додайте опис гри
3. Налаштуйте Age Rating та Content Rating
4. Запросіть друзів протестувати!
5. Коли готові - подайте на публікацію в Activity Store
