import { Telegraf } from 'telegraf';
import { prisma } from './lib/prisma';
import 'dotenv/config';

const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error('❌ BOT_TOKEN is missing from .env');
}

const bot: Telegraf = new Telegraf(botToken);

// Helper function to escape markdown characters in text
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

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
• \`/closewaitlist <product>\` - (Owner or Admin) Close and delete a waitlist
• \`/listwaitlists\` - List all waitlists in the channel
• \`/list <product>\` - Show all subscribers of a specific waitlist

👥 **User Commands:**
• \`/subscribe <product>\` - Join a waitlist (reacts with ✅ for success, ➖ if already subscribed)
• \`/unsubscribe <product>\` - Leave a waitlist (reacts with ✅ for success)
• \`/mywaitlists\` - List your subscribed waitlists (shows current chat only in groups, shows all chats when DMing bot)

📢 **Broadcasting:**
• \`/broadcast <product> <message>\` - (DM only) Send a message to everyone subscribed to your waitlist

💡 **Tips:**
- Add me to your group to manage waitlists
- Only group admins can create and close waitlists
- Broadcasting must be done via DM to keep groups clean
- Use \`/mywaitlists\` in DM to see all your subscriptions across all groups`;

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

// /closewaitlist command to close a waitlist (owner or admin)
bot.command('closewaitlist', async (ctx) => {
  const chatId = BigInt(ctx.chat!.id);
  const fromUsername = ctx.from!.username;
  const args = ctx.message.text.split(' ').slice(1);

  if (!fromUsername) {
    return ctx.reply('❌ You need a username to use this command.');
  }

  if (args.length === 0) {
    return ctx.reply('Usage: /closewaitlist <product name>');
  }

  const productName = args.join(' ');

  // Find the waitlist
  const waitlist = await prisma.waitlist.findFirst({
    where: { name: productName, chatId }
  });

  if (!waitlist) {
    return ctx.reply(`❗️ No waitlist named "${productName}" found in this chat.`);
  }

  // Check if user is the owner or an admin
  const isOwner = waitlist.ownerUsername === fromUsername;
  const isAdmin = await isUserAdmin(ctx);
  
  if (!isOwner && !isAdmin) {
    return ctx.reply(`❌ Only @${waitlist.ownerUsername} or group admins can close this waitlist.`);
  }

  // Delete all subscribers first (due to foreign key constraints)
  await prisma.subscriber.deleteMany({
    where: { waitlistId: waitlist.id }
  });

  // Delete the waitlist
  await prisma.waitlist.delete({
    where: { id: waitlist.id }
  });

  await ctx.reply(`🗑️ Waitlist "${productName}" has been closed and deleted.`);
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
        return ctx.react('➖' as any); // React with minus to indicate already subscribed
    }
    // Add subscriber
    await prisma.subscriber.create({
        data: { waitlistId: waitlist.id, userId, username }
    });
    await ctx.react('✅' as any); // React with checkmark for successful subscription
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
    await ctx.react('✅' as any); // React with checkmark for successful unsubscription
});

bot.command('broadcast', async (ctx) => {
    const fromUsername = ctx.from!.username;
    const isPrivateChat = ctx.chat!.type === 'private';
    const args = ctx.message.text.split(' ').slice(1);
  
    // Only allow broadcasting via DM
    if (!isPrivateChat) {
      return ctx.reply('📢 Please DM me directly to send broadcasts. This keeps group chats clean!');
    }
  
    if (args.length < 2) {
      return ctx.reply('Usage: /broadcast <productName> <message...>');
    }
  
    const productName = args[0];
    const broadcastText = args.slice(1).join(' ');
  
    // Search across all chats for waitlists owned by this user
    const waitlist = await prisma.waitlist.findFirst({
      where: { 
        name: productName,
        ownerUsername: fromUsername 
      }
    });
  
    if (!waitlist) {
      return ctx.reply(`❗️ No waitlist named "${productName}" found that you own.`);
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
  


// /listwaitlists command to view all available waitlists in the current chat
bot.command('listwaitlists', async (ctx) => {
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
    message += `• **${escapeMarkdown(waitlist.name)}**\n`;
    message += `  Owner: @${escapeMarkdown(waitlist.ownerUsername)}\n`;
    message += `  Subscribers: ${waitlist._count.subscribers}\n\n`;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

// /list command to view subscribers of a specific waitlist
bot.command('list', async (ctx) => {
  const chatId = BigInt(ctx.chat!.id);
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length === 0) {
    return ctx.reply('Usage: /list <product name>\n\nTo see all waitlists, use /listwaitlists');
  }

  const productName = args.join(' ');

  // Find the waitlist
  const waitlist = await prisma.waitlist.findFirst({
    where: { name: productName, chatId },
    include: {
      subscribers: true
    }
  });

  if (!waitlist) {
    return ctx.reply(`❗️ No waitlist named "${productName}" found in this chat.`);
  }

  if (waitlist.subscribers.length === 0) {
    return ctx.reply(`📋 **${escapeMarkdown(productName)}** waitlist\n\nOwner: @${escapeMarkdown(waitlist.ownerUsername)}\nSubscribers: None yet`, { parse_mode: 'Markdown' });
  }

  let message = `📋 **${escapeMarkdown(productName)}** waitlist\n\n`;
  message += `Owner: @${escapeMarkdown(waitlist.ownerUsername)}\n`;
  message += `Subscribers (${waitlist.subscribers.length}):\n\n`;
  
  for (const subscriber of waitlist.subscribers) {
    if (subscriber.username) {
      message += `• @${escapeMarkdown(subscriber.username)}\n`;
    } else {
      message += `• User ${subscriber.userId}\n`;
    }
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

// /mywaitlists command to view user's joined waitlists
bot.command('mywaitlists', async (ctx) => {
  const userId = BigInt(ctx.from!.id);
  const isPrivateChat = ctx.chat!.type === 'private';
  
  if (isPrivateChat) {
    // Option 2: Global view with chat information (when DMing the bot)
    const subscriptions = await prisma.subscriber.findMany({
      where: { userId },
      include: {
        waitlist: true
      }
    });

    if (subscriptions.length === 0) {
      return ctx.reply('📝 You are not subscribed to any waitlists.');
    }

    let message = '📝 **All Your Waitlists:**\n\n';
    for (const sub of subscriptions) {
      let chatName = 'Unknown Chat';
      try {
        const chat = await ctx.telegram.getChat(Number(sub.waitlist.chatId));
        if (chat.type === 'group' || chat.type === 'supergroup') {
          chatName = (chat as any).title || `Group ${sub.waitlist.chatId}`;
        } else if (chat.type === 'channel') {
          chatName = (chat as any).title || `Channel ${sub.waitlist.chatId}`;
        } else {
          chatName = `Chat ${sub.waitlist.chatId}`;
        }
      } catch (e) {
        console.error(`Failed to get chat info for ${sub.waitlist.chatId}:`, e);
        chatName = `Chat ${sub.waitlist.chatId}`;
      }

      message += `• **${escapeMarkdown(sub.waitlist.name)}**\n`;
      message += `  Owner: @${escapeMarkdown(sub.waitlist.ownerUsername)}\n`;
      message += `  Group: ${chatName}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } else {
    // Option 1: Chat-specific (when used in a group)
    const chatId = BigInt(ctx.chat!.id);
    
    const subscriptions = await prisma.subscriber.findMany({
      where: { 
        userId,
        waitlist: {
          chatId
        }
      },
      include: {
        waitlist: true
      }
    });

    if (subscriptions.length === 0) {
      return ctx.reply('📝 You are not subscribed to any waitlists in this chat.');
    }

    let message = '📝 **Your Waitlists in This Chat:**\n\n';
    for (const sub of subscriptions) {
      message += `• **${escapeMarkdown(sub.waitlist.name)}**\n`;
      message += `  Owner: @${escapeMarkdown(sub.waitlist.ownerUsername)}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
});

export { bot };
