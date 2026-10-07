import { expect } from "chai";
import groupGenerator from "../../generators/group.generator";
import dishGenerator from "../../generators/dish.generator";

/**
 * ProductCatalog extends adminizer base classes, but the adminizer build installed here cannot be
 * loaded under mocha (ESM directory import in its build output). The base item classes carry no
 * logic used by create(), so they are replaced with empty stubs; the Waterline models are real.
 */
function loadProductCatalog() {
  const Module = require("module");
  const originalLoad = Module._load;
  class Stub {}
  const adminizerStub = { AbstractCatalog: Stub, AbstractGroup: Stub, AbstractItem: Stub, ActionHandler: Stub };
  Module._load = function (request: string, ...rest: any[]) {
    if (request === "adminizer") return adminizerStub;
    return originalLoad.call(this, request, ...rest);
  };
  try {
    return require("../../../libs/adminpanel/ProductCatalog/ProductCatalog");
  } finally {
    Module._load = originalLoad;
  }
}

/**
 * The catalog "create" dialog saves the record itself (/admin/model/<resource>/add) and then
 * calls createItem with `{ record, parentId, type }`. ProductCatalog must attach that saved
 * record instead of creating a second one from the wrapper.
 */
describe("ProductCatalog: create from the catalog dialog", function () {
  this.timeout(30000);

  let groupItem: any;
  let productItem: any;

  before(function () {
    const { Group, Product } = loadProductCatalog();
    groupItem = new Group();
    productItem = new Product();
  });

  const countGroups = async () => (await sails.models.group.find({})).length;
  const countDishes = async () => (await sails.models.dish.find({})).length;

  it("Group: an already saved record is not created again", async () => {
    const saved = await sails.models.group.create(groupGenerator({ name: "Catalog dialog group" })).fetch();
    const before = await countGroups();

    const item = await groupItem.create({ record: saved, parentId: null, type: "group" } as any, "origin");

    expect(await countGroups()).to.equal(before);
    expect(item.id).to.equal(saved.id);
    expect(item.name).to.equal("Catalog dialog group");
    const nameless = await sails.models.group.find({ name: "" });
    expect(nameless).to.have.length(0);
  });

  it("Product: an already saved dish does not fail and is not created again", async () => {
    const saved = await sails.models.dish.create(dishGenerator({ name: "Catalog dialog dish", price: 500, concept: undefined })).fetch();
    const before = await countDishes();

    const item = await productItem.create({ record: saved, parentId: null, type: "product" } as any, "origin");

    expect(await countDishes()).to.equal(before);
    expect(item.id).to.equal(saved.id);
    expect(item.name).to.equal("Catalog dialog dish");
  });

  it("puts the saved record under the group selected in the tree when the form left Parent Group empty", async () => {
    const parent = await sails.models.group.create(groupGenerator({ name: "Tree parent" })).fetch();
    const saved = await sails.models.dish.create(dishGenerator({ name: "Dish without parent", price: 100, concept: undefined })).fetch();

    const item = await productItem.create({ record: saved, parentId: parent.id, type: "product" } as any, "origin");

    const stored = await sails.models.dish.findOne({ id: saved.id });
    expect(stored.parentGroup).to.equal(parent.id);
    expect(item.parentId).to.equal(parent.id);
  });

  it("keeps Parent Group chosen in the form over the group selected in the tree", async () => {
    const formParent = await sails.models.group.create(groupGenerator({ name: "Form parent" })).fetch();
    const treeParent = await sails.models.group.create(groupGenerator({ name: "Tree parent 2" })).fetch();
    const saved = await sails.models.group.create(groupGenerator({ name: "Child with form parent", parentGroup: formParent.id })).fetch();

    await groupItem.create({ record: saved, parentId: treeParent.id, type: "group" } as any, "origin");

    const stored = await sails.models.group.findOne({ id: saved.id });
    expect(stored.parentGroup).to.equal(formParent.id);
  });

  it("fails loudly when the saved record cannot be found", async () => {
    let error: Error = null;
    try {
      await groupItem.create({ record: { id: "00000000-0000-0000-0000-000000000000" }, parentId: null, type: "group" } as any, "origin");
    } catch (e) {
      error = e;
    }
    expect(error).to.be.an("error");
    expect(error.message).to.contain("was not found");
  });

  it("plain item data without a saved record still creates the record", async () => {
    const parent = await sails.models.group.create(groupGenerator({ name: "Plain parent" })).fetch();
    const before = await countGroups();

    const item = await groupItem.create({ name: "Plain created group", parentId: parent.id, type: "group" } as any, "origin");

    expect(await countGroups()).to.equal(before + 1);
    expect(item.name).to.equal("Plain created group");
    expect(item.parentId).to.equal(parent.id);
  });
});
