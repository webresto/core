import CaptchaAdapter from "../CaptchaAdapter";
import { CaptchaJob, ResolvedCaptcha } from "../CaptchaAdapter"

// import Puzzle from "crypto-puzzle" https://github.com/fabiospampinato/crypto-puzzle/issues/1
let Puzzle = require("fix-esm").require("crypto-puzzle").default; // https://github.com/fabiospampinato/crypto-puzzle/issues/2

import { v4 as uuid } from "uuid";

export class POW extends CaptchaAdapter {
  public async getJob(label: string): Promise<CaptchaJob> {
    const id = uuid();
    
    /**
     * Action: as example captcha adater recive label `login:12025550184` sent task, and client solve it
     * When client pass solved captcha to login user, Method User.login pass same label, and if this not matched 
     * Capthca adapter reject login. 
     * To prevent brute force the adapter increases the complexity after several attempts.
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

  public async check(resolvedCaptcha: ResolvedCaptcha, label:string): Promise<boolean> {
    // if (process.env.NODE_ENV !== "production" && process.env.CAPTCHA_BYPASS) return true
    if ( POW.taskStorage[resolvedCaptcha.id] === undefined ) return false
    
    if (POW.taskStorage[resolvedCaptcha.id].label !== label) return false

    let puzzle = POW.taskStorage[resolvedCaptcha.id].puzzle;
    if(puzzle.solution === BigInt(resolvedCaptcha.solution)) {
      delete(POW.taskStorage[resolvedCaptcha.id]);
      return true
    } else {
      return false 
    }
  }
}