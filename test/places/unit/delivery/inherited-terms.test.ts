import { expect } from "chai";
import { pickInheritedFields } from "../../../../lib/delivery/inherited-terms";

describe("Delivery zone inherited terms", function () {
  it("lends the terms and nothing else", function () {
    const layer = { id: "layer-1", name: "Layer 1", enable: false, sortOrder: 3, deliveryCost: 100, minDeliveryTime: 30 } as any;
    const inherited = pickInheritedFields(layer);
    expect(inherited).to.include({ deliveryCost: 100, minDeliveryTime: 30 });
    expect(inherited).to.not.have.any.keys("id", "name", "enable", "sortOrder");
  });
});
