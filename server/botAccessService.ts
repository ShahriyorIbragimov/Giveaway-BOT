import { bot } from './maxBot.js';

type ChatPermission = 'read_all_messages' | 'add_remove_members' | 'add_admins' | 'change_chat_info' | 'pin_message' | 'write';

const requiredPermissions: ChatPermission[] = ['add_remove_members', 'write', 'pin_message'];

type ChatValidationResult = {
  input: string;
  ok: boolean;
  chatId?: number;
  chatTitle?: string | null;
  isAdmin?: boolean;
  missingPermissions?: ChatPermission[];
  reason?: string;
};

function extractLink(raw: string) {
  const value = raw.trim();

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return value;
  }

  try {
    const url = new URL(value);
    return url.pathname.replace(/^\//, '');
  } catch {
    return value;
  }
}

async function resolveChat(input: string) {
  if (!bot) {
    throw new Error('MAX_BOT_TOKEN is required to validate bot access in chats.');
  }

  const raw = input.trim();
  if (!raw) {
    throw new Error('Empty chat identifier.');
  }

  if (/^\d+$/.test(raw)) {
    return bot.api.getChat(Number(raw));
  }

  const link = extractLink(raw);

  try {
    return await bot.api.getChatByLink(raw);
  } catch {
    return bot.api.getChatByLink(link);
  }
}

export const botAccessService = {
  async validateChats(chats: string[]) {
    if (!bot) {
      throw new Error('MAX_BOT_TOKEN is not set. Bot access checks are unavailable.');
    }

    const botInfo = await bot.api.getMyInfo();

    const results: ChatValidationResult[] = [];

    for (const input of chats) {
      try {
        const chat = await resolveChat(input);
        const admins = await bot.api.getChatAdmins(chat.chat_id);
        const meAsAdmin = admins.members.find((member) => member.user_id === botInfo.user_id);

        if (!meAsAdmin) {
          results.push({
            input,
            ok: false,
            chatId: chat.chat_id,
            chatTitle: chat.title,
            isAdmin: false,
            missingPermissions: requiredPermissions,
            reason: 'Bot is not in admin list.'
          });
          continue;
        }

        const permissions = meAsAdmin.permissions ?? [];
        const missingPermissions = requiredPermissions.filter((permission) => !permissions.includes(permission));

        results.push({
          input,
          ok: missingPermissions.length === 0,
          chatId: chat.chat_id,
          chatTitle: chat.title,
          isAdmin: meAsAdmin.is_admin,
          missingPermissions,
          reason: missingPermissions.length > 0 ? 'Bot admin privileges are incomplete.' : undefined
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown MAX API error';
        results.push({ input, ok: false, reason: message });
      }
    }

    return {
      requiredPermissions,
      allPassed: results.every((item) => item.ok),
      results
    };
  }
};
