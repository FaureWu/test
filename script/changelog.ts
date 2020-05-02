// @ts-nocheck
const fs = require('fs');
const accessSync = require('fs-access').sync;
const conventionalChangelog = require('conventional-changelog');

const START_OF_LAST_RELEASE_PATTERN = /(^#+ \[?[0-9]+\.[0-9]+\.[0-9]+|<a name=)/m;

function changelog(args: object, newVersion) {
  return new Promise((resolve, reject) => {
    createIfMissing(args);
    const header = args.header;

    let oldContent = fs.readFileSync(args.infile, 'utf-8');
    const oldContentStart = oldContent.search(START_OF_LAST_RELEASE_PATTERN);
    // find the position of the last release and remove header:
    if (oldContentStart !== -1) {
      oldContent = oldContent.substring(oldContentStart);
    }
    let content = '';
    const context = { version: newVersion };
    const changelogStream = conventionalChangelog(
      {
        tagPrefix: args.tagPrefix,
        preset: 'angular',
      },
      context,
      { merges: null, path: args.path },
    ).on('error', function (err) {
      return reject(err);
    });

    changelogStream.on('data', function (buffer) {
      console.log(buffer.toString(), '...');
      content += buffer.toString();
    });

    changelogStream.on('end', function () {
      fs.writeFileSync(
        args.infile,
        header + '\n' + (content + oldContent).replace(/\n+$/, '\n'),
        'utf8',
      );
      return resolve();
    });
  });
}

function createIfMissing(args) {
  try {
    accessSync(args.infile, fs.F_OK);
  } catch (err) {
    if (err.code === 'ENOENT') {
      args.outputUnreleased = true;
      fs.writeFileSync(args.infile, '\n', 'utf8');
    }
  }
}

module.exports = {
  output: changelog,
};
