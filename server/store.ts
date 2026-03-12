import { randomUUID } from 'node:crypto';
import type { CreateGiveawayPayload, Giveaway } from './types.js';

const giveaways = new Map<string, Giveaway>();

export const giveawayStore = {
  list: () => Array.from(giveaways.values()),
  get: (id: string) => giveaways.get(id),
  create: (payload: CreateGiveawayPayload) => {
    const giveaway: Giveaway = {
      ...payload,
      id: randomUUID(),
      status: 'draft',
      participants: [],
      winners: []
    };

    giveaways.set(giveaway.id, giveaway);
    return giveaway;
  },
  update: (id: string, update: Partial<Giveaway>) => {
    const existing = giveaways.get(id);
    if (!existing) return undefined;

    const merged: Giveaway = { ...existing, ...update };
    giveaways.set(id, merged);
    return merged;
  }
};
