// validation.warnOnlyRequestTools: a tool listed there is validated in 'warn'
// mode even when the framework enforces the official request schema, so the
// handler can answer a schema-invalid entry with the per-entry domain error the
// spec asks for (notification_config_event_scope: a media-buy-anchored event
// type must fail its sync_accounts entry, not the request).
process.env.NODE_ENV = 'test';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createAdcpServerFromPlatform } = require('../../dist/lib/server/decisioning/runtime/from-platform');

function buildPlatform(upsertCalls) {
  return {
    capabilities: {
      specialisms: ['sales-non-guaranteed'],
      creative_agents: [],
      channels: ['display'],
      pricingModels: ['cpm'],
      config: {},
    },
    accounts: {
      resolve: async () => null,
      upsert: async refs => {
        upsertCalls.push(refs);
        return [];
      },
      list: async () => ({ items: [], nextCursor: null }),
    },
    statusMappers: {},
    sales: {
      getProducts: async () => ({ cache_scope: 'account', products: [] }),
      createMediaBuy: async () => ({ media_buy_id: 'mb_1' }),
      updateMediaBuy: async () => ({ media_buy_id: 'mb_1' }),
      syncCreatives: async () => [],
      getMediaBuyDelivery: async () => ({ media_buys: [] }),
    },
  };
}

const SCHEDULED_REGISTRATION = {
  idempotency_key: '7f2c7a1e-4b1d-4c55-9e8a-3c1f0d6a2b90',
  accounts: [
    {
      brand: { domain: 'acmeoutdoor.example' },
      operator: 'pinnacle-agency.example',
      billing: 'agent',
      notification_configs: [{ subscriber_id: 'sub_1', url: 'https://hooks.example/adcp', event_types: ['scheduled'] }],
    },
  ],
};

async function invokeSyncAccounts(validation) {
  const upsertCalls = [];
  const server = createAdcpServerFromPlatform(buildPlatform(upsertCalls), {
    name: 'warn-only-test',
    version: '0.0.1',
    validation,
  });
  const result = await server.invoke({
    toolName: 'sync_accounts',
    args: SCHEDULED_REGISTRATION,
    enforceRequestSchema: true,
  });
  return { result, upsertCalls };
}

describe('validation.warnOnlyRequestTools', () => {
  it('without it, an enforced schema rejects the whole sync_accounts request', async () => {
    const { result, upsertCalls } = await invokeSyncAccounts({ requests: 'strict', responses: 'off' });

    assert.strictEqual(result.structuredContent?.adcp_error?.code, 'VALIDATION_ERROR');
    assert.strictEqual(upsertCalls.length, 0);
  });

  it('with sync_accounts listed, the request reaches the handler', async () => {
    const { upsertCalls } = await invokeSyncAccounts({
      requests: 'strict',
      responses: 'off',
      warnOnlyRequestTools: ['sync_accounts'],
    });

    assert.strictEqual(upsertCalls.length, 1);
  });
});
