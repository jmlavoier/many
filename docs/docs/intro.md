---
slug: /
sidebar_position: 1
---

# Many

A Bun + TypeScript monorepo that reads personal banking data through [Pluggy](https://pluggy.ai).

## Layout

| Path | What it is |
| --- | --- |
| `packages/core` | Pluggy client and the `balances` script |
| `docs` | This site (Docusaurus) |

## Commands

Run from the repository root:

```bash
bun install         # install all workspaces
bun test            # run tests
bun run typecheck   # type-check packages
bun run balances    # print banks and balances from Pluggy
bun run docs        # start this site at http://localhost:3000
```
