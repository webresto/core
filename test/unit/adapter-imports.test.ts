import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

/**
 * Guards the adapter form: `adapters/<x>/` holds only the abstract `<X>Adapter.ts`
 * and `default/`, and everything outside reaches an adapter through
 * `adapters/index`. There is no linter in the project, so this test is the rule.
 *
 * `adapters/delivery/` has a special status and is not checked at all, neither
 * inside nor as an import target. Tests are not scanned: they construct default
 * implementations and fakes directly.
 */

const CORE = path.resolve(__dirname, "../..");
const ADAPTERS = path.join(CORE, "adapters");
const GRAPHQL_SRC = path.resolve(CORE, "../graphql/src");
const PACKAGE = "@webresto/core";
const EXEMPT = "delivery";
const INDEX = path.join(ADAPTERS, "index.ts");

const CORE_SOURCES = ["models", "lib", "hook", "interfaces", "adapters"].map((dir) => path.join(CORE, dir));

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function typescriptIn(dirs: string[]): string[] {
  return dirs.flatMap(walk).filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"));
}

function shown(file: string): string {
  return path.relative(path.dirname(CORE), file).split(path.sep).join("/");
}

/** Import specifiers of a file; whole-line `//` comments and block comments are skipped. */
function specifiers(file: string): string[] {
  const code = fs
    .readFileSync(file, "utf8")
    .replace(/^\s*\/\*[\s\S]*?\*\//gm, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return [...code.matchAll(/\b(?:from|import|require)\s*\(?\s*["']([^"'\n]+)["']/g)].map((match) => match[1]);
}

/** Absolute path of an in-core import without extension, or null for other packages. */
function resolve(file: string, spec: string): string | null {
  let target: string;
  if (spec.startsWith(".")) target = path.resolve(path.dirname(file), spec);
  else if (spec === PACKAGE || spec.startsWith(PACKAGE + "/")) target = path.join(CORE, spec.slice(PACKAGE.length));
  else return null;
  return target.replace(/\.(ts|js)$/, "");
}

/** Path under `adapters/` split into segments, or null when the path is outside it. */
function underAdapters(target: string): string[] | null {
  const relative = path.relative(ADAPTERS, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative.split(path.sep);
}

function adapterOf(target: string): string | null {
  const parts = underAdapters(target);
  if (!parts || parts[0] === "" || parts.join("/") === "index") return null;
  return parts[0];
}

function isAbstractFile(adapter: string, name: string): boolean {
  return name.toLowerCase() === `${adapter.toLowerCase()}adapter.ts`;
}

function importViolations(files: string[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    const own = adapterOf(file);
    if (own === EXEMPT) continue;
    for (const spec of specifiers(file)) {
      const target = resolve(file, spec);
      if (!target) continue;
      const adapter = adapterOf(target);
      if (!adapter || adapter === EXEMPT) continue;

      if (adapter !== own && file !== INDEX) {
        violations.push(`${shown(file)} → ${spec}`);
        continue;
      }

      const parts = underAdapters(file)!;
      if (adapter === own && parts.length === 2 && isAbstractFile(own, parts[1]) && underAdapters(target)![1] === "default") {
        violations.push(`${shown(file)} → ${spec}`);
      }
    }
  }
  return violations;
}

describe("adapter form", function () {
  const adapters = fs
    .readdirSync(ADAPTERS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== EXEMPT)
    .map((entry) => entry.name);

  it("adapters/<x>/ holds only <X>Adapter.ts and default/", function () {
    const violations: string[] = [];
    for (const adapter of adapters) {
      const dir = path.join(ADAPTERS, adapter);
      const files = walk(dir).map((file) => path.relative(dir, file).split(path.sep));
      if (!files.some((parts) => parts.length === 1 && isAbstractFile(adapter, parts[0]))) {
        violations.push(`adapters/${adapter}/ has no abstract ${adapter}Adapter.ts`);
      }
      for (const parts of files) {
        if (parts[0] === "default" && parts.length > 1) continue;
        if (parts.length === 1 && isAbstractFile(adapter, parts[0])) continue;
        violations.push(`adapters/${adapter}/${parts.join("/")}`);
      }
    }
    expect(violations, violations.join("\n")).to.deep.equal([]);
  });

  it("core reaches an adapter only through adapters/index, and no abstract class imports default/", function () {
    const files = [...typescriptIn(CORE_SOURCES), path.join(CORE, "index.ts")];
    const violations = importViolations(files);
    expect(violations, violations.join("\n")).to.deep.equal([]);
  });

  it("graphql reaches a core adapter only through adapters/index", function () {
    // Core's own CI checks out core alone; graphql sits next to it only in the restoapp workspace.
    if (!fs.existsSync(GRAPHQL_SRC)) this.skip();
    const violations = importViolations(typescriptIn([GRAPHQL_SRC]));
    expect(violations, violations.join("\n")).to.deep.equal([]);
  });
});
