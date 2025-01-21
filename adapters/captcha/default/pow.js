"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POW = void 0;
const CaptchaAdapter_1 = __importDefault(require("../CaptchaAdapter"));
// import Puzzle from "crypto-puzzle" https://github.com/fabiospampinato/crypto-puzzle/issues/1
let Puzzle = require("fix-esm").require("crypto-puzzle").default; // https://github.com/fabiospampinato/crypto-puzzle/issues/2
const uuid_1 = require("uuid");
class POW extends CaptchaAdapter_1.default {
    async getJob(label) {
        const id = (0, uuid_1.v4)();
        /**
         * Action: as example captcha adapter receive label `login:12025550184` sent task, and a client solves it
         * When a client pass solved captcha to login user, Method User.login pass same label, and if this not matched
         * Captcha adapter reject login.
         * To prevent brute force, the adapter increases the complexity after several attempts.
         */
        if (!label)
            throw `label not provided`;
        let difficulty = Number(process.env.CAPTCHA_POW_DIFFICUTLY) ? Number(process.env.CAPTCHA_POW_DIFFICUTLY) : 7 * 1000;
        let attempt = 0;
        // Tasks garbage collect
        Object.keys(POW.taskStorage).forEach((item) => {
            if (POW.taskStorage[item]) {
                if (POW.taskStorage[item]?.time < Date.now() - 30 * 60 * 1000)
                    delete (POW.taskStorage[item]);
                if (POW.taskStorage[item]?.label === label)
                    attempt++;
            }
        });
        let difficultСoefficient = 1 + Number((attempt / 7).toFixed());
        difficulty = difficulty * difficultСoefficient;
        let puzzle = await Puzzle.generate(difficulty);
        let task = {
            id: id,
            task: JSON.stringify(puzzle.question, (key, value) => typeof value === "bigint" ? value.toString() + "n" : value)
        };
        POW.taskStorage[id] = {
            task: task,
            time: Date.now(),
            label: label,
            puzzle: puzzle
        };
        return task;
    }
    async check(resolvedCaptcha, label) {
        // if (process.env.NODE_ENV !== "production" && process.env.CAPTCHA_BYPASS) return true
        if (POW.taskStorage[resolvedCaptcha.id] === undefined)
            return false;
        if (POW.taskStorage[resolvedCaptcha.id].label !== label)
            return false;
        let puzzle = POW.taskStorage[resolvedCaptcha.id].puzzle;
        if (puzzle.solution === BigInt(resolvedCaptcha.solution)) {
            delete (POW.taskStorage[resolvedCaptcha.id]);
            return true;
        }
        else {
            return false;
        }
    }
}
exports.POW = POW;
