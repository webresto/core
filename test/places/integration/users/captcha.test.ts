import { expect } from "chai";
import { Captcha } from "../../../../adapters";

/**
 * The built-in captcha: a proof-of-work puzzle for a label. A solved puzzle
 * passes once, for its own label; the same answer again, or an answer to a
 * puzzle nobody set, does not.
 */
describe("Captcha", function () {
  this.timeout(60000);
  const Puzzle = require("fix-esm").require("crypto-puzzle").default;
  const difficulty = process.env.CAPTCHA_POW_DIFFICUTLY;

  before(function () {
    // Easy enough to solve in a test.
    process.env.CAPTCHA_POW_DIFFICUTLY = "250000";
  });

  after(function () {
    if (difficulty === undefined) delete process.env.CAPTCHA_POW_DIFFICUTLY;
    else process.env.CAPTCHA_POW_DIFFICUTLY = difficulty;
  });

  it("passes a solved puzzle once, and nothing else", async function () {
    const captcha = await Captcha.getAdapter();
    const job = await captcha.getJob("label-1");
    const task = JSON.parse(job.task as string);
    const solution = await Puzzle.solve({ difficulty: parseInt(task.difficulty), salt: task.salt, hash: task.hash });

    expect(await captcha.check({ id: job.id, solution }, "label-1")).to.equal(true);
    expect(await captcha.check({ id: job.id, solution }, "label-1")).to.equal(false);
    expect(await captcha.check({ id: "job-9", solution: "456" }, "label-1")).to.equal(false);
  });
});
