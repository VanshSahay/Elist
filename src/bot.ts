import { Telegraf } from 'telegraf';
import { prisma } from './lib/prisma';
import 'dotenv/config';

const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error('❌ BOT_TOKEN is missing from .env');
}

const bot: Telegraf = new Telegraf(botToken);

// Ping test
bot.command('ping', (ctx) => ctx.reply('🏓 pong'));

// /start command (welcome message)
bot.start((ctx) => {
  const welcomeMessage = `👋 **Welcome to Elist Bot!**

🎯 **What I do:**
I help you manage product waitlists in your Telegram groups! Create waitlists, let users subscribe, and broadcast updates directly to interested users.

🚀 **Quick Start:**
1️⃣ Add me to your group
2️⃣ Use \`/openwaitlist <product> @username\` (admins only)
3️⃣ Users can \`/subscribe <product>\` to join
4️⃣ Waitlist owners can \`/broadcast <product> <message>\` to notify subscribers

📚 **Need help?** Use \`/help\` to see all available commands!

💡 **Tip:** You can also DM me directly for private commands like viewing your waitlists.`;

  ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

// /help command to show all available commands
bot.command('help', (ctx) => {
  const helpMessage = `🤖 **Elist Bot Commands**

📌 **Basic Commands:**
• \`/start\` - Start the bot and get help
• \`/ping\` - Check if the bot is alive
• \`/help\` - Show this help message

📋 **Waitlist Management:**
• \`/openwaitlist <product> @username\` - (Admins only) Open a waitlist for a product on behalf of a user
• \`/list\` - List all waitlists in the channel

👥 **User Commands:**
• \`/subscribe <product>\` - Join a waitlist for a product
• \`/unsubscribe <product>\` - Leave a waitlist
• \`/mywaitlists\` - List of waitlists you have subscribed to

📢 **Broadcasting:**
• \`/broadcast <product> <message>\` - (Waitlist owner only) Send a message to everyone subscribed (Use this by directly DMing the bot)

💡 **Tips:**
- Add me to your group to manage waitlists
- Only group admins can create waitlists
- Only waitlist owners can broadcast messages
- You can DM me directly for private commands`;

  ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

async function isUserAdmin(ctx: any): Promise<boolean> {
    const member = await ctx.getChatMember(ctx.from.id);
    return ['creator', 'administrator'].includes(member.status);
  }

  bot.command('openwaitlist', async (ctx) => {
    const chatId = BigInt(ctx.chat!.id);
    const args = ctx.message.text.split(' ').slice(1);
  
    if (!await isUserAdmin(ctx)) {
      return ctx.reply('❌ Only admins can open waitlists.');
    }
  
    const atIndex = args.findIndex((arg: string) => arg.startsWith('@'));
    if (args.length < 2 || atIndex === -1) {
      return ctx.reply('Usage: /openwaitlist <product name> @username');
    }
  
    const productName = args.slice(0, atIndex).join(' ');
    const targetUsername = args[atIndex].replace('@', '');
  
    const exists = await prisma.waitlist.findFirst({
      where: { name: productName, chatId }
    });
  
    if (exists) {
      return ctx.reply(`❗️ Waitlist "${productName}" already exists.`);
    }
  
    await prisma.waitlist.create({
      data: {
        name: productName,
        chatId,
        ownerUsername: targetUsername
      }
    });
  
    await ctx.reply(`✅ Waitlist "${productName}" opened for @${targetUsername}. They can now /broadcast to it.`);
  });

bot.command('subscribe', async (ctx) => {
    const chatId = BigInt(ctx.chat!.id);
    const userId = BigInt(ctx.from!.id);
    const username = ctx.from!.username || '';
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return ctx.reply('Usage: /subscribe <productName>');
    }
    const productName = args.join(' ');
    // Find the waitlist in this chat
    const waitlist = await prisma.waitlist.findFirst({ where: { name: productName, chatId } });
    if (!waitlist) {
        return ctx.reply(`❗️ No waitlist named "${productName}" found.`);
    }
    // Check if already subscribed
    const existing = await prisma.subscriber.findFirst({
        where: { waitlistId: waitlist.id, userId }
    });
    if (existing) {
        return ctx.reply(`You are already on the "${productName}" waitlist.`);
    }
    // Add subscriber
    await prisma.subscriber.create({
        data: { waitlistId: waitlist.id, userId, username }
    });
    await ctx.reply(`You have been subscribed to "${productName}"!`);
});

bot.command('unsubscribe', async (ctx) => {
    const chatId = BigInt(ctx.chat!.id);
    const userId = BigInt(ctx.from!.id);
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        return ctx.reply('Usage: /unsubscribe <productName>');
    }
    const productName = args.join(' ');
    const waitlist = await prisma.waitlist.findFirst({ where: { name: productName, chatId } });
    if (!waitlist) {
        return ctx.reply(`❗️ No waitlist named "${productName}" found.`);
    }
    // Remove subscriber if exists
    await prisma.subscriber.deleteMany({
        where: { waitlistId: waitlist.id, userId }
    });
    await ctx.reply(`You have been removed from the "${productName}" waitlist.`);
});

bot.command('broadcast', async (ctx) => {
    const fromUsername = ctx.from!.username;
    const args = ctx.message.text.split(' ').slice(1);
  
    if (args.length < 2) {
      return ctx.reply('Usage: /broadcast <productName> <message...>');
    }
  
    const productName = args[0];
    const broadcastText = args.slice(1).join(' ');
  
    const waitlist = await prisma.waitlist.findFirst({
      where: { name: productName }
    });
  
    if (!waitlist) {
      return ctx.reply(`❗️ No waitlist named "${productName}" found.`);
    }
  
    if (!fromUsername || waitlist.ownerUsername !== fromUsername) {
      return ctx.reply(`❌ Only @${waitlist.ownerUsername} can broadcast to this waitlist.`);
    }
  
    const subs = await prisma.subscriber.findMany({ where: { waitlistId: waitlist.id } });
  
    // Add product and owner info to the broadcast message
    const fullBroadcastMessage = `${broadcastText}\n\nYou are receiving this message because you are on the waitlist for ${productName} by @${waitlist.ownerUsername}`;
  
    let sentCount = 0;
    for (const sub of subs) {
      try {
        await ctx.telegram.sendMessage(Number(sub.userId), fullBroadcastMessage);
        sentCount++;
      } catch (e) {
        console.error(`Failed to send to ${sub.userId}:`, e);
      }
    }
  
    await ctx.reply(`📢 Broadcast sent to ${sentCount} subscriber(s) of "${productName}".`);
  });
  


// /list command to view all available waitlists in the current chat
bot.command('list', async (ctx) => {
  const chatId = BigInt(ctx.chat!.id);
  
  const waitlists = await prisma.waitlist.findMany({
    where: { chatId },
    include: {
      _count: {
        select: { subscribers: true }
      }
    }
  });

  if (waitlists.length === 0) {
    return ctx.reply('📋 No waitlists available in this chat.');
  }

  let message = '📋 **Available Waitlists:**\n\n';
  for (const waitlist of waitlists) {
    message += `• **${waitlist.name}**\n`;
    message += `  Owner: @${waitlist.ownerUsername}\n`;
    message += `  Subscribers: ${waitlist._count.subscribers}\n\n`;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

// /mywaitlists command to view user's joined waitlists
bot.command('mywaitlists', async (ctx) => {
  const userId = BigInt(ctx.from!.id);
  
  const subscriptions = await prisma.subscriber.findMany({
    where: { userId },
    include: {
      waitlist: true
    }
  });

  if (subscriptions.length === 0) {
    return ctx.reply('📝 You are not subscribed to any waitlists.');
  }

  let message = '📝 **Your Waitlists:**\n\n';
  for (const sub of subscriptions) {
    message += `• **${sub.waitlist.name}**\n`;
    message += `  Owner: @${sub.waitlist.ownerUsername}\n\n`;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

export { bot };
