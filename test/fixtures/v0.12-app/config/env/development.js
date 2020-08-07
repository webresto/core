module.exports = {
  models: {
   connection: 'postgres'
  },
  port: process.env.PORT === undefined ? 42777 : process.env.PORT,
  log: {
    level: "verbose"
   }
};
