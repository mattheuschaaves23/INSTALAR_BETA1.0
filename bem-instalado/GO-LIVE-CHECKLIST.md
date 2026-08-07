# Checklist de lançamento do InstalaPro

Este arquivo separa o que já existe no código do que depende de uma configuração real do provedor, de uma decisão comercial ou de um teste humano. Não marque um item externo como concluído apenas porque o deploy passou.

## Configurar na Vercel

Cadastre em Preview e Production: `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `APP_URL`, `TWO_FACTOR_ENCRYPTION_KEY`, variáveis SMTP, credenciais Asaas, `OPERATIONS_TOKEN`, `ALERT_WEBHOOK_URL` e `ALERT_WEBHOOK_AUTHORIZATION` quando usados.

`OPERATIONS_TOKEN` deve ser longo, exclusivo e nunca pode entrar no código, navegador, screenshot ou monitor público. A senha de aplicativo Gmail compartilhada durante a configuração anterior deve ser revogada no Google e recriada; a nova senha fica somente nas variáveis da Vercel.

## Monitoramento e fila de e-mail

O health check público é `GET /api/health`. Ele devolve somente o estado e o horário; use-o num monitor de uptime a cada cinco minutos, com alerta após duas falhas consecutivas.

Os e-mails transacionais são registrados em `outbound_deliveries`. A rotina protegida abaixo faz novas tentativas de envio e precisa ser chamada por um cron externo confiável a cada cinco minutos:

```bash
curl -X POST https://SEU-DOMINIO/api/operations/run \
  -H "Authorization: Bearer SEU_OPERATIONS_TOKEN"
```

`GET /api/operations/status` mostra o resumo interno de entregas e também exige o mesmo token. `ALERT_WEBHOOK_URL` envia alertas de erros 5xx e entrega de e-mail esgotada sem dados pessoais ou segredos. Confirme o alerta fazendo uma falha controlada de SMTP antes do lançamento.

## Backup e restauração

Configurar no provedor PostgreSQL, antes de clientes reais:

1. backup automático diário, retenção mínima de 30 dias e cópia criptografada em outra conta/local;
2. backup diário dos arquivos/documentos do armazenamento;
3. duas pessoas autorizadas a restaurar, com acesso guardado em cofre;
4. teste mensal em banco isolado: restaurar uma cópia, aplicar migrations e conferir conta fictícia, pedido, proposta, agenda e arquivo.

Registre data, responsável, backup usado, duração e resultado de cada restauração. Nunca teste restaurando sobre produção. Os prazos de retenção de dados fiscais, financeiros e de segurança precisam de validação jurídica e contábil.

## Segurança e privacidade

- Web usa sessão `HttpOnly` e CSRF; aplicativo nativo usa token somente no armazenamento seguro.
- Novas contas por senha confirmam e-mail antes de ações sensíveis.
- 2FA usa segredo criptografado e códigos de recuperação de uso único.
- A pessoa pode baixar os próprios dados no painel, em **Configurações > Privacidade**. Senhas, segredos 2FA e tokens não entram no arquivo.
- Solicitações LGPD de clientes ou pessoas sem login vão para `beminstaladohd@gmail.com`; registre identidade, escopo, data e resposta. Meta operacional: até 15 dias, salvo obrigação legal diferente.
- O upload valida formato e tamanho, mas antivírus/quarentena requer um serviço externo. Não anuncie análise antifraude automática até conectar um scanner e aprovar o processo de revisão.

## Push

O painel tem a ativação de notificações no navegador e o service worker está pronto para recebê-las fechado. Para ativar de verdade, ainda é necessário instalar `web-push` no backend, gerar VAPID e cadastrar:

```text
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:suporte@seu-dominio.com.br
REACT_APP_WEB_PUSH_VAPID_PUBLIC_KEY=
```

A chave privada nunca vai ao frontend. Android/iPhone continuam exigindo Firebase, APNs e teste em aparelho físico com o app fechado.

## Comercial e suporte

Antes de divulgar, defina por escrito: cancelamento, visita sem execução, atraso, reagendamento, reembolso, garantia, disputa, responsabilidade da plataforma e prazo de resposta do suporte. A proposta aceita precisa registrar valor, escopo, materiais, horário, garantia e a versão dos termos. O texto do produto é uma base operacional; revisão jurídica é necessária para a operação comercial específica.

## Homologação e piloto

Em banco de homologação e Asaas Sandbox, execute e registre o fluxo inteiro:

1. cadastro por senha, confirmação de e-mail, login, 2FA e recuperação;
2. pedido, interesse, escolha de instalador, proposta, aceite, agenda, pagamento e conclusão;
3. webhook pago, estorno e prevenção de conflito simultâneo de agenda;
4. SMTP indisponível, rotina de reenvio, alerta e push;
5. Android/iPhone/Chrome reais, internet lenta, teclado, leitor de tela e tela de 320 px.

Faça então um piloto de uma semana com aproximadamente 10 instaladores e 20 clientes. Acompanhe taxa de conclusão, tempo até primeira proposta, cancelamentos, disputa e chamados. Só abra campanha pública depois de uma semana sem incidente crítico.
