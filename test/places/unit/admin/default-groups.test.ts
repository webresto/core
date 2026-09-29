import { expect } from "chai";
import { ensureDefaultGroups } from "../../../../lib/adminpanel/ensureDefaultGroups";

/**
 * The admin groups core ships: created when missing, and an existing group is
 * left as the administrator made it, except for the tokens a release explicitly
 * adds (`ensureTokens`) or revokes (`removeTokens`). Adminizer's group model is
 * a stand-in holding rows in memory — Adminizer is not part of the test app.
 */
describe("Default admin groups", function () {
  function adminizerWith(rows: any[]) {
    const model = {
      findOne: async ({ where }: any) => rows.find((row) => row.name === where.name),
      create: async (row: any) => {
        rows.push(row);
        return row;
      },
      updateOne: async ({ where }: any, values: any) => Object.assign(rows.find((row) => row.name === where.name), values),
    };
    return { modelHandler: { internal: (scope: string) => ({ get: (name: string) => (scope === "access-rights" && name === "Group" ? model : undefined) }) } };
  }

  it("creates only the groups that do not exist, and adds ensured tokens to the ones that do", async function () {
    const rows = [{ name: "Group 1", description: "Changed by an administrator", tokens: ["token-9"], users: [10] }];

    await ensureDefaultGroups(adminizerWith(rows), [
      { name: "Group 1", description: "Description 1", tokens: ["token-1"], ensureTokens: ["token-2"] },
      { name: "Group 2", description: "Description 2", tokens: ["token-3"] },
    ]);

    expect(rows).to.deep.equal([
      { name: "Group 1", description: "Changed by an administrator", tokens: ["token-9", "token-2"], users: [10] },
      { name: "Group 2", description: "Description 2", tokens: ["token-3"] },
    ]);
  });

  it("revokes the tokens a release removes, keeping the administrator's others", async function () {
    const rows = [{ name: "Group 1", description: "Description 1", tokens: ["token-1", "token-2", "token-3"] }];

    await ensureDefaultGroups(adminizerWith(rows), [
      { name: "Group 1", description: "Description 1", tokens: [], ensureTokens: ["token-4", "token-5"], removeTokens: ["token-1", "token-2"] },
    ]);

    expect(rows[0].tokens).to.deep.equal(["token-3", "token-4", "token-5"]);
  });

  it("leaves a group alone that has everything already", async function () {
    let updated = false;
    const rows = [{ name: "Group 1", description: "Description 1", tokens: ["token-1"] }];
    const adminizer: any = adminizerWith(rows);
    const model = adminizer.modelHandler.internal("access-rights").get("Group");
    const updateOne = model.updateOne;
    model.updateOne = async (...args: any[]) => {
      updated = true;
      return updateOne(...args);
    };

    await ensureDefaultGroups(adminizer, [{ name: "Group 1", description: "Description 1", tokens: [], ensureTokens: ["token-1"] }]);

    expect(updated).to.equal(false);
  });
});
