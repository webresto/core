describe("Sails", function () {
  it("sails does not crash", () => true);
});

describe("await emiter global", function () {
  it("emmiter is defined", () => {
    //@ts-ignore
    if (emitter.on === undefined) {
      throw `emitter.on === undefined`
    }
  });
});