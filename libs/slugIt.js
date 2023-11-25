"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugIt = void 0;
const slugify_1 = __importDefault(require("slugify"));
async function slugIt(model, name, slugField = 'slug', opts) {
    if (!Object.keys(sails.models).includes(model))
        throw `Sails not have models [${model}]`;
    if (!Object.keys(sails.models[model].attributes).includes(slugField))
        throw `Model with name [${model}] has not field field [${slugField}]`;
    let postfix = "";
    if (opts.length) {
        postfix = " " + opts.join(' ');
    }
    let slug = (0, slugify_1.default)(`${name}${postfix}`, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en' });
    let criteria = {};
    criteria[slugField] = { contains: slug };
    const count = await sails.models[model].count(criteria);
    slug = count === 0 ? slug : slug + "-" + count;
    return slug;
}
exports.slugIt = slugIt;
