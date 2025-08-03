
# 📝 Elist — Telegram Waitlist Bot

A powerful Telegram bot for managing multiple waitlists inside community groups, built with **Telegraf**, **TypeScript**, **Prisma**, and **Vercel serverless functions**.

---

## 🚀 What It Does

- **🔧 Admin Management**: Group admins can create and close waitlists for any user
- **👥 User Subscriptions**: Members can easily subscribe/unsubscribe from waitlists
- **📢 Private Broadcasting**: Waitlist owners broadcast messages via DM to keep groups clean
- **🏠 Chat Isolation**: Each group has completely separate waitlists and subscribers
- **🤖 Smart Context**: Commands behave differently in groups vs DMs for optimal UX
- **📊 Easy Tracking**: List all waitlists in a group or track personal subscriptions
- **🛡️ Secure**: Only authorized users can perform sensitive operations

---

## 🧠 Architecture Overview

| Layer         | Technology             | Purpose                                      |
|---------------|------------------------|----------------------------------------------|
| Telegram Bot  | [Telegraf](https://telegraf.js.org/) | Bot interface and command handling       |
| ORM           | [Prisma](https://www.prisma.io/)     | Database schema and querying              |
| Analytics     | [PostHog](https://posthog.com/)      | User behavior tracking and insights         |
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
│   ├── index.ts           # Local development entrypoint
│   └── lib/
│       ├── analytics.ts   # PostHog analytics integration
│       └── prisma.ts      # Prisma client setup
├── .env                   # Secrets (BOT_TOKEN, DATABASE_URL, POSTHOG_API_KEY)
├── tsconfig.json          # NodeNext TypeScript config
├── README.md              # This file
└── package.json           # Scripts and dependencies

````

---

## 🔐 Environment Variables

`.env` file contents:

```env
# Required
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=your_postgres_connection_string

# Optional - Analytics (PostHog)
POSTHOG_API_KEY=your_posthog_api_key
POSTHOG_HOST=https://us.i.posthog.com
````

### 📊 Analytics (PostHog) Setup

The bot includes comprehensive analytics tracking via PostHog. To enable:

1. **Sign up** for [PostHog](https://posthog.com/) (free tier available)
2. **Create a project** and get your API key
3. **Add to .env**: 
   ```env
   POSTHOG_API_KEY=phc_your_project_api_key
   ```
4. **Choose your host** (optional):
   - US Cloud: `POSTHOG_HOST=https://us.i.posthog.com` (default)
   - EU Cloud: `POSTHOG_HOST=https://eu.i.posthog.com`
   - Self-hosted: `POSTHOG_HOST=https://your-instance.com`

**📈 Tracked Events:**
- **Commands**: All bot commands with user and chat context
- **Registrations**: User DM registrations for notifications
- **Subscriptions**: Subscribe/unsubscribe events with product details
- **Broadcasts**: Message sends with delivery metrics
- **Waitlists**: Creation and deletion events
- **Errors**: Bot errors with context for debugging

**🔒 Privacy**: Only user IDs, usernames, and usage metrics are tracked. No message content is logged.

---

## 💬 Available Bot Commands

### 📌 Basic Commands

| Command | Who Can Use | Description |
|---------|-------------|-------------|
| `/start` | Anyone | Welcome message with quick start guide |
| `/ping` | Anyone | Check if the bot is alive |
| `/help` | Anyone | Show all available commands with descriptions |

### 📋 Waitlist Management

| Command | Who Can Use | Description |
|---------|-------------|-------------|
| `/openwaitlist <product> @username` | Group Admins | Create a waitlist and assign ownership |
| `/closewaitlist <product>` | Owner or Admins | Close and delete a waitlist permanently |
| `/list` | Anyone | List all waitlists in the current group |

### 👥 User Commands

| Command | Who Can Use | Description |
|---------|-------------|-------------|
| `/subscribe <product>` | Anyone | Join a waitlist for a product |
| `/unsubscribe <product>` | Anyone | Leave a waitlist |
| `/mywaitlists` | Anyone | **Context-aware**: Shows current group's subscriptions in groups, all subscriptions in DM |

### 📢 Broadcasting

| Command | Who Can Use | Description |
|---------|-------------|-------------|
| `/broadcast <product> <message>` | Waitlist Owner | **DM only** - Send message to all subscribers (keeps groups clean) |

---

## 🎯 Key Features

### 🏠 **Complete Chat Isolation**
- Each group has completely separate waitlists
- Same product names can exist in multiple groups
- No cross-group interference

### 🤖 **Smart Context Awareness**
- **In Groups**: `/mywaitlists` shows only current group's subscriptions
- **In DMs**: `/mywaitlists` shows all subscriptions across all groups with group names
- **Broadcasting**: Only works via DM to keep group chats clean

### 🛡️ **Permission System**
- **Group Admins**: Can create and close any waitlist
- **Waitlist Owners**: Can broadcast and close their own waitlists
- **Regular Users**: Can subscribe/unsubscribe and view lists

### 📢 **Clean Broadcasting**
- All broadcasts happen via DM to bot
- Automatic message footer shows waitlist and owner info
- Group chats stay focused on discussion

---

## 📖 Example Usage Workflows

### 🎯 **Creating a Waitlist**
1. **Admin** adds bot to group
2. **Admin** runs: `/openwaitlist FlowWeave @alice`
3. **Users** can now: `/subscribe FlowWeave`
4. **@alice** can DM bot: `/broadcast FlowWeave New feature coming soon!`

### 👥 **User Journey**
1. **User** runs: `/list` (sees all group waitlists)
2. **User** runs: `/subscribe FlowWeave`
3. **User** runs: `/mywaitlists` (sees their subscriptions)
4. **User** receives broadcast: "New feature coming soon!\n\nYou are receiving this message because you are on the waitlist for FlowWeave by @alice"

### 🔧 **Admin Management**
1. **Admin** runs: `/list` (sees all waitlists with subscriber counts)
2. **Admin** can: `/closewaitlist FlowWeave` (cleanup unused lists)
3. **Owners** can also close their own waitlists

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

| Feature | Status | Notes |
|---------|--------|-------|
| `/start` - Welcome guide | ✅ | Shows comprehensive quick start |
| `/ping` - Health check | ✅ | Simple pong response |
| `/help` - Command list | ✅ | Complete command documentation |
| `/openwaitlist` - Create waitlist | ✅ | Admin-only, assigns ownership |
| `/closewaitlist` - Delete waitlist | ✅ | Owner or admin permissions |
| `/subscribe` - Join waitlist | ✅ | Chat-specific, duplicate protection |
| `/unsubscribe` - Leave waitlist | ✅ | Safe removal, always succeeds |
| `/broadcast` - Send messages | ✅ | DM-only, automatic footer |
| `/list` - Show group waitlists | ✅ | Shows names, owners, subscriber counts |
| `/mywaitlists` - Personal view | ✅ | Context-aware behavior |
| **Chat Isolation** | ✅ | Complete separation between groups |
| **Permission System** | ✅ | Admin, owner, user roles working |
| **Error Handling** | ✅ | Graceful fallbacks and clear messages |

---

## 👥 Credits

Built by [Vansh Sahay](https://github.com/VanshSahay) \
Open to collaboration.