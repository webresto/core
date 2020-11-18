const groupGenerator = require("../../../generators/group.generator").default;
const dishGenerator = require("../../../generators/dish.generator").default;

module.exports.bootstrap = async function(cb) {
  // var group = groupGenerator({name: "pizza"});
  for(let i = 0; i < 5; i++){
    let group = await Group.create(groupGenerator());
    for(let x = 0; x < 3; x++){        
      let subGroup = await Group.create(groupGenerator({parentGroup: group}));
      for(let y = 0; y < 2; y++){
        let subSubGroup = await Group.create(groupGenerator({parentGroup: subGroup}));
        try {    
          await Dish.create(dishGenerator({parentGroup: subSubGroup}));
        } catch (error) {
          console.log(error);
        }
      }
    }
  }

  try {    
    var dishes = await Dish.find({});
  } catch (error) {
    console.log(error);
  }
  console.log('Dishes: '+dishes.length);
  cb();
};
