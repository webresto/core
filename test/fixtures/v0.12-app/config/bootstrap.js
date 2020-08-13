const groupGenerator = require("../../../generators/group.generator").default;
const dishGenerator = require("../../../generators/dish.generator").default;

module.exports.bootstrap = function(cb) {
  var group = groupGenerator({name: "pizza"});
  console.log(group);
  cb();
};
