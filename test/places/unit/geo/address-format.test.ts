import { expect } from "chai";
import { nameMatches } from "../../../../lib/address/name-match";
import { formatAddressLine, formatAddressPath } from "../../../../lib/address/format";
import { SELF_ADDRESSED } from "../../../../adapters/geo/default/defaultGeo";

/** How a catalog node is matched by name and how an order's address line is written. */
describe("Address format", function () {
  it("matches a needle in the name or in an alias", function () {
    const node = { name: "Street 1", names: ["Alias 1", "Alias 2"] } as any;
    expect(nameMatches(node, "street")).to.equal(true);
    expect(nameMatches(node, "alias 2")).to.equal(true);
    expect(nameMatches(node, "street 2")).to.equal(false);
  });

  it("joins a path into a line", function () {
    expect(formatAddressPath(["Street 1", "12", "entrance 3"])).to.equal("Street 1, 12, entrance 3");
  });

  it("leaves a range's bounds out of the line: the typed number takes their place", function () {
    const path = [
      { type: "street", name: "Street 1" },
      { type: "range", name: "1–99" },
    ];
    expect(formatAddressLine(path, "45a", SELF_ADDRESSED)).to.equal("Street 1, 45a");
  });
});
