"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
describe("Settings", function () {
    it("Get from memory", async function () {
        await sleep(1000);
        await Settings.set("projectName", { key: "projectName", value: "test" });
        let setting = await Settings.get("projectName");
        (0, chai_1.expect)(setting).to.equal("test");
    });
    it("Get from memory afterCreate", async function () {
        await Settings.set("test", { key: "test", value: { test: true }, jsonSchema: {
                type: "object",
                properties: {
                    test: {
                        type: "boolean"
                    }
                }
            } });
        let setting = await Settings.get("test");
        (0, chai_1.expect)(setting.test).to.equal(true);
    });
    it("Get from memory afterUpdate", async function () {
        await Settings.set("test", { key: "test", value: { test: false }, jsonSchema: {
                type: "object",
                properties: {
                    test: {
                        type: "boolean"
                    }
                }
            } });
        let setting = await Settings.get("test");
        (0, chai_1.expect)(setting.test).to.equal(false);
    });
    // Deprecated, Settings.set does not write values to process.env anymore
    // it("Should set process.env", async function () {
    //   await Settings.set("test_123Test", {key: "test_123Test", value: true});
    //   expect(process.env.TEST_123_TEST).to.equal('true')
    // });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
