const yargs = require('yargs');
const pkg = require('../package.json');
const util = require('./util');

const argv = yargs.alias('m', 'main').alias('p', 'package').argv;

function run() {
  const { main, packages } = util.resolve(argv);

  if (main !== null) {
    util.build([main].concat(packages));
  } else {
    util.build(packages);
  }
}

run();
