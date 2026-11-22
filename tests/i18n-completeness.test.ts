import { describe, expect, it } from "vitest";
import { parse } from "@formatjs/icu-messageformat-parser";
import en from "../src/i18n/en.json";
import es from "../src/i18n/es.json";
import { messages } from "../src/i18n/messages";

describe("English and Spanish catalogs", () => {
  it("has identical key sets and parses each catalog as ICU", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const text of [...Object.values(en), ...Object.values(es)]) expect(() => parse(text)).not.toThrow();
  });
  it("declares each message ID in both catalogs", () => {
    expect(Object.values(messages).map(message => message.id).sort()).toEqual(Object.keys(en).sort());
    for (const { id } of Object.values(messages)) {
      expect(en).toHaveProperty(id);
      expect(es).toHaveProperty(id);
    }
  });
});
