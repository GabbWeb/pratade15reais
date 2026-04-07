const express = require('express');
const app = express();
app.use(express.json());

const { handleMessage } = require('./flows');
const { verifyWebhook, sendMessage } = require('./whatsapp');
const sessionManager = require('./session');

// ── In-memory stats store ──────────────────────────────────────────────
const stats = {
  totalMessages: 0,
  humanTakeovers: 0,
  ordersQueried: 0,
  startTime: Date.now(),
  conversations: {},   // phone → { phone, lastMessage, lastSeen, messageCount, status }
  orderLogs: [],       // { phone, orderId, status, timestamp }
  serverLogs: [],      // { level, message, timestamp }
};

function log(level, message) {
  const entry = { level, message, timestamp: new Date().toISOString() };
  stats.serverLogs.unshift(entry);
  if (stats.serverLogs.length > 200) stats.serverLogs.pop();
  console.log(`[${level.toUpperCase()}] ${message}`);
}

// ── Webhook verification ───────────────────────────────────────────────
app.get('/webhook', (req, res) => {
  const result = verifyWebhook(req.query);
  if (result.success) {
    log('info', 'Webhook verified by Meta');
    return res.status(200).send(result.challenge);
  }
  log('warn', 'Webhook verification failed');
  res.sendStatus(403);
});

// ── Incoming WhatsApp messages ─────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0]?.changes?.[0]?.value;
    if (!entry?.messages) return;

    const msg = entry.messages[0];
    const phone = msg.from;
    const text = msg.text?.body || '';

    // Update conversation stats
    stats.totalMessages++;
    if (!stats.conversations[phone]) {
      stats.conversations[phone] = { phone, messageCount: 0, status: 'bot', lastMessage: '', lastSeen: null };
    }
    stats.conversations[phone].messageCount++;
    stats.conversations[phone].lastMessage = text;
    stats.conversations[phone].lastSeen = new Date().toISOString();

    log('info', `Message from ${phone}: ${text.substring(0, 60)}`);

    const session = sessionManager.get(phone);
    const { reply, humanTakeover, orderQueried, orderId } = await handleMessage(phone, text, session);

    if (humanTakeover) {
      stats.humanTakeovers++;
      stats.conversations[phone].status = 'human';
      log('warn', `Human takeover requested by ${phone}`);
    }

    if (orderQueried) {
      stats.ordersQueried++;
      stats.orderLogs.unshift({ phone, orderId, timestamp: new Date().toISOString() });
      if (stats.orderLogs.length > 100) stats.orderLogs.pop();
      log('info', `Order queried: ${orderId} by ${phone}`);
    }

    sessionManager.set(phone, session);
    if (reply) await sendMessage(phone, reply);

  } catch (err) {
    log('error', `Webhook error: ${err.message}`);
  }
});

// ── Dashboard API ──────────────────────────────────────────────────────
const DASH_KEY = process.env.DASHBOARD_KEY || 'prata15dash';

function authDash(req, res, next) {
  const key = req.headers['x-dash-key'] || req.query.key;
  if (key !== DASH_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/dashboard/stats', authDash, (req, res) => {
  const uptimeMs = Date.now() - stats.startTime;
  const hours = Math.floor(uptimeMs / 3600000);
  const minutes = Math.floor((uptimeMs % 3600000) / 60000);
  res.json({
    totalMessages: stats.totalMessages,
    humanTakeovers: stats.humanTakeovers,
    ordersQueried: stats.ordersQueried,
    activeConversations: Object.keys(stats.conversations).length,
    uptime: `${hours}h ${minutes}m`,
    serverTime: new Date().toISOString(),
  });
});

app.get('/dashboard/conversations', authDash, (req, res) => {
  const list = Object.values(stats.conversations)
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
    .slice(0, 50);
  res.json(list);
});

app.get('/dashboard/orders', authDash, (req, res) => {
  res.json(stats.orderLogs.slice(0, 50));
});

app.get('/dashboard/logs', authDash, (req, res) => {
  res.json(stats.serverLogs.slice(0, 100));
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Prata de 15 Reais Bot' }));

// ── Start ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log('info', `Server running on port ${PORT}`));
