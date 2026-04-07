import express from "express";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./flows.js";

dotenv.config();

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// ─── Verificação do webhook (Meta exige isso na configuração) ───────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado com sucesso");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ─── Recebe mensagens do WhatsApp ───────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200); // Sem mensagem (ex: status de entrega)
    }

    const message = messages[0];
    const from = message.from; // Número do cliente (ex: 5511999999999)
    const phoneNumberId = value.metadata.phone_number_id;

    let text = "";

    if (message.type === "text") {
      text = message.text.body.trim();
    } else if (message.type === "interactive") {
      // Resposta de botão ou lista
      text =
        message.interactive?.button_reply?.id ||
        message.interactive?.list_reply?.id ||
        "";
    }

    console.log(`📩 Mensagem de ${from}: "${text}"`);

    await handleIncomingMessage({ from, text, phoneNumberId });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro no webhook:", err.message);
    res.sendStatus(500);
  }
});

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("🟢 Servidor WhatsApp rodando"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
