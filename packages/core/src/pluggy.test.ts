import { expect, test } from "bun:test";
import { createPluggyClient, PluggyError } from "./pluggy.ts";

function fakeFetch(routes: Record<string, unknown>, calls: string[] = []) {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const key = url.pathname + url.search;
    calls.push(`${init?.method ?? "GET"} ${key}`);
    if (key !== "/auth" && new Headers(init?.headers).get("X-API-KEY") !== "key") {
      return new Response("unauthorized", { status: 401 });
    }
    if (!(key in routes)) return new Response("not found", { status: 404 });
    return Response.json(routes[key]);
  }) as typeof fetch;
}

const account = (id: string, balance: number) => ({
  id,
  name: `Account ${id}`,
  type: "BANK",
  subtype: "CHECKING_ACCOUNT",
  balance,
  currencyCode: "BRL",
  number: "0001/1",
});

test("returns each bank with all accounts across pages, authenticating once", async () => {
  const calls: string[] = [];
  const client = createPluggyClient({
    clientId: "id",
    clientSecret: "secret",
    fetch: fakeFetch(
      {
        "/auth": { apiKey: "key" },
        "/items/i1": { id: "i1", status: "UPDATED", connector: { name: "Nubank" } },
        "/accounts?itemId=i1&page=1": { page: 1, totalPages: 2, results: [account("a1", 10)] },
        "/accounts?itemId=i1&page=2": { page: 2, totalPages: 2, results: [account("a2", 20.5)] },
        "/items/i2": { id: "i2", status: "UPDATED", connector: { name: "Itaú" } },
        "/accounts?itemId=i2&page=1": { page: 1, totalPages: 1, results: [] },
      },
      calls,
    ),
  });

  const banks = await client.getAllBankBalances(["i1", "i2"]);

  expect(banks).toEqual([
    {
      itemId: "i1",
      bank: "Nubank",
      status: "UPDATED",
      accounts: [
        { id: "a1", name: "Account a1", type: "BANK", subtype: "CHECKING_ACCOUNT", balance: 10, currencyCode: "BRL" },
        { id: "a2", name: "Account a2", type: "BANK", subtype: "CHECKING_ACCOUNT", balance: 20.5, currencyCode: "BRL" },
      ],
    },
    { itemId: "i2", bank: "Itaú", status: "UPDATED", accounts: [] },
  ]);
  expect(calls.filter((c) => c === "POST /auth")).toHaveLength(1);
});

test("surfaces API errors with status and path", async () => {
  const client = createPluggyClient({
    clientId: "id",
    clientSecret: "secret",
    fetch: fakeFetch({ "/auth": { apiKey: "key" } }),
  });

  const err = await client.getBankBalances("missing").catch((e) => e);
  expect(err).toBeInstanceOf(PluggyError);
  expect(err.status).toBe(404);
});
