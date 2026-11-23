import { expect } from "chai";
import { registerCoreMcpTools } from "../../../../hook/mcp";
import { resetDatabase } from "../../support/reset";

/**
 * dish-get and group-get by slug: a slug is the name made a word, not unique - a deleted dish keeps the slug of a live
 * one of its name (margarita of HP: "More than one matching record" before), two live ones share it too.
 *
 *   Group 1 with Dish 1 (live) and its deleted namesake; Dish 2 twice live; Group 2 live and deleted.
 */
describe("MCP dish-get and group-get by slug", function () {
  const tools = new Map<string, any>();
  let saved: { mcp: unknown; enabled: string | undefined };

  before(function () {
    saved = { mcp: (global as any).mcp, enabled: process.env.MCP_ENABLED };
    (global as any).mcp = { registerTool: (tool: any) => tools.set(tool.name, tool), registerGroup: (): void => undefined };
    process.env.MCP_ENABLED = "true";
    registerCoreMcpTools();
  });

  after(function () {
    (global as any).mcp = saved.mcp;
    if (saved.enabled === undefined) delete process.env.MCP_ENABLED;
    else process.env.MCP_ENABLED = saved.enabled;
  });

  const call = (name: string, params: Record<string, unknown> = {}) => tools.get(name).handler(params, {});
  const refused = async (promise: Promise<unknown>): Promise<string> => {
    try {
      await promise;
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error("expected a refusal");
  };

  let group: string;
  let live: string;

  beforeEach(async function () {
    await resetDatabase();
    group = (await Group.create!({ name: "Group 1" } as any).fetch()).id as string;
    live = (await Dish.create!({ name: "Dish 1", price: 100, parentGroup: group } as any).fetch()).id as string;
    await Dish.create!({ name: "Dish 1", price: 100, parentGroup: group, isDeleted: true } as any);
  });

  it("gives the live dish of a slug its deleted namesake shares", async function () {
    const dish = await call("dish-get", { slug: "dish-1" });
    expect(dish?.id).to.equal(live);
    expect(dish?.isDeleted).to.equal(false);
  });

  it("names both live dishes of one slug instead of picking one", async function () {
    const first = (await Dish.create!({ name: "Dish 2", price: 100, parentGroup: group } as any).fetch()).id;
    const second = (await Dish.create!({ name: "Dish 2", price: 200, parentGroup: group } as any).fetch()).id;
    const message = await refused(call("dish-get", { slug: "dish-2" }));
    expect(message).to.include(first).and.to.include(second).and.to.include("Ask by id");
  });

  it("gives null for a slug only a deleted dish has, and the dish by id still", async function () {
    const deleted = (await Dish.create!({ name: "Dish 3", price: 100, parentGroup: group, isDeleted: true } as any).fetch()).id;
    expect(await call("dish-get", { slug: "dish-3" })).to.equal(null);
    expect((await call("dish-get", { id: deleted }))?.id).to.equal(deleted);
  });

  it("gives the live group of a slug its deleted namesake shares", async function () {
    const liveGroup = (await Group.create!({ name: "Group 2" } as any).fetch()).id;
    await Group.create!({ name: "Group 2", isDeleted: true } as any);
    expect((await call("group-get", { slug: "group-2" }))?.id).to.equal(liveGroup);
  });
});
