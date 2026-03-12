import { Bot } from '@maxhub/max-bot-api';
import { giveawayService } from './giveawayService.js';

const botToken = process.env.MAX_BOT_TOKEN;

export const bot = botToken ? new Bot(botToken) : null;

if (bot) {
  bot.on('bot_started', async (ctx) => {
    const payload = ctx.startPayload;
    if (!payload?.startsWith('gw_')) {
      await ctx.reply('Привет! Это Giveaway BOT для MAX. Откройте mini app, чтобы создать розыгрыш.');
      return;
    }

    const giveawayId = payload.replace('gw_', '');
    const giveaway = giveawayService.list().find((item) => item.id === giveawayId);

    if (!giveaway) {
      await ctx.reply('Розыгрыш не найден.');
      return;
    }

    await ctx.reply(
      `Розыгрыш: ${giveaway.title}\n` +
        '1) Подпишитесь на обязательные каналы\n' +
        '2) Нажмите кнопку в посте: УЧАСТВОВАТЬ\n' +
        '3) Для MVP проверка подписки эмулируется сервером.'
    );
  });

  bot.command('participate', async (ctx) => {
    const text = ctx.message?.body?.text ?? '';
    const giveawayId = text.split(' ')[1];
    if (!giveawayId) {
      await ctx.reply('Использование: /participate <giveawayId>');
      return;
    }

    const updated = giveawayService.join(giveawayId, `chat-user-${Date.now()}`);

    if (!updated) {
      await ctx.reply('Розыгрыш не найден.');
      return;
    }

    await ctx.reply(`Участие подтверждено. Ваш номер: ${updated.participants.length}`);
  });

  bot.action(/^join:(.+)$/i, async (ctx) => {
    const giveawayId = ctx.match?.[1];
    if (!giveawayId) return;

    const userId = String(ctx.user?.user_id ?? 'unknown');
    const updated = giveawayService.join(giveawayId, userId);
    await ctx.answerOnCallback({ notification: updated ? 'Вы участвуете ✅' : 'Розыгрыш не найден' });
  });
}

export async function startBot() {
  if (!bot) {
    console.warn('MAX_BOT_TOKEN is not set, bot will not start.');
    return;
  }

  await bot.start();
}
