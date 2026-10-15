import { expect, test } from "bun:test";
import { name } from "@many/core";

test("workspace package resolves", () => {
  expect(name).toBe("many");
});
