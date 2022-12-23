"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POW = void 0;
const CaptchaAdapter_1 = require("../CaptchaAdapter");
// import Puzzle from "crypto-puzzle" https://github.com/fabiospampinato/crypto-puzzle/issues/1
let Puzzle = require("fix-esm").require("crypto-puzzle").default; // https://github.com/fabiospampinato/crypto-puzzle/issues/2
const uuid_1 = require("uuid");
class POW extends CaptchaAdapter_1.default {
    async getJob() {
        const id = (0, uuid_1.v4)();
        let difficulty = Number(process.env.CAPTCHA_POW_DIFFICUTLY) ? Number(process.env.CAPTCHA_POW_DIFFICUTLY) : 7 * 100000;
        // Tasks garbage collect
        Object.keys(POW.taskStorage).forEach((item) => {
            if (POW.taskStorage[id].time < Date.now() - 30 * 60 * 1000)
                delete (POW.taskStorage[id]);
        });
        let puzzle = await Puzzle.generate(difficulty);
        let task = {
            id: id,
            task: JSON.stringify(puzzle.question, (key, value) => typeof value === "bigint" ? value.toString() + "n" : value)
        };
        POW.taskStorage[id] = {
            task: task,
            time: Date.now(),
            puzzle: puzzle
        };
        return task;
    }
    async check(id, solution) {
        if (POW.taskStorage[id] === undefined)
            return false;
        let puzzle = POW.taskStorage[id].puzzle;
        if (puzzle.solution === BigInt(solution)) {
            delete (POW.taskStorage[id]);
            return true;
        }
        else {
            return false;
        }
    }
}
exports.POW = POW;
