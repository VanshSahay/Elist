import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  throw new Error('❌ BOT_TOKEN is missing from .env');
}

const bot: Telegraf = new Telegraf(botToken);
const prisma = new PrismaClient();

// Ping test
bot.command('ping', (ctx) => ctx.reply('🏓 pong'));

// /start command (optional welcome message)
bot.start((ctx) => {
  ctx.reply('👋 Hey! Use /subscribe <product> to join a waitlist.');
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
  
    const atIndex = args.findIndex((arg) => arg.startsWith('@'));
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
  
    let sentCount = 0;
    for (const sub of subs) {
      try {
        await ctx.telegram.sendMessage(Number(sub.userId), broadcastText);
        sentCount++;
      } catch (e) {
        console.error(`Failed to send to ${sub.userId}:`, e);
      }
    }
  
    await ctx.reply(`📢 Broadcast sent to ${sentCount} subscriber(s) of "${productName}".`);
  });
  


export { bot, prisma };
