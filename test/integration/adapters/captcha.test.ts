import { Captcha } from "../../../adapters/index";
let job;
let task
let Puzzle = require("fix-esm").require("crypto-puzzle").default;

process.env.CAPTCHA_POW_DIFFICUTLY = "250000"
describe("Captcha default adapter (POW)", function () {
  this.timeout(60000)

  it("get task", async () => {
    let captchaAdapter = Captcha.getAdapter();
    job = await captchaAdapter.getJob("test");

    if(!job || !job.task) throw `job not found`
    if(!job.id) throw `job id not found`
    
    try {
      task = JSON.parse(job.task as string)
    } catch (error) {
      throw `POW task corrupt`
    }
  });

  it("check", async () => {
    let parsedTask = {
      difficulty: parseInt(task.difficulty),
      salt: task.salt,
      hash: task.hash
    }
    let captchaAdapter = Captcha.getAdapter();
    let result = await Puzzle.solve(parsedTask)
    if (!captchaAdapter.check(job.id, result, "test")) throw `Captcha POW check fail`  
  });
});