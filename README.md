
# 📝 Elist — Telegram Waitlist Bot

A Telegram bot for managing multiple waitlists inside community groups, built with **Telegraf**, **TypeScript**, **Prisma**, and **Vercel serverless functions**.

---

## 🚀 What It Does

- Admins can open named waitlists (e.g., for a product launch).
- Members can subscribe/unsubscribe via `/subscribe` and `/unsubscribe`.
- Admins can broadcast messages privately to all subscribers of a waitlist.
- The bot works entirely **inside Telegram**, using commands and DMs.
- Multiple waitlists can be managed **in a single group**.

---

## 🧠 Architecture Overview

| Layer         | Technology             | Purpose                                      |
|---------------|------------------------|----------------------------------------------|
| Telegram Bot  | [Telegraf](https://telegraf.js.org/) | Bot interface and command handling       |
| ORM           | [Prisma](https://www.prisma.io/)     | Database schema and querying              |
| Runtime       | [ts-node](https://typestrong.org/ts-node/) | Local dev via polling                     |
| DB            | PostgreSQL             | Persistent waitlist + subscriber storage     |
| Hosting       | [Vercel](https://vercel.com/)        | Production webhook hosting                  |

---

## 📁 Folder Structure

```
elist/
├── api/
│   └── webhook.ts         # Vercel serverless function entry (webhook)
├── prisma/
│   └── schema.prisma      # Prisma data model
├── src/
│   ├── bot.ts             # Bot setup and command logic
│   └── index.ts           # Local development entrypoint
├── .env                   # Secrets (BOT\_TOKEN, DATABASE\_URL)
├── tsconfig.json          # NodeNext TypeScript config
├── README.md              # This file
└── package.json           # Scripts and dependencies

````

---

## 🔐 Environment Variables

`.env` file contents:

```env
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_postgres_connection_string
````

---

## 💬 Available Bot Commands

| Command                       | Who Uses It     | What It Does                                             |
| ----------------------------- | --------------- | -------------------------------------------------------- |
| `/start`                      | Anyone          | Shows intro/help message                                 |
| `/ping`                       | Anyone          | Pings the bot to check if it's alive                     |
| `/openwaitlist <name>`        | Admins          | Opens a new waitlist for a given product in the group    |
| `/subscribe <name>`           | Anyone          | Subscribes the user to the given waitlist                |
| `/unsubscribe <name>`         | Anyone          | Unsubscribes the user from the given waitlist            |
| `/broadcast <name> <message>` | Admin (private) | Sends a private message to all subscribers of a waitlist |

---

## 🧑‍💻 Local Development

### Run the bot using polling:

```bash
pnpm install
pnpm run dev
```

This runs `src/index.ts` using `ts-node`, and launches the bot via polling.

---

## ☁️ Deploying to Vercel

The bot uses a **serverless webhook** for production on Vercel.

### `api/webhook.ts`

```ts
import { bot } from '../src/bot.js';

export default async function handler(req, res) {
  await bot.handleUpdate(req.body);
  res.status(200).send('ok');
}
```

### Set the Telegram webhook:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<your-vercel-app>.vercel.app/api/webhook"
```

You only need to do this once per deployed URL.

---

## 🧠 LLM Editing Guide

This repo is LLM-friendly. Follow these conventions:

### ✅ Edit Commands

All commands are defined like this in `src/bot.ts`:

```ts
bot.command('commandName', async (ctx) => { ... });
```

You can add new commands similarly. Use `ctx.chat`, `ctx.from`, `ctx.message.text` for context.

### ✅ Add Database Fields

1. Edit `prisma/schema.prisma`
2. Run:

   ```bash
   pnpm exec prisma migrate dev --name your_migration
   ```

### ✅ Use Telegram APIs

Send DMs:

```ts
ctx.telegram.sendMessage(userId, message);
```

---

## 🧼 Conventions

* ✅ ES Modules (`"type": "module"` + `.js` extensions)
* ✅ NodeNext resolution for compatibility
* ✅ Strict TypeScript mode
* ✅ Explicit command logic in one place

---

## ✅ Testing

| Feature              | Tested |
| -------------------- | ------ |
| `/start` welcome     | ✅      |
| `/ping` health check | ✅      |
| `/openwaitlist`      | ✅      |
| `/subscribe`         | ✅      |
| `/unsubscribe`       | ✅      |
| `/broadcast`         | ✅      |

---

## 💡 Future Improvements

* `/list` to view all available waitlists
* `/mywaitlists` to view a user’s joined lists
* Admin-only checks for `/broadcast`
* Reactions or inline buttons to join/leave

---

## 👥 Credits

Built by [Vansh Sahay](https://github.com/VanshSahay) \
Open to collaboration.