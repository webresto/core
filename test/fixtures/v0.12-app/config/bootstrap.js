const groupGenerator = require("../../../generators/group.generator").default;
const dishGenerator = require("../../../generators/dish.generator").default;

module.exports.bootstrap = async function(cb) {
  var group = groupGenerator({name: "pizza"});
  // let group = groupGenerator();
  console.log(group);
  try {
    await Group.create(group);
  } catch (error) {
    console.log(error);
  }
  for(let i = 0; i < 5; i++){
    // try {
    
    //   let group = await Group.create(groupGenerator());
    // } catch (error) {
    //   console.log(error);
    // }
    for(let x = 0; x < 3; x++){

      // try {        
      //   let subGroup = await Group.create(groupGenerator({parentGroup: group}));
      // } catch (error) {
      //   console.log(error);
      // }
    }
  }
  cb();
};
