const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const util = require('./util');

const argv = yargs.alias('m', 'main').alias('p', 'package').argv;
function run() {
  const { main, packages } = util.resolve(argv);
  util.release({ main, packages, params: argv });
}

run();
