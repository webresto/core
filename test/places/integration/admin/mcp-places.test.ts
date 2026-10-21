import { expect } from "chai";
import { registerPlacesTools } from "../../../../hook/mcp/places";
import { resetDatabase } from "../../support/reset";

/**
 * The places tools of the MCP server: a place can be given its position and have
 * it changed or cleared, and a coordinate that is not one is refused with the
 * model's own message.
 */
describe("MCP places tools", function () {
  const tools = new Map<string, any>();
  let saved: { mcp: unknown; enabled: string | undefined };

  before(function () {
    saved = { mcp: (global as any).mcp, enabled: process.env.MCP_ENABLED };
    (global as any).mcp = { registerTool: (tool: any) => tools.set(tool.name, tool) };
    process.env.MCP_ENABLED = "true";
    registerPlacesTools();
  });

  after(function () {
    (global as any).mcp = saved.mcp;
    if (saved.enabled === undefined) delete process.env.MCP_ENABLED;
    else process.env.MCP_ENABLED = saved.enabled;
  });

  beforeEach(async function () {
    await resetDatabase();
  });

  const create = (params: Record<string, unknown>) =>
    tools.get("place-create").handler({ title: "Place 1", address: "Street 1", enable: true, ...params });
  const update = (params: Record<string, unknown>) => tools.get("place-update").handler(params);

  it("describes the coordinate in both tools", function () {
    for (const name of ["place-create", "place-update"]) {
      const property = tools.get(name).schema.properties.coordinate;
      expect(property.type).to.equal("object");
      expect(property.required).to.deep.equal(["lat", "lon"]);
    }
    expect(tools.get("place-update").schema.properties.coordinate.description).to.contain("null");
  });

  it("creates a place with a coordinate", async function () {
    const place = await create({ coordinate: { lat: 56.84, lon: 60.61 } });

    expect(place.coordinate).to.deep.equal({ lat: 56.84, lon: 60.61 });
    expect((await Place.findOne({ id: place.id })).coordinate).to.deep.equal({ lat: 56.84, lon: 60.61 });
  });

  it("creates a place without one, as before", async function () {
    const place = await create({});

    expect(place.coordinate ?? null).to.equal(null);
  });

  it("changes a coordinate, and clears it with null", async function () {
    const place = await create({ coordinate: { lat: 56.84, lon: 60.61 } });

    expect((await update({ id: place.id, coordinate: { lat: 56.9, lon: 60.5 } })).coordinate).to.deep.equal({ lat: 56.9, lon: 60.5 });
    expect((await update({ id: place.id, coordinate: null })).coordinate ?? null).to.equal(null);
  });

  it("leaves the coordinate alone when an update does not mention it", async function () {
    const place = await create({ coordinate: { lat: 56.84, lon: 60.61 } });

    await update({ id: place.id, title: "Place 2" });

    expect((await Place.findOne({ id: place.id })).coordinate).to.deep.equal({ lat: 56.84, lon: 60.61 });
  });

  it("refuses what is not a latitude and a longitude", async function () {
    let message = "";
    try {
      await create({ coordinate: { lat: 156.84, lon: 60.61 } });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).to.contain("valid latitude and longitude");

    const place = await create({});
    let updateMessage = "";
    try {
      await update({ id: place.id, coordinate: { lat: "north", lon: 60.61 } });
    } catch (error) {
      updateMessage = (error as Error).message;
    }
    expect(updateMessage).to.contain("valid latitude and longitude");
  });
});
