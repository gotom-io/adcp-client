const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert');
const { registerSchemaOverlay, clearSchemaOverlays, validateRequest } = require('../../dist/lib/index.js');

const REQUEST = {
  idempotency_key: 'idem-key-0123456789',
  account: { account_id: 'account_id_1' },
  brand: { domain: 'adcp-advertiser.example' },
  feed_version: 'feed-1',
  purchases: [{ product_id: 'p1', pricing_option_id: 'o1' }],
  start_time: 'asap',
  end_time: '2027-03-31T23:59:59Z',
  name: 'Autumn Wideboard Q4',
};

describe('registerSchemaOverlay', () => {
  afterEach(() => clearSchemaOverlays());

  test('a field the pinned bundle does not know is refused without an overlay', () => {
    const outcome = validateRequest('buy_products', REQUEST, '3.2.0-beta.6');
    assert.strictEqual(outcome.valid, false);
    assert.ok(outcome.issues.some(i => i.keyword === 'additionalProperties'));
  });

  test('an overlay adds the field and its constraints to the compiled schema', () => {
    registerSchemaOverlay('3.2.0-beta.6', 'buy_products', 'request', {
      properties: { name: { type: 'string', minLength: 1, maxLength: 255, pattern: '\\S' } },
    });
    assert.strictEqual(validateRequest('buy_products', REQUEST, '3.2.0-beta.6').valid, true);
    // the wire form a request carries resolves to the same bundle directory
    assert.strictEqual(validateRequest('buy_products', REQUEST, '3.2-beta.6').valid, true);
    const blank = validateRequest('buy_products', { ...REQUEST, name: '   ' }, '3.2.0-beta.6');
    assert.strictEqual(blank.valid, false);
  });

  test('an overlay on one tool leaves its siblings strict', () => {
    registerSchemaOverlay('3.2.0-beta.6', 'buy_products', 'request', { properties: { name: { type: 'string' } } });
    const { feed_version: _feed, purchases: _purchases, ...rest } = REQUEST;
    const accept = { ...rest, proposal_id: 'p1', proposal_terms_digest: 'sha256:' + 'a'.repeat(43) };
    const outcome = validateRequest('accept_proposal', accept, '3.2.0-beta.6');
    assert.strictEqual(outcome.valid, false);
    assert.ok(outcome.issues.some(i => i.keyword === 'additionalProperties'));
  });
});
