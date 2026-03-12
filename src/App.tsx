import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Input, Panel, Textarea, Typography } from '@maxhub/max-ui';
import { initMiniAppBridge } from './lib/maxBridge';

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
  draft: { text: 'Черновик', className: 'statusDraft' },
  published: { text: 'Опубликован', className: 'statusPublished' },
  finished: { text: 'Завершён', className: 'statusFinished' }
};

function toDateInputValue(date: dayjs.Dayjs) {
  return date.format('YYYY-MM-DDTHH:mm');
}

export function App() {
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
    <main className="page">
      <section className="hero">
        <Typography.Headline>MAX Giveaway Console</Typography.Headline>
        <Typography.Body>
          Создание, публикация и управление розыгрышами в одном mini app интерфейсе.
        </Typography.Body>
      </section>

      <section className="statsGrid">
        <Panel className="statCard">
          <Typography.Label>Всего розыгрышей</Typography.Label>
          <Typography.Title>{stats.total}</Typography.Title>
        </Panel>
        <Panel className="statCard">
          <Typography.Label>Активных</Typography.Label>
          <Typography.Title>{stats.published}</Typography.Title>
        </Panel>
        <Panel className="statCard">
          <Typography.Label>Участников</Typography.Label>
          <Typography.Title>{stats.participants}</Typography.Title>
        </Panel>
        <Panel className="statCard">
          <Typography.Label>Победителей</Typography.Label>
          <Typography.Title>{stats.winners}</Typography.Title>
        </Panel>
      </section>

      <Panel className="formCard">
        <Typography.Title>Новый розыгрыш</Typography.Title>

        <div className="formGrid">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название розыгрыша" />
          <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Город / Онлайн" />
          <Input
            value={publishAt}
            onChange={(event) => setPublishAt(event.target.value)}
            type="datetime-local"
            aria-label="Дата публикации"
          />
          <Input
            value={drawAt}
            onChange={(event) => setDrawAt(event.target.value)}
            type="datetime-local"
            aria-label="Дата розыгрыша"
          />
          <Input
            value={prizeTitle}
            onChange={(event) => setPrizeTitle(event.target.value)}
            placeholder="Название приза"
          />
          <Input
            value={String(prizeCount)}
            onChange={(event) => setPrizeCount(Number(event.target.value))}
            type="number"
            min={1}
            placeholder="Количество мест"
          />
        </div>

        <div className="channelsBlock">
          <div className="channelsHeader">
            <Typography.Label>Каналы / группы для обязательной подписки</Typography.Label>
            <Button onClick={addChatField}>+ Добавить канал</Button>
          </div>

          {requiredChats.map((chat, index) => (
            <div key={index} className="channelRow">
              <Input
                value={chat}
                onChange={(event) => updateChat(index, event.target.value)}
                placeholder="https://max.ru/... или chat_id"
              />
              <Button onClick={() => removeChatField(index)} disabled={requiredChats.length === 1}>
                Удалить
              </Button>
            </div>
          ))}

          <div className="channelActions">
            <Button onClick={verifyBotAccess} disabled={checkingChats || cleanChats.length === 0}>
              {checkingChats ? 'Проверяю доступы…' : 'Проверить, что бот добавлен и админ'}
            </Button>
          </div>
        </div>

        {chatReport && (
          <Panel className="checkPanel">
            <Typography.Label>
              Результат проверки: {chatReport.allPassed ? '✅ всё готово' : '⚠️ есть проблемы'}
            </Typography.Label>
            <Typography.Body>
              Нужные права: {chatReport.requiredPermissions.join(', ')}
            </Typography.Body>

            <div className="checksList">
              {chatReport.results.map((item, index) => (
                <div key={index} className={`checkItem ${item.ok ? 'ok' : 'fail'}`}>
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

        {error && <Typography.Body className="errorText">{error}</Typography.Body>}

        <Button onClick={createGiveaway} disabled={!canSubmit}>
          Создать розыгрыш
        </Button>
      </Panel>

      <section className="listSection">
        <div className="listHeader">
          <Typography.Title>Мои розыгрыши</Typography.Title>
          <Typography.Body>{loading ? 'Загрузка…' : `${giveaways.length} шт.`}</Typography.Body>
        </div>

        {giveaways.length === 0 && !loading ? (
          <Panel className="emptyState">
            <Typography.Body>Пока нет розыгрышей. Создайте первый сверху.</Typography.Body>
          </Panel>
        ) : (
          <div className="giveawayGrid">
            {giveaways.map((item) => {
              const status = statusMap[item.status];
              return (
                <Panel key={item.id} className="giveawayCard">
                  <div className="giveawayHeader">
                    <Typography.Title>{item.title}</Typography.Title>
                    <span className={`status ${status.className}`}>{status.text}</span>
                  </div>

                  <Typography.Body className="description">{item.description}</Typography.Body>

                  <div className="metaRow">
                    <Typography.Label>Город</Typography.Label>
                    <Typography.Body>{item.city || 'Онлайн'}</Typography.Body>
                  </div>
                  <div className="metaRow">
                    <Typography.Label>Публикация</Typography.Label>
                    <Typography.Body>{dayjs(item.publishAt).format('DD.MM.YYYY HH:mm')}</Typography.Body>
                  </div>
                  <div className="metaRow">
                    <Typography.Label>Финал</Typography.Label>
                    <Typography.Body>{dayjs(item.drawAt).format('DD.MM.YYYY HH:mm')}</Typography.Body>
                  </div>
                  <div className="metaRow">
                    <Typography.Label>Участники</Typography.Label>
                    <Typography.Body>{item.participants.length}</Typography.Body>
                  </div>
                  <div className="metaRow">
                    <Typography.Label>Победители</Typography.Label>
                    <Typography.Body>{item.winners.length ? item.winners.join(', ') : '—'}</Typography.Body>
                  </div>

                  <div className="metaRow channelsMeta">
                    <Typography.Label>Каналы/группы</Typography.Label>
                    <Typography.Body>{item.requiredChats.join(', ')}</Typography.Body>
                  </div>

                  <div className="actions">
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
