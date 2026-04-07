import { sendText, sendMenu, sendButtonMessage } from "./whatsapp.js";
import { getOrdersByPhone, getProductCatalog } from "./tray.js";
import { getSession, saveSession } from "./session.js";

// ─── Roteador principal ──────────────────────────────────────────────────────
export async function handleIncomingMessage({ from, text, phoneNumberId }) {
  const session = await getSession(from);
  const input = text.toLowerCase().trim();

  // Se atendente humano assumiu o controle, não interferir
  if (session.humanTakeover) {
    console.log(`👤 Atendente humano ativo para ${from}, ignorando bot`);
    return;
  }

  // ─── Comandos globais (funcionam em qualquer etapa) ────────────────────────
  if (["menu", "início", "inicio", "0", "voltar"].includes(input)) {
    await saveSession(from, { step: "menu" });
    return sendMenuPrincipal(from, phoneNumberId);
  }

  if (["humano", "atendente", "falar com alguém"].includes(input)) {
    await saveSession(from, { step: "human", humanTakeover: true });
    await sendText(from, phoneNumberId,
      "👩‍💼 Vou te passar para uma atendente agora. Um momento! 🙏\n\nSe quiser voltar ao menu automático, envie *menu*."
    );
    // Aqui você pode notificar a equipe via outro canal (ex: Slack, email)
    return notifyHumanAgent(from, session);
  }

  // ─── Roteamento por etapa da sessão ────────────────────────────────────────
  switch (session.step) {
    case "menu":
    default:
      return handleMenu(from, input, phoneNumberId, session);

    case "catalogo":
      return handleCatalogo(from, input, phoneNumberId, session);

    case "pedidos":
      return handlePedidos(from, input, phoneNumberId, session);

    case "atacado_info":
      return handleAtacadoInfo(from, input, phoneNumberId, session);
  }
}

// ─── Menu principal ──────────────────────────────────────────────────────────
async function sendMenuPrincipal(from, phoneNumberId) {
  await sendMenu(from, phoneNumberId, {
    header: "💍 Prata de 15 Reais — Atacado",
    body: "Olá, revendedora! Como posso te ajudar hoje?",
    footer: "Responda com o número da opção",
    sections: [
      {
        title: "O que você precisa?",
        rows: [
          { id: "1", title: "📦 Ver catálogo", description: "Prata 925 no atacado" },
          { id: "2", title: "🛒 Meus pedidos", description: "Consultar status" },
          { id: "3", title: "💰 Preços e promoções", description: "Tabela de atacado" },
          { id: "4", title: "📋 Como revender", description: "Informações para início" },
          { id: "5", title: "👩‍💼 Falar com atendente", description: "Atendimento humano" },
        ],
      },
    ],
  });
}

async function handleMenu(from, input, phoneNumberId, session) {
  switch (input) {
    case "1":
      await saveSession(from, { step: "catalogo" });
      return handleCatalogo(from, "inicio", phoneNumberId, session);

    case "2":
      await saveSession(from, { step: "pedidos" });
      return handlePedidos(from, "inicio", phoneNumberId, session);

    case "3":
      return sendPrecos(from, phoneNumberId);

    case "4":
      await saveSession(from, { step: "atacado_info" });
      return sendComoRevender(from, phoneNumberId);

    case "5":
      return handleIncomingMessage({ from, text: "humano", phoneNumberId });

    default:
      // Primeira mensagem ou texto não reconhecido — mostrar menu
      await saveSession(from, { step: "menu" });
      return sendMenuPrincipal(from, phoneNumberId);
  }
}

// ─── Catálogo ────────────────────────────────────────────────────────────────
async function handleCatalogo(from, input, phoneNumberId, session) {
  if (input === "inicio") {
    const catalog = await getProductCatalog({ limit: 5 });

    if (!catalog || catalog.length === 0) {
      return sendText(from, phoneNumberId,
        "📦 Catálogo temporariamente indisponível. Tente novamente em instantes ou acesse:\n\n🔗 https://pratade15reais.com.br\n\nDigite *0* para voltar ao menu."
      );
    }

    let msg = "📦 *Destaques do catálogo — Prata 925:*\n\n";
    catalog.forEach((p, i) => {
      msg += `*${i + 1}. ${p.name}*\n`;
      msg += `   💰 Atacado: R$ ${Number(p.price).toFixed(2)}\n`;
      if (p.stock > 0) {
        msg += `   ✅ Em estoque: ${p.stock} unid.\n`;
      } else {
        msg += `   ⚠️ Sob consulta\n`;
      }
      msg += "\n";
    });

    msg += "🔗 Catálogo completo: https://pratade15reais.com.br\n\n";
    msg += "Digite *0* para voltar ao menu ou *5* para falar com atendente.";

    return sendText(from, phoneNumberId, msg);
  }

  // Qualquer outra entrada no estado catalogo → voltar ao menu
  await saveSession(from, { step: "menu" });
  return sendMenuPrincipal(from, phoneNumberId);
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────
async function handlePedidos(from, input, phoneNumberId, session) {
  if (input === "inicio") {
    await sendText(from, phoneNumberId,
      "🛒 Consultando seus pedidos... aguarde um momento!"
    );

    // Busca pedidos pelo número de telefone
    const phone = from.replace(/\D/g, ""); // limpa o número
    const orders = await getOrdersByPhone(phone);

    if (!orders || orders.length === 0) {
      return sendText(from, phoneNumberId,
        "🛒 Não encontrei pedidos vinculados a este número.\n\n" +
        "Se você fez um pedido, envie o *número do pedido* ou acesse:\n" +
        "🔗 https://pratade15reais.com.br/minha-conta\n\n" +
        "Digite *0* para voltar ao menu."
      );
    }

    let msg = "🛒 *Seus últimos pedidos:*\n\n";
    orders.slice(0, 5).forEach((o) => {
      const statusEmoji = {
        aprovado: "✅",
        enviado: "🚚",
        entregue: "📦",
        cancelado: "❌",
        pendente: "⏳",
      }[o.status?.toLowerCase()] || "📋";

      msg += `${statusEmoji} *Pedido #${o.id}*\n`;
      msg += `   Status: ${o.status}\n`;
      msg += `   Total: R$ ${Number(o.total).toFixed(2)}\n`;
      if (o.tracking) msg += `   Rastreio: ${o.tracking}\n`;
      msg += "\n";
    });

    msg += "Digite *0* para voltar ao menu ou *5* para falar com atendente.";
    return sendText(from, phoneNumberId, msg);
  }

  await saveSession(from, { step: "menu" });
  return sendMenuPrincipal(from, phoneNumberId);
}

// ─── Preços ──────────────────────────────────────────────────────────────────
async function sendPrecos(from, phoneNumberId) {
  const msg =
    "💰 *Tabela de Atacado — Prata 925:*\n\n" +
    "🏷️ *Promoção atual:* 50% + 20% OFF\n\n" +
    "📦 Pedido mínimo: 10 peças\n" +
    "🚚 Frete grátis acima de R$ 300\n" +
    "💳 Parcelamento em até 6x sem juros\n\n" +
    "Para ver preços por produto, acesse:\n" +
    "🔗 https://pratade15reais.com.br/atacado\n\n" +
    "Quer uma *cotação personalizada*? Digite *5* para falar com nossa equipe.\n\n" +
    "Digite *0* para voltar ao menu.";

  return sendText(from, phoneNumberId, msg);
}

// ─── Como revender ───────────────────────────────────────────────────────────
async function sendComoRevender(from, phoneNumberId) {
  const msg =
    "📋 *Como se tornar revendedora Prata de 15 Reais:*\n\n" +
    "✅ Sem necessidade de CNPJ\n" +
    "✅ Pedido mínimo acessível\n" +
    "✅ Prata 925 certificada\n" +
    "✅ Suporte exclusivo para revendedoras\n\n" +
    "🚀 *Primeiros passos:*\n" +
    "1. Acesse pratade15reais.com.br/atacado\n" +
    "2. Cadastre-se como revendedora\n" +
    "3. Faça seu primeiro pedido com desconto especial\n\n" +
    "Dúvidas? Digite *5* para falar com uma atendente.\n" +
    "Digite *0* para voltar ao menu.";

  return sendText(from, phoneNumberId, msg);
}

// ─── Notifica atendente humano ───────────────────────────────────────────────
async function notifyHumanAgent(from, session) {
  // Aqui você pode integrar com Slack, email, ou painel interno
  // Exemplo simples: log no console
  console.log(`🔔 ATENDIMENTO HUMANO NECESSÁRIO`);
  console.log(`   Cliente: ${from}`);
  console.log(`   Última etapa: ${session.step || "início"}`);
  // TODO: Integrar com Slack ou sistema de tickets
}
