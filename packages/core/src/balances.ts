// Prints every connected bank with its account balances. Bun loads .env from the cwd.
import { createPluggyClient } from "./pluggy.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in environment`);
  return value;
}

const client = createPluggyClient({
  clientId: requireEnv("PLUGGY_CLIENT_ID"),
  clientSecret: requireEnv("PLUGGY_CLIENT_SECRET"),
});

const itemIds = requireEnv("PLUGGY_ITEMS")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

for (const bank of await client.getAllBankBalances(itemIds)) {
  console.log(`\n${bank.bank} (${bank.status})`);
  for (const a of bank.accounts) {
    const amount = a.balance.toLocaleString("pt-BR", { style: "currency", currency: a.currencyCode });
    console.log(`  ${a.name} [${a.subtype}]: ${amount}`);
  }
}
