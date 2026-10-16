import { describe, expect, it } from "vitest";
import { config, worldProjects } from "@/config/portfolio";
import { SUGGESTIONS, botReply } from "./botAnswers";

describe("Ezra Bot's answers", () => {
  it("answers every quick question with something of its own", () => {
    const texts = SUGGESTIONS.map((s) => botReply(s).text);
    expect(new Set(texts).size).toBe(SUGGESTIONS.length);
    for (const t of texts) expect(t).not.toMatch(/I only know/);
  });

  it("answers a project by name from its own line, numbers and link", () => {
    const gtid = worldProjects.find((p) => p.id === "gtid")!;
    const r = botReply("tell me about GTID");
    expect(r.text).toContain(gtid.line);
    expect(r.link?.href).toBe(gtid.links.demo);
  });

  it("offers the contact form and the email address when asked how to reach him", () => {
    const r = botReply("how can I email Ezra?");
    expect(r.contact).toBe(true);
    expect(r.text).toContain(config.personal.email);
  });

  it("falls back politely to what it knows", () => {
    expect(botReply("what is the weather").text).toMatch(/I only know/);
  });
});
