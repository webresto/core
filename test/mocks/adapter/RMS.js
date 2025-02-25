"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRMS = void 0;
const RMSAdapter_1 = __importDefault(require("../../../adapters/rms/RMSAdapter"));
// todo: fix types model instance to {%ModelName%}Record for Dish";
// todo: fix types model instance to {%ModelName%}Record for Group";
// todo: fix types model instance to {%ModelName%}Record for Order";
const dish_generator_1 = __importDefault(require("../../generators/dish.generator"));
const group_generator_1 = __importDefault(require("../../generators/group.generator"));
class TestRMS extends RMSAdapter_1.default {
    async initialized() {
        return;
    }
    async customInitialize() {
        return;
    }
    async loadOutOfStocksDishes(concept) {
        return;
    }
    async nomenclatureHasUpdated() {
        return true;
    }
    /**
     Since 7 dishes are created for each group, the total number of dishes will be 88 groups * 7 dishes = 616 dishes.
    *  */
    async loadNomenclatureTree(rmsGroupIds) {
        let groups = [];
        for (let i = 0; i < 4; i++) {
            let group = (0, group_generator_1.default)();
            groups.push(group);
            for (let x = 0; x < 3; x++) {
                let subGroup = (0, group_generator_1.default)({ parentGroup: group.id });
                groups.push(subGroup);
                for (let y = 0; y < 2; y++) {
                    let subSubGroup = (0, group_generator_1.default)({ parentGroup: subGroup.id });
                    groups.push(subSubGroup);
                    for (let z = 0; z < 2; z++) {
                        let subSubSubGroup = (0, group_generator_1.default)({ parentGroup: subSubGroup.id });
                        groups.push(subSubSubGroup);
                    }
                }
            }
        }
        return groups;
    }
    async loadProductsByGroup(group) {
        let dishes = [];
        for (let i = 0; i < 7; i++) {
            dishes.push((0, dish_generator_1.default)({
                parentGroup: group.id,
                price: 100.1,
                name: undefined
            }));
        }
        return dishes;
    }
    createOrder(orderData) {
        console.log("Method not implemented.");
        return;
    }
    checkOrder(orderData) {
        console.log("Method not implemented.");
        return;
    }
    api(method, params) {
        throw process.env[method] = JSON.stringify(params);
    }
}
exports.TestRMS = TestRMS;
