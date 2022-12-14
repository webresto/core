describe("Sails", function () {
  it("sails does not crash", () => true);
});

describe("await emiter global", function () {
  it("sails does not crash", () => {
    //@ts-ignore
    if (emitter.on === undefined) {
      throw `emitter.on === undefined`
    }
  });
});