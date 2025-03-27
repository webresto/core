import { Captcha } from "../../../adapters/index";
import { ResolvedCaptcha } from "../../../adapters/captcha/CaptchaAdapter"
let job: { task: any; id: any; };
let task: { difficulty: string; salt: any; hash: any; }
let Puzzle = require("fix-esm").require("crypto-puzzle").default;

process.env.CAPTCHA_POW_DIFFICUTLY = "250000"
describe("Captcha adapter", function () {
  this.timeout(60000)

  it("get captcha POW task", async () => {
    let captchaAdapter = await Captcha.getAdapter();
    job = await captchaAdapter.getJob("test");

    if(!job || !job.task) throw `job not found`
    if(!job.id) throw `job id not found`
    
    try {
      task = JSON.parse(job.task as string)
    } catch (error) {
      throw `POW task corrupt`
    }
  });

  it("check POW captcha", async () => {
    let parsedTask = {
      difficulty: parseInt(task.difficulty),
      salt: task.salt,
      hash: task.hash
    }
    let captchaAdapter = await Captcha.getAdapter();
    let result = await Puzzle.solve(parsedTask)
    let resolvedCaptcha: ResolvedCaptcha = {
      id: job.id,
      solution: result
    }
    if (await captchaAdapter.check(resolvedCaptcha, "test") === false) throw `Captcha POW check fail`  
    
    // Second pass captcha
    if (await captchaAdapter.check(resolvedCaptcha, "test") === true) throw `Captcha POW check fail`  

  });

  it("Bad captcha", async () => {
    let captchaAdapter = await Captcha.getAdapter();
    let resolvedCaptcha: ResolvedCaptcha = {
      id: "123",
      solution: "456"
    }
    let result = await captchaAdapter.check(resolvedCaptcha, "test123")  
    if (result === true) throw `Bad captcha check should return false`
  });
  
});