import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Panel, Textarea, Typography } from '@maxhub/max-ui';
import { initMiniAppBridge } from './lib/maxBridge';

type Prize = { id: string; title: string; count: number };
type Giveaway = {
  id: string;
  title: string;
  description: string;
  publishAt: string;
  drawAt: string;
  requiredChats: string[];
  participants: string[];
  winners: string[];
  status: 'draft' | 'published' | 'finished';
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function App() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Москва');
  const [requiredChats, setRequiredChats] = useState('https://max.ru/channel/your-channel');
  const [publishAt, setPublishAt] = useState('');
  const [drawAt, setDrawAt] = useState('');
  const [prizeTitle, setPrizeTitle] = useState('Подарочный набор');
  const [prizeCount, setPrizeCount] = useState(1);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    initMiniAppBridge();
    void loadGiveaways();
  }, []);

  const canSubmit = useMemo(
    () => Boolean(title.trim() && description.trim() && publishAt && drawAt && requiredChats.trim()),
    [description, drawAt, publishAt, requiredChats, title]
  );

  async function loadGiveaways() {
    const response = await fetch(`${API_URL}/api/giveaways`);
    const data = (await response.json()) as Giveaway[];
    setGiveaways(data);
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
        requiredChats: requiredChats.split(',').map((item) => item.trim()),
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
    await loadGiveaways();
  }

  async function runAction(id: string, action: 'publish' | 'draw') {
    await fetch(`${API_URL}/api/giveaways/${id}/${action}`, { method: 'POST' });
    await loadGiveaways();
  }

  return (
    <main className="page">
      <Panel className="card">
        <Typography.Headline>MAX Giveaway BOT · MVP</Typography.Headline>
        <Typography.Body className="muted">
          Простая mini app форма для создания и управления розыгрышами.
        </Typography.Body>

        <div className="grid">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название розыгрыша" />
          <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Город" />
          <Input
            value={requiredChats}
            onChange={(event) => setRequiredChats(event.target.value)}
            placeholder="Ссылки на обязательные каналы (через запятую)"
          />
          <Input value={publishAt} onChange={(event) => setPublishAt(event.target.value)} type="datetime-local" />
          <Input value={drawAt} onChange={(event) => setDrawAt(event.target.value)} type="datetime-local" />
          <Input value={prizeTitle} onChange={(event) => setPrizeTitle(event.target.value)} placeholder="Название приза" />
          <Input
            value={String(prizeCount)}
            onChange={(event) => setPrizeCount(Number(event.target.value))}
            type="number"
            min={1}
          />
        </div>

        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Описание условий участия"
        />

        {error && <Typography.Body className="error">{error}</Typography.Body>}
        <Button onClick={createGiveaway} disabled={!canSubmit}>
          Создать розыгрыш
        </Button>
      </Panel>

      <section className="list">
        {giveaways.map((item) => (
          <Panel key={item.id} className="card">
            <Typography.Headline>{item.title}</Typography.Headline>
            <Typography.Body>Статус: {item.status}</Typography.Body>
            <Typography.Body>Участников: {item.participants.length}</Typography.Body>
            <Typography.Body>Победителей: {item.winners.join(', ') || '—'}</Typography.Body>
            <div className="actions">
              <Button onClick={() => runAction(item.id, 'publish')}>Опубликовать</Button>
              <Button onClick={() => runAction(item.id, 'draw')}>Выбрать победителя</Button>
            </div>
          </Panel>
        ))}
      </section>
    </main>
  );
}
