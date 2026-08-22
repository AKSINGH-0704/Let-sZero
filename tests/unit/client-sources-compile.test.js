// Every client source file must actually compile.
//
// ─── Why this exists ─────────────────────────────────────────────────────────
//
// CookiePreferencesDialog.jsx shipped to a release branch in a state where it
// could not be parsed. A JSX block comment documenting the cookie sweep
// contained the wildcard pair `_gcl_*/_gac_*`, and the `*/` inside it closed
// the comment early — everything after it became JSX, and `vite build` failed
// with `Expected "}" but found "path"`.
//
// The full suite was green when that happened. 1505 tests, none of them
// affected, because every single reference to that component read it with
// readFile and asserted on the TEXT. Nothing imported it. It is lazy-loaded, so
// it is not in the entry graph; it renders null until a visitor opens it, so
// prerender never touches it either. `vite build` was the only thing in the
// entire pipeline that would have compiled it, and the build had not been re-run
// since the commit that introduced the defect.
//
// A source-text assertion cannot tell whether the file it just read is a
// program. This one can: esbuild is already a build dependency, transforming a
// file is sub-millisecond, and a file that does not parse fails here by name.
//
// The sweep is derived from the tree rather than a list, so a new component is
// covered the moment it is written.

import { describe, it, expect } from "vitest";
import { readdir, readFile } from "fs/promises";
import { join, dirname, relative, extname } from "path";
import { fileURLToPath } from "url";
import { transformSync } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const ROOTS = ["client/src", "marketing", "shared"];
const SKIP = new Set(["node_modules", "dist", ".vite", "build"]);

async function collect(dir, out = []) {
  let entries;
  try {
    entries = await readdir(join(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) await collect(rel, out);
    } else if ([".js", ".jsx", ".ts", ".tsx"].includes(extname(entry.name))) {
      out.push(rel);
    }
  }
  return out;
}

describe("client sources compile", () => {
  it("parses every client, marketing and shared source file", async () => {
    const files = (await Promise.all(ROOTS.map((r) => collect(r)))).flat();

    // A guard over an empty set passes vacuously. The tree is well over a
    // hundred files; anything near zero means the walk broke, not that the
    // codebase shrank.
    expect(files.length).toBeGreaterThan(100);

    const failures = [];
    for (const file of files) {
      const source = await readFile(join(root, file), "utf8");
      const ext = extname(file);
      const loader = ext === ".tsx" ? "tsx" : ext === ".ts" ? "ts" : "jsx";
      try {
        transformSync(source, { loader, jsx: "automatic" });
      } catch (err) {
        const [first] = err.errors ?? [];
        failures.push(
          `${file}${first?.location ? `:${first.location.line}` : ""} — ${first?.text ?? err.message}`,
        );
      }
    }

    expect(failures, `\n${failures.join("\n")}\n`).toEqual([]);
  });

  it("catches the specific defect class that caused this: */ inside a JSX comment", () => {
    // Direct regression pin. The wildcard pair reads naturally in prose and is
    // exactly the kind of thing a careful comment attracts, so it is worth
    // failing on the shape rather than only on the symptom.
    const broken = `export default function C() {
      return <p>{/* the sweep expires _gcl_*/_gac_* at path=/ only */}ok</p>;
    }`;
    expect(() => transformSync(broken, { loader: "jsx", jsx: "automatic" })).toThrow();
  });
});
