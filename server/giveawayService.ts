import dayjs from 'dayjs';
import { z } from 'zod';
import { giveawayStore } from './store.js';

const prizeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  count: z.number().int().positive()
});

export const createGiveawaySchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  city: z.string().min(2),
  imageUrl: z.string().url().optional(),
  publishAt: z.string().datetime(),
  drawAt: z.string().datetime(),
  requiredChats: z.array(z.string().min(2)).min(1),
  prizes: z.array(prizeSchema).min(1),
  createdBy: z.string().min(2)
});

export const giveawayService = {
  create(input: unknown) {
    const payload = createGiveawaySchema.parse(input);

    if (dayjs(payload.drawAt).isBefore(dayjs(payload.publishAt))) {
      throw new Error('drawAt must be after publishAt');
    }

    return giveawayStore.create(payload);
  },

  list() {
    return giveawayStore.list();
  },

  publish(id: string) {
    return giveawayStore.update(id, { status: 'published' });
  },

  join(id: string, userId: string) {
    const giveaway = giveawayStore.get(id);
    if (!giveaway) return undefined;

    if (giveaway.participants.includes(userId)) {
      return giveaway;
    }

    const participants = [...giveaway.participants, userId];
    return giveawayStore.update(id, { participants });
  },

  drawWinners(id: string) {
    const giveaway = giveawayStore.get(id);
    if (!giveaway) return undefined;

    const winnerSlots = giveaway.prizes.reduce((sum, prize) => sum + prize.count, 0);
    const pool = [...giveaway.participants];
    const winners: string[] = [];

    while (pool.length && winners.length < winnerSlots) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      const winner = pool.splice(randomIndex, 1)[0];
      winners.push(winner);
    }

    return giveawayStore.update(id, {
      winners,
      status: 'finished'
    });
  }
};
