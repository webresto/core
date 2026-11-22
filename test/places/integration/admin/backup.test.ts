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
 * id. Products without images; the image half needs the media adapter. A dish
 * with variants comes back with its variants on sale, whatever the order of the
 * archive.
 */
describe("Catalog backup", function () {
  let archive: string;
  let group1: string;

  before(async function () {
    await resetDatabase();
    archive = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "backup-")), "backup-1.tar");
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    group1 = group.id as string;
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

  it("brings a dish with variants back over itself with its variants on sale, the variants listed first or not", async function () {
    const SIZE = { key: "size", name: "Size", values: [{ value: 20, title: "20 cm" }, { value: 30, title: "30 cm" }] };
    const box: any = await Dish.create!({
      id: "dish-3", name: "Dish 3", price: 0, enable: true, parentGroup: group1,
      variants: { options: [SIZE], mappings: [{ values: { size: 20 }, price: 400, isDefault: true }, { values: { size: 30 }, price: 700 }] },
    } as any).fetch();
    const variantIds = box.variants.mappings.map((mapping: any) => mapping.rel);
    const variantsArchive = path.join(path.dirname(archive), "backup-2.tar");
    await new BackupHandler().exportToTar(variantsArchive);

    // The variants before their box: done in that order, the box would mark them deleted.
    const data = await dataOf(variantsArchive);
    data.dishes.sort((a: any, b: any) => Number(Boolean(b.parentId)) - Number(Boolean(a.parentId)));
    const into = fs.mkdtempSync(path.join(os.tmpdir(), "backup-write-"));
    fs.writeFileSync(path.join(into, "data.json"), JSON.stringify(data));
    await tar.c({ gzip: true, file: variantsArchive, cwd: into }, ["."]);
    fs.rmSync(into, { recursive: true, force: true });

    await new BackupHandler().importFromTar(variantsArchive);

    const rows = await Dish.find!({ where: { parentId: "dish-3" }, sort: "price ASC" });
    expect(rows.map((row: any) => [row.id, row.name, row.isDeleted])).to.deep.equal([
      [variantIds[0], "Dish 3, 20 cm", false],
      [variantIds[1], "Dish 3, 30 cm", false],
    ]);
    expect(((await Dish.findOne!({ id: "dish-3" })) as any).variants.mappings.map((mapping: any) => mapping.rel)).to.deep.equal(variantIds);
  });
});
