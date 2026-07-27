ALTER TABLE subscriptions ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'active';

UPDATE subscriptions
SET
  plan = 'pro',
  status = 'active',
  updated_at = NOW()
WHERE LOWER(COALESCE(plan, '')) IN ('monthly', 'pro')
  AND status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW());

UPDATE subscriptions
SET
  plan = 'free',
  status = 'active',
  expires_at = NULL,
  updated_at = NOW()
WHERE LOWER(COALESCE(plan, '')) = 'trial'
   OR status <> 'active'
   OR (
     LOWER(COALESCE(plan, '')) IN ('monthly', 'pro')
     AND expires_at IS NOT NULL
     AND expires_at <= NOW()
   );

INSERT INTO subscriptions (user_id, plan, status, expires_at)
SELECT u.id, 'free', 'active', NULL
FROM users u
WHERE COALESCE(u.account_type, 'installer') = 'installer'
  AND u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM subscriptions s
    WHERE s.user_id = u.id
  );
