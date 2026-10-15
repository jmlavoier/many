const DEFAULT_BASE_URL = "https://api.pluggy.ai";

export type PluggyConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};

export type AccountBalance = {
  id: string;
  name: string;
  type: "BANK" | "CREDIT";
  subtype: string;
  balance: number;
  currencyCode: string;
};

export type BankBalances = {
  itemId: string;
  bank: string;
  status: string;
  accounts: AccountBalance[];
};

type Item = { id: string; status: string; connector: { name: string } };
type AccountsPage = { results: AccountBalance[]; page: number; totalPages: number };

export class PluggyError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: string,
  ) {
    super(`Pluggy ${path} failed with ${status}: ${body}`);
  }
}

export function createPluggyClient(config: PluggyConfig) {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = config.fetch ?? fetch;
  let apiKey: Promise<string> | undefined;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await doFetch(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
    if (!res.ok) throw new PluggyError(res.status, path, await res.text());
    return (await res.json()) as T;
  }

  // The API key is valid for 2 hours, which outlives any single run of this client.
  function authenticate(): Promise<string> {
    apiKey ??= request<{ apiKey: string }>("/auth", {
      method: "POST",
      body: JSON.stringify({ clientId: config.clientId, clientSecret: config.clientSecret }),
    }).then((r) => r.apiKey);
    return apiKey;
  }

  async function get<T>(path: string): Promise<T> {
    return request<T>(path, { headers: { "X-API-KEY": await authenticate() } });
  }

  async function listAccounts(itemId: string): Promise<AccountBalance[]> {
    const accounts: AccountBalance[] = [];
    for (let page = 1; ; page++) {
      const res = await get<AccountsPage>(
        `/accounts?itemId=${encodeURIComponent(itemId)}&page=${page}`,
      );
      accounts.push(...res.results);
      if (page >= res.totalPages) return accounts;
    }
  }

  async function getBankBalances(itemId: string): Promise<BankBalances> {
    const [item, accounts] = await Promise.all([
      get<Item>(`/items/${encodeURIComponent(itemId)}`),
      listAccounts(itemId),
    ]);
    return {
      itemId,
      bank: item.connector.name,
      status: item.status,
      accounts: accounts.map(({ id, name, type, subtype, balance, currencyCode }) => ({
        id,
        name,
        type,
        subtype,
        balance,
        currencyCode,
      })),
    };
  }

  // Pluggy does not let a client list all its items, so callers pass the item ids they stored.
  function getAllBankBalances(itemIds: string[]): Promise<BankBalances[]> {
    return Promise.all(itemIds.map(getBankBalances));
  }

  return { getBankBalances, getAllBankBalances };
}
