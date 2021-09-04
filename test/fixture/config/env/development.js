module.exports = {
  // models: {
  //  connection: 'postgres'
   
  // },
  port: process.env.PORT === undefined ? 42772 : process.env.PORT,
  log: {
    level: process.env.LOG_LEVEL === undefined ? 'verbose' : process.env.PORT
   }
};
