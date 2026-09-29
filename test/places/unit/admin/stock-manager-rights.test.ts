import { expect } from "chai";
import { AccessRightsHelper } from "../../../../../../node_modules/adminizer/helpers/accessRightsHelper.js";
import { adminPanelAccessTokens } from "../../../../lib/adminpanel/manifest";
import { checkStockManagerToken } from "../../../../lib/adminpanel/stock-manager-rights";

describe("Stock Manager contextual access", function () {
  function helper() {
    const instance = new AccessRightsHelper({ config: { auth: { enable: true } } } as any);
    instance.registerToken({
      id: "stock-manager",
      name: "Stock Manager",
      description: "Test token",
      department: "Catalog",
      check: checkStockManagerToken,
    });
    return instance;
  }

  it("unions selected points from every group and denies another point", async function () {
    const user: any = {
      isAdministrator: false,
      groups: [
        { tokens: [{ tokenId: "stock-manager", rights: ["kitchen-1"] }] },
        { tokens: [{ tokenId: "stock-manager", rights: ["kitchen-2"] }] },
      ],
    };
    const accessRights = helper();

    expect(accessRights.getPermissionRights("stock-manager", user)).to.deep.equal(["kitchen-1", "kitchen-2"]);
    expect(await accessRights.checkPermission("stock-manager", user, { placeId: "kitchen-2" })).to.equal(true);
    expect(await accessRights.checkPermission("stock-manager", user, { placeId: "kitchen-3" })).to.equal(false);
  });

  it("allows the page but no stock data for a token with no selected points", async function () {
    const user: any = {
      isAdministrator: false,
      groups: [{ tokens: [{ tokenId: "stock-manager", rights: [] }] }],
    };
    const accessRights = helper();

    expect(await accessRights.checkPermission("stock-manager", user)).to.equal(true);
    expect(await accessRights.checkPermission("stock-manager", user, { placeId: "kitchen-1" })).to.equal(false);
  });

  // The tests above build their own token, so they stayed green when the manifest rewrite
  // dropped the shipped one down to a plain checkbox and the group editor lost the point list.
  it("ships the token as contextual, not as a plain checkbox", function () {
    const token = adminPanelAccessTokens.find((item) => item.id === "stock-manager");

    expect(token, "stock-manager token is missing from the manifest").to.exist;
    expect(token!.getOptions, "the group editor has no cooking points to offer").to.be.a("function");
    expect(token!.check, "the granted points are never read back").to.be.a("function");
  });
});
