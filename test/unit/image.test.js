"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
describe('Image', function () {
    it('Image Model attributes', async function () {
        // @ts-ignore
        let img = await Image.create({
            "images": {
                "origin": "/images/72fe193c-ed34-4ee2-89e1-f22cb7f99e0d.png",
                "small": "/images/27ed4b5b-7161-4d88-bf76-fae8023aff9f.png",
                "large": "/images/9399fd28-e03a-4f86-8078-a37c67d08c94.png"
            },
            "uploadDate": "2020-10-13 16:23:20",
        });
        chai_1.expect(img).to.include.all.keys('id', 'images', 'dish', 'group', 'uploadDate');
    });
});