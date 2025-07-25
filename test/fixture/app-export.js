var fs = require('fs');
/**
 * app.js
 *
 * Use `app.js` to run your app without `sails lift`.
 * To start the server, run: `node app.js`.
 *
 * This is handy in situations where the sails CLI is not relevant or useful.
 *
 * For example:
 *   => `node app.js`
 *   => `forever start app.js`
 *   => `node debug app.js`
 *   => `modulus deploy`
 *   => `heroku scale`
 *
 *
 * The same command-line arguments are supported, e.g.:
 * `node app.js --silent --port=80 --prod`
 */


// Ensure we're in the project directory, so cwd-relative paths work as expected
// no matter where we actually lift from.
// > Note: This is not required in order to lift, but it is a convenient default.
process.chdir(__dirname);

// filedb not present clean environment in drop
if (fs.existsSync(__dirname + "/.tmp/localDiskDb")) {
  fs.rmSync(__dirname + "/.tmp/localDiskDb", { recursive: true, force: true });
}

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
    rc = require('sails/accessible/rc');
  } catch (e1) {
    sails.log.error('Could not find dependency: `rc`.');
    sails.log.error('Your `.sailsrc` file(s) will be ignored.');
    sails.log.error('To resolve this, run:');
    sails.log.error('npm install rc --save');
    rc = function () { return {}; };
  }
}



// function sails() {
//   return new Promise(function (resolve, reject) {
//     sails.lift(rc('sails'), (err, _sails) => {
//       if (err) { return done(err); }
//       resolve(_sails);
//     });
//   })
// }


module.exports = {
  sails: sails,
  rc: rc('sails')
}
