import CaptchaAdapter from "../CaptchaAdapter";
import { CaptchaJob } from "../CaptchaAdapter"

// import Puzzle from "crypto-puzzle" https://github.com/fabiospampinato/crypto-puzzle/issues/1
let Puzzle = require("fix-esm").require("crypto-puzzle").default; // https://github.com/fabiospampinato/crypto-puzzle/issues/2

import { v4 as uuid } from "uuid";

export class POW extends CaptchaAdapter {
  public async getJob(): Promise<CaptchaJob> {
    const id = uuid();
    
    let difficulty = Number(process.env.CAPTCHA_POW_DIFFICUTLY) ? Number(process.env.CAPTCHA_POW_DIFFICUTLY) : 7 * 100000;

    // Tasks garbage collect
    Object.keys(POW.taskStorage).forEach((item) => {
      if (POW.taskStorage[id].time < Date.now() - 30 * 60 * 1000) delete(POW.taskStorage[id]);
    })

    let puzzle = await Puzzle.generate(difficulty)
    let task = {
      id: id,
      task:JSON.stringify(puzzle.question, (key, value) => typeof value === "bigint" ? value.toString() + "n" : value)
    };
    
    POW.taskStorage[id] = {
      task: task,
      time: Date.now(),
      puzzle: puzzle
    }

    return task;
  }

  public async check(id: string, solution: string): Promise<boolean> {
    
    if ( POW.taskStorage[id] === undefined ) return false

    let puzzle = POW.taskStorage[id].puzzle;
    
    if(puzzle.solution === BigInt(solution)) {
      delete(POW.taskStorage[id]);
      return true
    } else {
      return false 
    }
  }
}