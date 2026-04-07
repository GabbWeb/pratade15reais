import dotenv from "dotenv";
dotenv.config();

const META_API_URL = "https://graph.facebook.com/v19.0";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// ─── Enviar texto simples ─────────────────────────────────────────────────────
export async function sendText(to, phoneNumberId, text) {
  return metaRequest(phoneNumberId, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

// ─── Enviar lista interativa ──────────────────────────────────────────────────
export async function sendMenu(to, phoneNumberId, { header, body, footer, sections }) {
  return metaRequest(phoneNumberId, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header },
      body: { text: body },
      footer: { text: footer },
      action: {
        button: "Ver opções",
        sections,
      },
    },
  });
}

// ─── Enviar botões interativos (até 3 botões) ─────────────────────────────────
export async function sendButtonMessage(to, phoneNumberId, { body, buttons }) {
  return metaRequest(phoneNumberId, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

// ─── Enviar imagem com legenda ────────────────────────────────────────────────
export async function sendImage(to, phoneNumberId, { imageUrl, caption = "" }) {
  return metaRequest(phoneNumberId, {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: { link: imageUrl, caption },
  });
}

// ─── Enviar template (mensagem ativa / promoção) ──────────────────────────────
// Os templates precisam ser aprovados pela Meta antes de usar
export async function sendTemplate(to, phoneNumberId, { templateName, language = "pt_BR", components = [] }) {
  return metaRequest(phoneNumberId, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components,
    },
  });
}

// ─── Função base de envio ─────────────────────────────────────────────────────
async function metaRequest(phoneNumberId, body) {
  try {
    const url = `${META_API_URL}/${phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Erro Meta API:", JSON.stringify(data));
    }

    return data;
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem:", err.message);
  }
}
