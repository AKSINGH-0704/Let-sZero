// Verifies the Resource Center's internal knowledge graph actually connects.
//
// Every internal link in article bodies and frontmatter (prerequisites, nextStep)
// must resolve to a real, published destination. A broken internal link is worse
// than a missing one: it costs a reader their place and it leaks crawl budget into
// a 404, which is the opposite of what a topical-authority cluster is for.

import { describe, it, expect, beforeAll } from "vitest";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { loadAuthors, loadArticles } from "../../shared/content/loader.js";
import { PRODUCTS } from "../../shared/content/taxonomy.js";

const CONTENT = path.resolve(import.meta.dirname, "..", "..", "client", "src", "content");
const PRODUCT = "repmail";
const BASE = "/repmail/learn";

let articles, validTargets, rawByslug;

beforeAll(async () => {
  const authors = await loadAuthors(CONTENT, PRODUCT, { log: () => {} });
  articles = await loadArticles(CONTENT, PRODUCT, authors, { log: () => {} });

  const readJson = async (sub) => {
    const dir = path.join(CONTENT, PRODUCT, sub);
    const out = [];
    for (const f of (await readdir(dir)).filter((f) => f.endsWith(".json"))) {
      out.push(JSON.parse(await readFile(path.join(dir, f), "utf-8")));
    }
    return out;
  };

  validTargets = new Set([BASE, `${BASE}/guides`, "/products/repmail", "/pricing", "/contact", "/repmail/changelog"]);
  for (const a of articles) validTargets.add(`${BASE}/${a.academy.slug}/${a.slug}`);
  for (const acad of PRODUCTS[PRODUCT].academies) {
    if (articles.some((a) => a.academy.slug === acad.slug)) validTargets.add(`${BASE}/${acad.slug}`);
  }
  for (const a of authors.values()) validTargets.add(`${BASE}/authors/${a.slug}`);
  for (const p of await readJson("paths")) validTargets.add(`${BASE}/paths/${p.slug}`);
  for (const c of await readJson("collections")) validTargets.add(`${BASE}/collections/${c.slug}`);

  rawByslug = new Map();
  for (const a of articles) {
    rawByslug.set(a.slug, await readFile(path.join(CONTENT, PRODUCT, a.academy.slug, `${a.slug}.md`), "utf-8"));
  }
});

function internalLinksIn(raw) {
  const links = new Set();
  // markdown body links
  for (const m of raw.matchAll(/\]\((\/[^)\s]+)\)/g)) links.add(m[1]);
  // frontmatter href: values (prerequisites, nextStep)
  for (const m of raw.matchAll(/^\s*href:\s*"?(\/[^"\s]+)"?\s*$/gm)) links.add(m[1]);
  return [...links];
}

describe("internal link graph", () => {
  it("every internal link resolves to a real published destination", () => {
    const broken = [];
    for (const [slug, raw] of rawByslug) {
      for (const href of internalLinksIn(raw)) {
        const clean = href.split("#")[0].replace(/\/$/, "");
        if (!validTargets.has(clean)) broken.push(`${slug}.md -> ${href}`);
      }
    }
    expect(broken, `broken internal links:\n${broken.join("\n")}`).toEqual([]);
  });

  it("no article links to itself", () => {
    const selfLinks = [];
    for (const [slug, raw] of rawByslug) {
      const article = articles.find((a) => a.slug === slug);
      const self = `${BASE}/${article.academy.slug}/${slug}`;
      if (internalLinksIn(raw).some((h) => h.split("#")[0] === self)) selfLinks.push(slug);
    }
    expect(selfLinks).toEqual([]);
  });

  it("every article is reachable from at least one other article, a collection, or a path", async () => {
    const readJson = async (sub) => {
      const dir = path.join(CONTENT, PRODUCT, sub);
      const out = [];
      for (const f of (await readdir(dir)).filter((f) => f.endsWith(".json"))) {
        out.push(JSON.parse(await readFile(path.join(dir, f), "utf-8")));
      }
      return out;
    };

    const referenced = new Set();
    for (const [slug, raw] of rawByslug) {
      for (const href of internalLinksIn(raw)) {
        const m = /^\/repmail\/learn\/[^/]+\/([^/#?]+)/.exec(href);
        if (m && m[1] !== slug) referenced.add(m[1]);
      }
    }
    for (const c of await readJson("collections")) for (const s of c.articleSlugs) referenced.add(s);
    for (const p of await readJson("paths")) for (const s of p.steps) referenced.add(s);

    // Every article also appears on its Academy hub and All Guides, so this is a
    // check on the editorial graph rather than on raw reachability.
    const orphans = articles.map((a) => a.slug).filter((s) => !referenced.has(s));
    expect(orphans, `articles in no collection, path, or inbound link:\n${orphans.join("\n")}`).toEqual([]);
  });

  // The commercial cluster is the point of the Outreach academy: a reader landing
  // on any one competitor page should be able to reach that competitor's other
  // intents without going back to a hub.
  it("each competitor cluster cross-links its comparison, alternative, pricing, and review pages", () => {
    const clusters = {
      instantly: ["instantly-vs-repmail", "best-instantly-alternative", "instantly-pricing", "instantly-review"],
      smartlead: ["smartlead-vs-repmail", "best-smartlead-alternative", "smartlead-pricing", "smartlead-review"],
      lemlist: ["lemlist-vs-repmail", "best-lemlist-alternative", "lemlist-pricing", "lemlist-review"],
      apollo: ["apollo-vs-repmail", "best-apollo-alternative", "apollo-pricing", "apollo-review"],
    };

    const problems = [];
    for (const [vendor, slugs] of Object.entries(clusters)) {
      for (const slug of slugs) {
        const raw = rawByslug.get(slug);
        if (!raw) { problems.push(`${vendor}: missing article ${slug}`); continue; }
        const links = internalLinksIn(raw).join(" ");
        const siblings = slugs.filter((s) => s !== slug);
        const linked = siblings.filter((s) => links.includes(`/${s}`));
        if (linked.length === 0) problems.push(`${slug} links to none of its ${vendor} siblings`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
