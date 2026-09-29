import { expect } from "chai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as tar from "tar";
import { BackupHandler } from "../../../../lib/BackupHandler";
import { resetDatabase } from "../../support/reset";

/**
 * The catalog backup: groups and products written into a tar archive with a
 * `data.json`, and read back into an installation, replacing rows with the same
 * id. Products without images; the image half needs the media adapter.
 */
describe("Catalog backup", function () {
  let archive: string;

  before(async function () {
    await resetDatabase();
    archive = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "backup-")), "backup-1.tar");
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    await Dish.create({ id: "dish-1", name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch();
    await Dish.create({ id: "dish-2", name: "Dish 2", price: 200, enable: true, parentGroup: group.id }).fetch();
  });

  after(function () {
    fs.rmSync(path.dirname(archive), { recursive: true, force: true });
  });

  async function dataOf(file: string): Promise<any> {
    const into = fs.mkdtempSync(path.join(os.tmpdir(), "backup-read-"));
    try {
      await tar.x({ file, cwd: into });
      return JSON.parse(fs.readFileSync(path.join(into, "data.json"), "utf8"));
    } finally {
      fs.rmSync(into, { recursive: true, force: true });
    }
  }

  it("writes the catalog into the archive", async function () {
    await new BackupHandler().exportToTar(archive);

    const data = await dataOf(archive);
    expect(data.groups.map((group: any) => group.name)).to.deep.equal(["Group 1"]);
    expect(data.dishes.map((dish: any) => dish.name).sort()).to.deep.equal(["Dish 1", "Dish 2"]);
  });

  it("reads it back into an empty installation", async function () {
    await Dish.destroy({}).fetch();
    await Group.destroy({}).fetch();

    await new BackupHandler().importFromTar(archive);

    expect((await Group.find({})).map((group: any) => group.name)).to.deep.equal(["Group 1"]);
    expect((await Dish.find({})).map((dish: any) => [dish.id, dish.price]).sort()).to.deep.equal([["dish-1", 100], ["dish-2", 200]]);
  });

  it("replaces a product with the same id by the archived one", async function () {
    await Dish.update({ id: "dish-1" }, { price: 999 }).fetch();

    await new BackupHandler().importFromTar(archive);

    expect((await Dish.findOne({ id: "dish-1" })).price).to.equal(100);
    expect(await Dish.count({})).to.equal(2);
  });
});
