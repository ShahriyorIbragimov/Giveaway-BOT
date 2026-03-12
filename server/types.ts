export type GiveawayStatus = 'draft' | 'published' | 'finished';

export interface Prize {
  id: string;
  title: string;
  count: number;
}

export interface Giveaway {
  id: string;
  title: string;
  description: string;
  city: string;
  imageUrl?: string;
  publishAt: string;
  drawAt: string;
  requiredChats: string[];
  prizes: Prize[];
  status: GiveawayStatus;
  participants: string[];
  winners: string[];
  createdBy: string;
}

export interface CreateGiveawayPayload {
  title: string;
  description: string;
  city: string;
  imageUrl?: string;
  publishAt: string;
  drawAt: string;
  requiredChats: string[];
  prizes: Prize[];
  createdBy: string;
}
