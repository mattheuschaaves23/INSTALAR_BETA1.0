const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FREE_PLAN_LIMITS,
  buildPlanAccess,
  isProSubscription,
} = require('../utils/planAccess');

test('plano Grátis mantém acesso ao aplicativo e aplica limites', () => {
  const access = buildPlanAccess({
    subscription: { plan: 'free', status: 'active', expires_at: null },
    usage: { monthly_interests: 3, clients: 4, monthly_budgets: 2 },
  });

  assert.equal(access.plan, 'free');
  assert.equal(access.can_use_app, true);
  assert.equal(access.is_pro, false);
  assert.deepEqual(access.limits, FREE_PLAN_LIMITS);
  assert.equal(access.remaining.monthly_interests, 2);
  assert.equal(access.features.installment_budgets, true);
});

test('plano Pro ativo libera recursos avançados e uso ilimitado', () => {
  const subscription = {
    plan: 'pro',
    status: 'active',
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  };
  const access = buildPlanAccess({ subscription });

  assert.equal(isProSubscription(subscription), true);
  assert.equal(access.plan, 'pro');
  assert.equal(access.is_pro, true);
  assert.equal(access.limits.monthly_interests, null);
  assert.equal(access.features.advanced_dashboard, true);
});

test('plano Pro vencido volta a ser tratado como Grátis', () => {
  const access = buildPlanAccess({
    subscription: {
      plan: 'pro',
      status: 'active',
      expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    },
  });

  assert.equal(access.plan, 'free');
  assert.equal(access.can_use_app, true);
});
