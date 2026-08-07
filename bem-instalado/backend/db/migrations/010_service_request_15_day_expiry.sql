-- Pedidos ficam disponíveis para instaladores por no máximo 15 dias.
ALTER TABLE service_requests
  ALTER COLUMN expires_at SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 days');

-- Ajusta pedidos abertos que ainda usavam a regra anterior de 30 dias.
UPDATE service_requests
SET
  expires_at = COALESCE(created_at, NOW()) + INTERVAL '15 days',
  updated_at = NOW()
WHERE status = 'open'
  AND (expires_at IS NULL OR expires_at > COALESCE(created_at, NOW()) + INTERVAL '15 days');

-- Os que já ultrapassaram o novo prazo deixam de ser oportunidades imediatamente.
UPDATE service_requests
SET
  status = 'expired',
  updated_at = NOW()
WHERE status = 'open'
  AND expires_at IS NOT NULL
  AND expires_at <= NOW();
