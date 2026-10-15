---
sidebar_position: 2
---

# Pluggy client

`@many/core` exposes `createPluggyClient`, which authenticates against the Pluggy API and returns each connected bank with its account balances.

## Configuration

The `balances` script reads these variables from `.env` at the repository root (copy `.env-example` to start):

| Variable | Meaning |
| --- | --- |
| `PLUGGY_CLIENT_ID` | Application client id from the Pluggy dashboard |
| `PLUGGY_CLIENT_SECRET` | Application client secret |
| `PLUGGY_ITEMS` | Comma-separated item ids, one per bank connection |

Pluggy does not let a regular team list all its items, so the item ids must be stored on our side. Add a new id to `PLUGGY_ITEMS` whenever a bank is connected.

## Usage

```ts
import {createPluggyClient} from '@many/core';

const client = createPluggyClient({
  clientId: process.env.PLUGGY_CLIENT_ID!,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
});

const banks = await client.getAllBankBalances(['<item-id>']);
```

Each result has this shape:

```ts
type BankBalances = {
  itemId: string;
  bank: string;      // connector name, e.g. "MeuPluggy" for Meu Pluggy connections
  status: string;    // item status, e.g. "UPDATED"
  accounts: {
    id: string;
    name: string;
    type: 'BANK' | 'CREDIT';
    subtype: string; // CHECKING_ACCOUNT, SAVINGS_ACCOUNT, CREDIT_CARD
    balance: number;
    currencyCode: string;
  }[];
};
```

## Behaviour

- Authenticates once per client instance and reuses the API key (valid for 2 hours).
- Reads every page of `/accounts` for each item.
- A non-2xx response throws `PluggyError` with `status`, `path` and the response `body`.

## Known limitation

Connections made through Meu Pluggy report the connector name `MeuPluggy`, not the underlying bank. The real institution only shows up in the account names.
