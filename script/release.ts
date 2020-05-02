const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const yargs = require('yargs');
const standardVersion = require('standard-version');

const argv = yargs.alias('m', 'main').alias('p', 'package').argv;

const rootPath = process.cwd();
const packageRootPath = path.resolve(rootPath, 'package');

function release(): void {
  // if (!fs.existsSync(packageRootPath)) return;
  shell.cd(path.resolve(packageRootPath, 'test'));

  standardVersion({
    firstRelease: true,
    infile: path.resolve(packageRootPath, 'CHANGELOG.md'),
  });
}

function run() {
  release();
}

run();
