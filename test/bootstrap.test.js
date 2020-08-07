before(function(done) {
  this.timeout(50000);
  let App, rc, sails;
  Sails = require('./fixtures/v0.12-app/node_modules/sails').Sails;
  rc = require('./fixtures/v0.12-app/app').rc;
  Sails().lift(rc, (err, _sails) => {
    if (err) { return done(err); }
    global.sails = _sails;
    return done(err, sails);
  });
});

after(function(done) {

  if (global.sails) {
    return global.sails.lower(
      function (err) {
        if (err) {
          done();
          return process.exit(2);
        }
        done();
        return process.exit(0);
      }
    );
  }
  // Otherwise just return
  done();
  return process.exit(2);
});