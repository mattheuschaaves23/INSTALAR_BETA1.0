-- Fluxo operacional do marketplace, verificacao de e-mail e recuperacao de 2FA.

ALTER TABLE users ADD COLUMN IF NOT EXISTS certification_status VARCHAR(24) NOT NULL DEFAULT 'not_submitted';
ALTER TABLE users ADD COLUMN IF NOT EXISTS certificate_submitted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS certificate_reviewed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS certificate_reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS certificate_rejection_reason TEXT;

UPDATE users
SET certification_status = CASE
  WHEN COALESCE(certification_verified, FALSE) THEN 'approved'
  WHEN NULLIF(TRIM(COALESCE(certificate_file, '')), '') IS NOT NULL THEN 'pending'
  ELSE 'not_submitted'
END
WHERE certification_status IS NULL
   OR certification_status NOT IN ('not_submitted', 'pending', 'approved', 'rejected');

UPDATE users
SET certificate_submitted_at = COALESCE(certificate_submitted_at, updated_at, created_at, NOW())
WHERE certification_status IN ('pending', 'approved', 'rejected')
  AND certificate_submitted_at IS NULL;

-- As contas existentes sao preservadas no rollout. Contas novas ficam pendentes de confirmacao.
UPDATE users
SET email_verified_at = COALESCE(email_verified_at, created_at, NOW())
WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
  ON email_verification_tokens (user_id, expires_at DESC)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(128) NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS two_factor_recovery_codes_user_idx
  ON two_factor_recovery_codes (user_id)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS service_proposals (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
  installer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  scope TEXT NOT NULL,
  materials TEXT,
  notes TEXT,
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'sent',
  client_response_message TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (scheduled_end > scheduled_start),
  CHECK (status IN ('sent', 'change_requested', 'accepted', 'rejected', 'canceled'))
);

CREATE INDEX IF NOT EXISTS service_proposals_installer_status_idx
  ON service_proposals (installer_id, status, scheduled_start);

CREATE TABLE IF NOT EXISTS service_bookings (
  id SERIAL PRIMARY KEY,
  service_request_id INTEGER NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
  proposal_id INTEGER NOT NULL UNIQUE REFERENCES service_proposals(id) ON DELETE CASCADE,
  installer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMP NOT NULL,
  scheduled_end TIMESTAMP NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (scheduled_end > scheduled_start),
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled'))
);

CREATE INDEX IF NOT EXISTS service_bookings_installer_time_idx
  ON service_bookings (installer_id, scheduled_start, scheduled_end)
  WHERE status IN ('scheduled', 'in_progress');

CREATE TABLE IF NOT EXISTS notification_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (platform IN ('android', 'ios', 'web'))
);

CREATE INDEX IF NOT EXISTS notification_devices_user_idx
  ON notification_devices (user_id, active);
