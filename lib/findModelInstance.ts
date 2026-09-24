export default function findModelInstanceByAttributes(obj: any): string | null {
    const models = Object.keys(sails.models);

    for (let i = 0; i < models.length; i++) {
      const model = sails.models[models[i]];
      const data = {...obj}
      // deleting virtual fields
      if(model.globalId === "Dish"){
        delete data.discountAmount
        delete data.discountType
        delete data.oldPrice
        delete data.salePrice
      }

      if(model.globalId === "Group"){
        delete data.discountAmount
        delete data.discountType
      }

      const targetAttributes = Object.keys(data).filter(attr => !['createdAt', 'updatedAt', 'id'].includes(attr));
      const modelAttributes = Object.keys(model.attributes).filter(attr => !['createdAt', 'updatedAt', 'id'].includes(attr));
      const matches = targetAttributes.every(attr => modelAttributes.includes(attr));

      if (matches) {
        return model.globalId;
      }
    }

    return null;
  }
