import cors from 'cors';
import express from 'express';
import { giveawayService } from './giveawayService.js';
import { startBot } from './maxBot.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/giveaways', (_req, res) => {
  res.json(giveawayService.list());
});

app.post('/api/giveaways', (req, res) => {
  try {
    const giveaway = giveawayService.create(req.body);
    res.status(201).json(giveaway);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

app.post('/api/giveaways/:id/publish', (req, res) => {
  const updated = giveawayService.publish(req.params.id);
  if (!updated) {
    res.status(404).json({ error: 'Giveaway not found' });
    return;
  }

  res.json({
    ...updated,
    deepLink: `https://max.ru/${process.env.MAX_BOT_USERNAME ?? 'your_bot'}?startapp=gw_${updated.id}`
  });
});

app.post('/api/giveaways/:id/join', (req, res) => {
  const userId = String(req.body.userId ?? 'guest');
  const updated = giveawayService.join(req.params.id, userId);

  if (!updated) {
    res.status(404).json({ error: 'Giveaway not found' });
    return;
  }

  res.json(updated);
});

app.post('/api/giveaways/:id/draw', (req, res) => {
  const updated = giveawayService.drawWinners(req.params.id);

  if (!updated) {
    res.status(404).json({ error: 'Giveaway not found' });
    return;
  }

  res.json(updated);
});

app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  await startBot();
});
