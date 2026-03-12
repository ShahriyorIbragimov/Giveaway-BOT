import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Input, Panel, Textarea, Typography } from '@maxhub/max-ui';
import { initMiniAppBridge } from './lib/maxBridge';
import { Theme, THEME_KEY } from './types';
import {
  Trash,
  Sun,
  Moon
} from 'lucide-react';

type Prize = { id: string; title: string; count: number };
type Giveaway = {
  id: string;
  title: string;
  description: string;
  city: string;
  publishAt: string;
  drawAt: string;
  requiredChats: string[];
  participants: string[];
  winners: string[];
  status: 'draft' | 'published' | 'finished';
};

type ChatAccessResult = {
  input: string;
  ok: boolean;
  chatId?: number;
  chatTitle?: string | null;
  isAdmin?: boolean;
  missingPermissions?: string[];
  reason?: string;
};

type ChatAccessReport = {
  requiredPermissions: string[];
  allPassed: boolean;
  results: ChatAccessResult[];
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const statusMap: Record<Giveaway['status'], { text: string; className: string }> = {
  draft: { text: 'Черновик', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200' },
  published: { text: 'Опубликован', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' },
  finished: { text: 'Завершён', className: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200' }
};

function toDateInputValue(date: dayjs.Dayjs) {
  return date.format('YYYY-MM-DDTHH:mm');
}

interface AppProps {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  applyTheme: (theme: Theme) => void
}

export function App({ theme, setTheme, toggleTheme, applyTheme }: AppProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Москва');
  const [requiredChats, setRequiredChats] = useState<string[]>(['']);
  const [publishAt, setPublishAt] = useState(toDateInputValue(dayjs().add(1, 'hour')));
  const [drawAt, setDrawAt] = useState(toDateInputValue(dayjs().add(2, 'day')));
  const [prizeTitle, setPrizeTitle] = useState('Подарочный набор');
  const [prizeCount, setPrizeCount] = useState(1);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingChats, setCheckingChats] = useState(false);
  const [chatReport, setChatReport] = useState<ChatAccessReport | null>(null);

  useEffect(() => {
    initMiniAppBridge();

    const stored = localStorage.getItem(THEME_KEY);
    const resolved: Theme = stored === 'dark' ? 'dark' : 'light';
    setTheme(resolved);
    applyTheme(resolved);

    void loadGiveaways();
  }, []);

  const cleanChats = useMemo(() => requiredChats.map((item) => item.trim()).filter(Boolean), [requiredChats]);

  const stats = useMemo(() => {
    const total = giveaways.length;
    const published = giveaways.filter((item) => item.status === 'published').length;
    const participants = giveaways.reduce((sum, item) => sum + item.participants.length, 0);
    const winners = giveaways.reduce((sum, item) => sum + item.winners.length, 0);

    return { total, published, participants, winners };
  }, [giveaways]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        title.trim() &&
        description.trim() &&
        publishAt &&
        drawAt &&
        cleanChats.length > 0 &&
        prizeTitle.trim() &&
        prizeCount > 0
      ),
    [cleanChats.length, description, drawAt, prizeCount, prizeTitle, publishAt, title]
  );

  async function loadGiveaways() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/giveaways`);
      const data = (await response.json()) as Giveaway[];
      setGiveaways(data);
    } finally {
      setLoading(false);
    }
  }

  async function verifyBotAccess() {
    setCheckingChats(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/chats/validate-bot-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chats: cleanChats })
      });

      const data = (await response.json()) as ChatAccessReport | { error: string };
      if (!response.ok) {
        setChatReport(null);
        setError((data as { error: string }).error);
        return;
      }

      setChatReport(data as ChatAccessReport);
    } finally {
      setCheckingChats(false);
    }
  }

  async function createGiveaway() {
    setError('');
    const prizes: Prize[] = [{ id: crypto.randomUUID(), title: prizeTitle, count: prizeCount }];

    const response = await fetch(`${API_URL}/api/giveaways`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        city,
        publishAt: new Date(publishAt).toISOString(),
        drawAt: new Date(drawAt).toISOString(),
        requiredChats: cleanChats,
        prizes,
        createdBy: 'organizer_1'
      })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error: string };
      setError(data.error);
      return;
    }

    setTitle('');
    setDescription('');
    setPrizeTitle('Подарочный набор');
    setPrizeCount(1);
    setRequiredChats(['']);
    setChatReport(null);
    await loadGiveaways();
  }

  async function runAction(id: string, action: 'publish' | 'draw') {
    await fetch(`${API_URL}/api/giveaways/${id}/${action}`, { method: 'POST' });
    await loadGiveaways();
  }

  function updateChat(index: number, value: string) {
    setRequiredChats((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addChatField() {
    setRequiredChats((prev) => [...prev, '']);
  }

  function removeChatField(index: number) {
    setRequiredChats((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length > 0 ? next : [''];
    });
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-5 dark:border-indigo-900 dark:from-slate-900 dark:to-slate-800">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Typography.Headline>MAX Giveaway Console</Typography.Headline>
          <Button onClick={toggleTheme}>{theme === 'light' ? <Sun /> : <Moon />}</Button>
        </div>
        <Typography.Body>
          Создание, публикация и управление розыгрышами в одном mini app интерфейсе.
        </Typography.Body>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <Typography.Label>Всего розыгрышей</Typography.Label>
          <Typography.Title>{stats.total}</Typography.Title>
        </Panel>
        <Panel className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <Typography.Label>Активных</Typography.Label>
          <Typography.Title>{stats.published}</Typography.Title>
        </Panel>
        <Panel className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <Typography.Label>Участников</Typography.Label>
          <Typography.Title>{stats.participants}</Typography.Title>
        </Panel>
        <Panel className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <Typography.Label>Победителей</Typography.Label>
          <Typography.Title>{stats.winners}</Typography.Title>
        </Panel>
      </section>

      <Panel className="grid gap-3 rounded-2xl border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 border">
        <Typography.Title>Новый розыгрыш</Typography.Title>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название розыгрыша" />
          <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Город / Онлайн" />
          <Input value={publishAt} onChange={(event) => setPublishAt(event.target.value)} type="datetime-local" />
          <Input value={drawAt} onChange={(event) => setDrawAt(event.target.value)} type="datetime-local" />
          <Input value={prizeTitle} onChange={(event) => setPrizeTitle(event.target.value)} placeholder="Название приза" />
          <Input
            value={String(prizeCount)}
            onChange={(event) => setPrizeCount(Number(event.target.value))}
            type="number"
            min={1}
            placeholder="Количество мест"
          />
        </div>

        <div className="grid gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-3 dark:border-indigo-700 dark:bg-indigo-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Typography.Label>Каналы / группы для обязательной подписки</Typography.Label>
            <Button onClick={addChatField}>+ Добавить канал</Button>
          </div>

          {requiredChats.map((chat, index) => (
            <div key={index} className="gap-2 flex items-center">
              <Input
                value={chat}
                onChange={(event) => updateChat(index, event.target.value)}
                placeholder="https://max.ru/... или chat_id"
                className='w-full'
              />
              <Button
                onClick={() => removeChatField(index)}
                disabled={requiredChats.length === 1}
                className='bg-red-500'
              >
                <Trash className='text-white' />
              </Button>
            </div>
          ))}

          <div>
            <Button onClick={verifyBotAccess} disabled={checkingChats || cleanChats.length === 0}>
              {checkingChats ? 'Проверяю доступы…' : 'Проверить, что бот добавлен и админ'}
            </Button>
          </div>
        </div>

        {chatReport && (
          <Panel className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <Typography.Label>
              Результат проверки: {chatReport.allPassed ? '✅ всё готово' : '⚠️ есть проблемы'}
            </Typography.Label>
            <Typography.Body>Нужные права: {chatReport.requiredPermissions.join(', ')}</Typography.Body>

            <div className="grid gap-2">
              {chatReport.results.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-2 ${item.ok
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30'
                    : 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/30'
                    }`}
                >
                  <Typography.Body>
                    {item.ok ? '✅' : '❌'} {item.chatTitle || item.input}
                  </Typography.Body>
                  <Typography.Label>
                    {item.ok
                      ? `chat_id=${item.chatId}`
                      : item.reason ||
                      `Не хватает прав: ${(item.missingPermissions || []).join(', ') || 'неизвестно'}`}
                  </Typography.Label>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Описание, условия, дедлайн, ограничения"
          rows={4}
        />

        {error && <Typography.Body className="text-rose-600 dark:text-rose-300">{error}</Typography.Body>}

        <Button onClick={createGiveaway} disabled={!canSubmit}>
          Создать розыгрыш
        </Button>
      </Panel>

      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <Typography.Title>Мои розыгрыши</Typography.Title>
          <Typography.Body>{loading ? 'Загрузка…' : `${giveaways.length} шт.`}</Typography.Body>
        </div>

        {giveaways.length === 0 && !loading ? (
          <Panel className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <Typography.Body>Пока нет розыгрышей. Создайте первый сверху.</Typography.Body>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {giveaways.map((item) => {
              const status = statusMap[item.status];
              return (
                <Panel key={item.id} className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Typography.Title>{item.title}</Typography.Title>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}>{status.text}</span>
                  </div>

                  <Typography.Body>{item.description}</Typography.Body>

                  <div className="grid gap-1 text-sm">
                    <div className="flex justify-between gap-2 border-b border-dashed border-slate-300 pb-1 dark:border-slate-700">
                      <Typography.Label>Город</Typography.Label>
                      <Typography.Body>{item.city || 'Онлайн'}</Typography.Body>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-dashed border-slate-300 pb-1 dark:border-slate-700">
                      <Typography.Label>Публикация</Typography.Label>
                      <Typography.Body>{dayjs(item.publishAt).format('DD.MM.YYYY HH:mm')}</Typography.Body>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-dashed border-slate-300 pb-1 dark:border-slate-700">
                      <Typography.Label>Финал</Typography.Label>
                      <Typography.Body>{dayjs(item.drawAt).format('DD.MM.YYYY HH:mm')}</Typography.Body>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-dashed border-slate-300 pb-1 dark:border-slate-700">
                      <Typography.Label>Участники</Typography.Label>
                      <Typography.Body>{item.participants.length}</Typography.Body>
                    </div>
                    <div className="flex justify-between gap-2 border-b border-dashed border-slate-300 pb-1 dark:border-slate-700">
                      <Typography.Label>Победители</Typography.Label>
                      <Typography.Body>{item.winners.length ? item.winners.join(', ') : '—'}</Typography.Body>
                    </div>
                    <div className="flex justify-between gap-2">
                      <Typography.Label>Каналы/группы</Typography.Label>
                      <Typography.Body>{item.requiredChats.join(', ')}</Typography.Body>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => runAction(item.id, 'publish')} disabled={item.status !== 'draft'}>
                      Опубликовать
                    </Button>
                    <Button onClick={() => runAction(item.id, 'draw')} disabled={item.participants.length === 0}>
                      Выбрать победителей
                    </Button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
