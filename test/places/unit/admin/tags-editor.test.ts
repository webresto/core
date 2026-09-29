import { expect } from "chai";
import {
  canonicalTagName,
  normalizeTags,
  serializeTags,
  summarizeTags,
  validateTags,
} from "../../../../lib/adminpanel/controls/tagsEditorHelper";

/** The admin's tag editor: every shape a product's tags arrive in, read into one, and what it warns about. */
describe("Tags editor", function () {
  const names = (value: unknown) => normalizeTags(value).map((tag) => tag.name);

  it("reads tag objects, plain strings, a JSON string and a comma-separated string alike", function () {
    expect(names([{ name: "tag 1" }, { name: " tag 2 " }])).to.deep.equal(["tag 1", "tag 2"]);
    expect(names(["tag 1", " tag 2 "])).to.deep.equal(["tag 1", "tag 2"]);
    expect(names('[{"name":"tag 1"},"tag 2"]')).to.deep.equal(["tag 1", "tag 2"]);
    expect(names("tag 1, tag 2")).to.deep.equal(["tag 1", "tag 2"]);
  });

  it("reads nothing out of nothing and out of garbage", function () {
    for (const value of [null, undefined, "", 42, [null, "", {}]]) expect(normalizeTags(value)).to.deep.equal([]);
  });

  it("writes tags back as objects and keeps keys it does not know", function () {
    expect(serializeTags(normalizeTags(["tag 1"]))).to.deep.equal([{ name: "tag 1" }]);
    const allergen = [{ id: "allergen-1", code: "A1", name: "tag 1" }];
    expect(serializeTags(normalizeTags(allergen))).to.deep.equal(allergen);
  });

  it("warns about a duplicate, whatever the case, and about a tag with no name", function () {
    expect(validateTags(normalizeTags(["tag 1", "tag 2"]))).to.deep.equal([]);

    const duplicate = validateTags(normalizeTags(["Tag 1", "tag 1 "]));
    expect(duplicate).to.have.length(1);
    expect(duplicate[0]).to.include({ message: "Duplicate tag", index: 1 });

    expect(validateTags(normalizeTags([{ id: "allergen-1" }]))[0].message).to.equal("Tag name is empty");
  });

  it("summarizes for the list column", function () {
    expect(summarizeTags(null)).to.equal("—");
    expect(summarizeTags(["a", "b"])).to.equal("a, b");
    expect(summarizeTags(["a", "b", "c", "d", "e"])).to.equal("a, b, c +2");
  });

  it("compares tag names trimmed and lower-cased", function () {
    expect(canonicalTagName(" Tag 1 ")).to.equal("tag 1");
    expect(canonicalTagName(null)).to.equal("");
  });
});
