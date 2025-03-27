// Ensure we're in the project directory, so cwd-relative paths work as expected
// no matter where we actually lift from.
// > Note: This is not required in order to lift, but it is a convenient default.
process.chdir(__dirname);

// Attempt to import `sails`.
var sails;
try {
  sails = require('sails');
} catch (e) {
  sails.log.error('To run an app using `node app.js`, you usually need to have a version of `sails` installed in the same directory as your app.');
  sails.log.error('To do that, run `npm install sails`');
  sails.log.error('');
  sails.log.error('Alternatively, if you have sails installed globally (i.e. you did `npm install -g sails`), you can use `sails lift`.');
  sails.log.error('When you run `sails lift`, your app will still use a local `./node_modules/sails` dependency if it exists,');
  sails.log.error('but if it doesn\'t, the app will run with the global sails instead!');
  return;
}

// --•
// Try to get `rc` dependency (for loading `.sailsrc` files).
var rc;
try {
  rc = require('rc');
} catch (e0) {
  try {
    rc = require('sails/node_modules/rc');
  } catch (e1) {
    sails.log.error('Could not find dependency: `rc`.');
    sails.log.error('Your `.sailsrc` file(s) will be ignored.');
    sails.log.error('To resolve this, run:');
    sails.log.error('npm install rc --save');
    rc = function () { return {}; };
  }
}


// Start server
sails.lift(rc('sails'));

