"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// (obj: Record<string, unknown>)
function findModelInstanceByAttributes(obj) {
    const models = Object.keys(sails.models);
    const targetAttributes = Object.keys(obj).filter(attr => !['createdAt', 'updatedAt', 'id'].includes(attr));
    for (let i = 0; i < models.length; i++) {
        const model = sails.models[models[i]];
        const modelAttributes = Object.keys(model.attributes).filter(attr => !['createdAt', 'updatedAt', 'id'].includes(attr));
        const matches = targetAttributes.every(attr => modelAttributes.includes(attr));
        if (matches) {
            return model.globalId;
        }
    }
    return null;
}
exports.default = findModelInstanceByAttributes;
