
var migrate;
if (process.env.DB_MIGRATE  === 'alter' || process.env.DB_MIGRATE  === 'safe' || process.env.DB_MIGRATE  === 'drop'){
  migrate = process.env.DB_MIGRATE
} else {
  migrate = 'safe'
}


module.exports.models = {
    migrate: migrate  
  // migrate: 'drop'
  // migrate: 'safe'
//    migrate: 'alter'
};