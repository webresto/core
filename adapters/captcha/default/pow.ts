import CaptchaAdapter from "../CaptchaAdapter";
import { CaptchaJob, ResolvedCaptcha } from "../CaptchaAdapter"

// import Puzzle from "crypto-puzzle" https://github.com/fabiospampinato/crypto-puzzle/issues/1
let Puzzle = require("fix-esm").require("crypto-puzzle").default; // https://github.com/fabiospampinato/crypto-puzzle/issues/2

import { v4 as uuid } from "uuid";

export class POW extends CaptchaAdapter {
  public async getJob(label: string): Promise<CaptchaJob> {
    const id = uuid();

    /**
     * Action: as example captcha adapter receive label `login:12025550184` sent task, and a client solves it
     * When a client pass solved captcha to login user, Method User.login pass same label, and if this not matched
     * Captcha adapter reject login.
     * To prevent brute force, the adapter increases the complexity after several attempts.
     */
    if (!label) throw `label not provided`
    let difficulty = Number(process.env.CAPTCHA_POW_DIFFICUTLY) ? Number(process.env.CAPTCHA_POW_DIFFICUTLY) : 7 * 1000;


    let attempt = 0

    // Tasks garbage collect
    Object.keys(POW.taskStorage).forEach((item) => {
      if (POW.taskStorage[item]) {
        if (POW.taskStorage[item]?.time < Date.now() - 30 * 60 * 1000) delete(POW.taskStorage[item]);
        if (POW.taskStorage[item]?.label === label) attempt++;
      }
    })

    let difficultСoefficient = 1 + Number((attempt/7).toFixed())
    difficulty = difficulty * difficultСoefficient;

    let puzzle = await Puzzle.generate(difficulty)
    let task = {
      id: id,
      task:JSON.stringify(puzzle.question, (key, value) => typeof value === "bigint" ? value.toString() + "n" : value)
    };

    POW.taskStorage[id] = {
      task: task,
      time: Date.now(),
      label: label,
      puzzle: puzzle
    }

    return task;
  }

  public async check(resolvedCaptcha: ResolvedCaptcha, label: string): Promise<boolean> {
    try {
        if (POW.taskStorage[resolvedCaptcha.id] === undefined) {
            sails.log.error(`Captcha check failed: ID ${resolvedCaptcha.id} not found in taskStorage.`);
            return false;
        }

        if (POW.taskStorage[resolvedCaptcha.id].label !== label) {
            sails.log.error(`Captcha check failed: Label mismatch for ID ${resolvedCaptcha.id}. Expected: ${POW.taskStorage[resolvedCaptcha.id].label}, Received: ${label}`);
            return false;
        }

        let puzzle = POW.taskStorage[resolvedCaptcha.id].puzzle;
        if (puzzle.solution === BigInt(resolvedCaptcha.solution)) {
            delete POW.taskStorage[resolvedCaptcha.id];
            return true;
        } else {
            sails.log.error(`Captcha check failed: Incorrect solution for ID ${resolvedCaptcha.id}. Expected: ${puzzle.solution}, Received: ${resolvedCaptcha.solution}`);
            return false;
        }
    } catch (error) {
        sails.log.error(`Captcha check error: ${error}`);
        return false;
    }
}
}
