module.exports = {
  // models: {
  //   connection: 'postgres',
  //   migrate: 'safe'
  // },
  adminpanel:{
    auth: true
  },
  log: {
    level: 'info'
  },
  port: process.env.GF_PORT === undefined ? 42772 : process.env.GF_PORT,
  log: {
   level: "verbose"
  }
};
