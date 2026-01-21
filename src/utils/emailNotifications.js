import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

const normalizarPermissao = (usuario) => usuario?.permissao_customizada || usuario?.role || "";

const formatarDetalhesPedido = (solicitacao) => `
  <ul>
    <li><strong>Pedido:</strong> ${solicitacao.numero_pedido}</li>
    <li><strong>Cliente:</strong> ${solicitacao.nome_cliente} (${solicitacao.codigo_cliente})</li>
    <li><strong>Produto:</strong> ${solicitacao.nome_produto}</li>
    <li><strong>Volume:</strong> ${solicitacao.volume_solicitado}</li>
    <li><strong>Valor Total:</strong> R$ ${solicitacao.valor_total?.toFixed(2)}</li>
  </ul>
`;

export const obterEmailsPorPermissao = async (permissoes = []) => {
  if (!permissoes.length) return [];
  const usuarios = await base44.entities.User.list("-created_date", 1000);
  const emails = usuarios
    .filter((usuario) => permissoes.includes(normalizarPermissao(usuario)))
    .map((usuario) => usuario?.email)
    .filter(Boolean);

  return [...new Set(emails)];
};

export const enviarEmailNotificacao = async ({ to, subject, body }) => {
  if (!to) return;
  await base44.integrations.Core.SendEmail({
    to,
    subject,
    body
  });
};

export const enviarEmailSolicitacaoAlteracao = async ({ solicitacao, solicitanteEmail, destinatarios }) => {
  if (!destinatarios?.length) return;
  const corpoEmail = `
    <h2>Nova solicitação de alteração de pedido</h2>
    <p>Uma nova solicitação foi registrada no sistema.</p>
    ${formatarDetalhesPedido(solicitacao)}
    ${solicitanteEmail ? `<p><strong>Solicitante:</strong> ${solicitanteEmail}</p>` : ""}
    <p><em>Data/Hora: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}</em></p>
  `;

  await enviarEmailNotificacao({
    to: destinatarios.join(","),
    subject: `📝 Solicitação de alteração do pedido ${solicitacao.numero_pedido}`,
    body: corpoEmail
  });
};

export const enviarEmailBloqueioPedido = async ({ solicitacao, observacoes, destinatario }) => {
  if (!destinatario) return;
  const corpoEmail = `
    <h2>Pedido bloqueado</h2>
    <p>Sua solicitação foi bloqueada pelo faturamento.</p>
    ${formatarDetalhesPedido(solicitacao)}
    ${observacoes ? `<p><strong>Observações:</strong> ${observacoes}</p>` : ""}
    <p><em>Data/Hora: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}</em></p>
  `;

  await enviarEmailNotificacao({
    to: destinatario,
    subject: `⛔ Pedido ${solicitacao.numero_pedido} bloqueado`,
    body: corpoEmail
  });
};
