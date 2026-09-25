import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

/**
 * Guards the adapter rules of `adapters/README.md`: `adapters/<x>/` holds only the
 * abstract `<X>Adapter.ts` and `default/`, everything outside reaches an adapter
 * through `adapters/index`, a default implementation is never extended, and a
 * model an adapter owns is touched only by that adapter's default and its admin.
 * There is no linter in the project, so this test is the rule.
 *
 * Tests are not scanned: they construct default implementations and fakes
 * directly.
 */

const CORE = path.resolve(__dirname, "../..");
const ADAPTERS = path.join(CORE, "adapters");
const GRAPHQL_SRC = path.resolve(CORE, "../graphql/src");
const MODULES = path.resolve(CORE, "../../modules");
const PACKAGE = "@webresto/core";
const INDEX = path.join(ADAPTERS, "index.ts");

const CORE_SOURCES = ["models", "lib", "hook", "interfaces", "adapters"].map((dir) => path.join(CORE, dir));

/**
 * A model an adapter owns, and who besides that adapter's `default/` may touch
 * it: the model file itself and the admin pages of the default implementation.
 * The same files may import that `default/`.
 */
const OWNED: { model: string; adapter: string; admin: RegExp }[] = [
  { model: "Address", adapter: "geo", admin: /^lib\/adminpanel\/src\/controller\/[a-z-]*address[a-z-]*\.ts$/ },
  { model: "DeliveryZone", adapter: "delivery", admin: /^lib\/adminpanel\/src\/controller\/[a-z-]*delivery-zone[a-z-]*\.ts$/ },
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function typescriptIn(dirs: string[]): string[] {
  return dirs.filter((dir) => fs.existsSync(dir)).flatMap(walk).filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"));
}

function shown(file: string): string {
  return path.relative(path.dirname(CORE), file).split(path.sep).join("/");
}

/** Path from the core root with forward slashes, or null outside core. */
function inCore(file: string): string | null {
  const relative = path.relative(CORE, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join("/");
}

/** Source without whole-line `//` comments and block comments. */
function code(file: string): string {
  return fs
    .readFileSync(file, "utf8")
    .replace(/^\s*\/\*[\s\S]*?\*\//gm, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** Import specifiers of a file. */
function specifiers(file: string): string[] {
  return [...code(file).matchAll(/\b(?:from|import|require)\s*\(?\s*["']([^"'\n]+)["']/g)].map((match) => match[1]);
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

/** Whether a file outside `adapters/` may import this adapter's `default/`. */
function mayImportDefault(file: string, adapter: string): boolean {
  const relative = inCore(file);
  if (!relative) return false;
  return OWNED.some((owned) => owned.adapter === adapter && (relative === `models/${owned.model}.ts` || owned.admin.test(relative)));
}

function importViolations(files: string[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    const own = adapterOf(file);
    for (const spec of specifiers(file)) {
      const target = resolve(file, spec);
      if (!target) continue;
      const adapter = adapterOf(target);
      if (!adapter) continue;

      if (adapter !== own && file !== INDEX) {
        if (!own && underAdapters(target)![1] === "default" && mayImportDefault(file, adapter)) continue;
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
    .filter((entry) => entry.isDirectory())
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

  it("graphql and the modules reach a core adapter only through adapters/index", function () {
    // Core's own CI checks out core alone; graphql and the modules sit next to it
    // only in the restoapp workspace.
    if (!fs.existsSync(GRAPHQL_SRC)) this.skip();
    const violations = importViolations(typescriptIn([GRAPHQL_SRC, MODULES]));
    expect(violations, violations.join("\n")).to.deep.equal([]);
  });

  it("nothing extends a default implementation", function () {
    const files = [...typescriptIn(CORE_SOURCES), ...typescriptIn([GRAPHQL_SRC, MODULES])];
    const violations = files
      .filter((file) => /\bextends\s+Default[A-Z]\w*/.test(code(file)))
      .map(shown);
    expect(violations, violations.join("\n")).to.deep.equal([]);
  });

  it("a model an adapter owns is touched only by that adapter's default and its admin", function () {
    const files = [...typescriptIn(CORE_SOURCES), ...typescriptIn([GRAPHQL_SRC, MODULES])];
    const violations: string[] = [];
    for (const owned of OWNED) {
      const call = new RegExp(`\\b${owned.model}\\.\\w+!?\\(`);
      for (const file of files) {
        const relative = inCore(file);
        const allowed =
          relative !== null &&
          (relative.startsWith(`adapters/${owned.adapter}/default/`) ||
            relative === `models/${owned.model}.ts` ||
            owned.admin.test(relative));
        if (!allowed && call.test(code(file))) violations.push(`${shown(file)} → ${owned.model}`);
      }
    }
    expect(violations, violations.join("\n")).to.deep.equal([]);
  });
});
