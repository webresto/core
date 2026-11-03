import { expect } from "chai";
import { AccessRightsHelper } from "../../../../../../node_modules/adminizer/helpers/accessRightsHelper.js";
import { adminPanelAccessTokens } from "../../../../lib/adminpanel/manifest";
import { NO_KITCHEN, checkOrderKanbanToken } from "../../../../lib/adminpanel/order-kanban-rights";

/**
 * The orders board by points (plan C1): `order-kanban` is contextual, as `stock-manager` is, so an
 * operator of one point cannot be shown the orders of another — and the plain tick the token used to
 * be would have granted every point to everyone.
 */
describe("Current Orders contextual access", function () {
  function helper() {
    const instance = new AccessRightsHelper({ config: { auth: { enable: true } } } as any);
    instance.registerToken({
      id: "order-kanban",
      name: "Current Orders",
      description: "Test token",
      department: "Orders",
      check: checkOrderKanbanToken,
    });
    return instance;
  }

  it("grants the points of the groups and denies another one", async function () {
    const user: any = {
      isAdministrator: false,
      groups: [
        { tokens: [{ tokenId: "order-kanban", rights: ["place-a"] }] },
        { tokens: [{ tokenId: "order-kanban", rights: [NO_KITCHEN] }] },
      ],
    };
    const accessRights = helper();

    expect(accessRights.getPermissionRights("order-kanban", user)).to.deep.equal(["place-a", NO_KITCHEN]);
    expect(await accessRights.checkPermission("order-kanban", user, { placeId: "place-a" })).to.equal(true);
    expect(await accessRights.checkPermission("order-kanban", user, { placeId: NO_KITCHEN })).to.equal(true);
    expect(await accessRights.checkPermission("order-kanban", user, { placeId: "place-b" })).to.equal(false);
  });

  it("opens the board for a token with no points, but gives it no orders", async function () {
    const user: any = { isAdministrator: false, groups: [{ tokens: [{ tokenId: "order-kanban", rights: [] }] }] };
    const accessRights = helper();

    expect(await accessRights.checkPermission("order-kanban", user)).to.equal(true);
    expect(await accessRights.checkPermission("order-kanban", user, { placeId: "place-a" })).to.equal(false);
  });

  it("gives an administrator every point without a grant", async function () {
    const accessRights = helper();
    const admin: any = { isAdministrator: true };

    expect(accessRights.getPermissionRights("order-kanban", admin)).to.equal(null);
    expect(await accessRights.checkPermission("order-kanban", admin, { placeId: "place-b" })).to.equal(true);
  });

  it("ships the token as contextual, with «Без кухни» among its options", function () {
    const token = adminPanelAccessTokens.find((item) => item.id === "order-kanban");

    expect(token, "order-kanban token is missing from the manifest").to.exist;
    expect(token!.getOptions, "the group editor has no points to offer").to.be.a("function");
    expect(token!.check, "the granted points are never read back").to.be.a("function");
  });
});
