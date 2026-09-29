import { expect } from "chai";
import Ajv from "ajv";

/** The dialog config schema: one kind of option per dialog. */
describe("Dialog box schema", function () {
  const validate = new Ajv().compile(require("../../../../lib/schemas/dialogBoxConfig.json"));

  const dialog = (options: unknown[], optionsType = "product") => ({
    askId: "ask-1",
    allowClosing: true,
    type: "routine",
    message: "Message 1",
    title: "Title 1",
    optionsType,
    icon: "icon.png",
    timeout: 15,
    defaultOptionId: "option-1",
    options,
  });

  const product = (n: number) => ({ id: `option-${n}`, product: { name: `Dish ${n}`, id: `dish-${n}`, price: 10.99, description: `Description ${n}` } });
  const button = (n: number) => ({ id: `option-${n}`, button: { label: `Button ${n}`, type: "primary" } });

  it("takes a dialog of buttons, and one of at least two products", function () {
    expect(validate(dialog([button(1), button(2)], "button"))).to.equal(true);
    expect(validate(dialog([product(1), product(2)]))).to.equal(true);
    expect(validate(dialog([product(1)]))).to.equal(false);
  });

  it("refuses a dialog that mixes products and buttons", function () {
    expect(validate(dialog([product(1), button(2)]))).to.equal(false);
  });
});
