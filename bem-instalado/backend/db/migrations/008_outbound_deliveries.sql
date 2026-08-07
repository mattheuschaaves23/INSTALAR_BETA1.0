-- Transactional outbox for emails. A request can finish safely even if SMTP is
-- temporarily unavailable; delivery is retried by the protected operations job.

CREATE TABLE IF NOT EXISTS outbound_deliveries (
  id BIGSERIAL PRIMARY KEY,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  recipient VARCHAR(320) NOT NULL,
  payload JSONB NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'transactional',
  idempotency_key VARCHAR(180) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TIMESTAMP,
  sent_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (channel IN ('email')),
  CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  CHECK (attempts >= 0),
  CHECK (max_attempts BETWEEN 1 AND 12)
);

CREATE INDEX IF NOT EXISTS outbound_deliveries_pending_idx
  ON outbound_deliveries (status, next_attempt_at, created_at)
  WHERE status IN ('pending', 'processing');
