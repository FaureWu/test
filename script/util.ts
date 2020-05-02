const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const commonjs = require('rollup-plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const shell = require('shelljs');
const standardVersion = require('standard-version');
const compareVersion = require('compare-version');

interface PackageConfig {
  main: string;
  module: string;
  name: string;
  version: string;
  [props: string]: any;
}

interface Package {
  name: string;
  sourcePath: string;
  rootPath: string;
  tsConfigPath: string;
  packageJson: PackageConfig;
}

interface Params {
  main: boolean | string;
  package: boolean | string;
  [props: string]: any;
}

interface Commit {
  commit: string;
  message: string;
}

interface Tag {
  package: string;
  version: string;
}

const rootPath = process.cwd();
const packageRootPath = path.resolve(rootPath, 'package');

function getPackageNames() {
  if (!fs.existsSync(packageRootPath)) return [];

  return fs
    .readdirSync(packageRootPath)
    .reduce((_: string[], file: string): string[] => {
      const packagePath = path.resolve(packageRootPath, file);
      if (
        fs.statSync(packagePath).isDirectory() &&
        fs.existsSync(path.resolve(packagePath, 'index.ts'))
      ) {
        _.push(file);
      }

      return _;
    }, []);
}

function toCamel(name: string): string {
  return name.replace(/\_(\w)/g, function (all, letter) {
    return letter.toUpperCase();
  });
}

function getTag(tag: string): Tag | null {
  const match = tag.match(/tag: (.+)@(\d+.\d+.\d+)/) as
    | [string, string, string]
    | null;

  if (!match) return match;

  return { package: match[1], version: match[2] };
}

function getNewCommits(
  messages: string[],
  commits: string[],
  tags: string[],
  version: string,
): Commit[] {
  const result = [] as Commit[];

  messages.every((message: string, index: number): boolean => {
    const match = message.match(
      /^(revert: )?(feat|fix|docs|style|refactor|perf|test|build|chore|release)(\(.+\))?: .{1,50}/,
    );
    if (!match) {
      // 不符合commit规范，直接舍弃
      return true;
    }

    if (!match[1] && match[2] === 'release') {
      // 发布节点提交
      const tag = getTag(tags[index]);
      if (tag && compareVersion(tag.version, version) === -1) {
        return false;
      }
    }

    result.push({
      message,
      commit: commits[index],
    });
    return true;
  });

  return result;
}

function changelog({
  version,
  package,
}: {
  version: string;
  package: string;
}): void {
  const messages = shell
    .exec('git log --pretty=format:%s', { silent: true })
    .stdout.split('\n');
  const commits = shell
    .exec('git log --pretty=format:%h', { silent: true })
    .stdout.split('\n');
  const tags = shell
    .exec('git log --pretty=format:%d', { silent: true })
    .stdout.split('\n');

  const newCommits = getNewCommits(messages, commits, tags, version);
  console.log(version, newCommits);
}

async function buildPackage(packages: Package[]): Promise<void> {
  const pkg = packages.splice(0, 1)[0];
  if (!pkg) return;

  const { sourcePath, rootPath, packageJson, tsConfigPath } = pkg;

  const bundle = await rollup.rollup({
    input: path.resolve(sourcePath, 'index.ts'),
    plugins: [
      nodeResolve({
        mainFields: ['module', 'main', 'jsnext'],
      }),
      typescript({
        useTsconfigDeclarationDir: false,
        clean: true,
        tsconfig: tsConfigPath,
        rollupCommonJSResolveHack: true,
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      }),
      commonjs(),
    ],
  });

  await bundle.write({
    file: path.resolve(rootPath, packageJson.main),
    format: 'umd',
    name: toCamel(packageJson.name),
    exports: 'named',
  });

  await bundle.write({
    file: path.resolve(rootPath, packageJson.module),
    format: 'es',
    exports: 'named',
  });

  await buildPackage(packages);
}

async function build(packages: Package[]): Promise<void> {
  await buildPackage(packages.slice(0));
}

function getPackage(name: string): Package {
  return {
    name,
    sourcePath: path.resolve(packageRootPath, name),
    rootPath: path.resolve(packageRootPath, name),
    packageJson: require(path.resolve(packageRootPath, name, 'package.json')),
    tsConfigPath: path.resolve(packageRootPath, name, 'tsconfig.json'),
  };
}

function getMain(): Package {
  return {
    name: 'core',
    sourcePath: path.resolve(rootPath, 'src'),
    rootPath,
    packageJson: require(path.resolve(rootPath, 'package.json')),
    tsConfigPath: path.resolve(rootPath, 'tsconfig.json'),
  };
}

function resolve(
  params: Params,
): {
  rootPath: string;
  packageRootPath: string;
  main: null | Package;
  packages: Package[];
} {
  const result: {
    rootPath: string;
    packageRootPath: string;
    main: null | Package;
    packages: Package[];
  } = {
    rootPath,
    packageRootPath,
    main: null,
    packages: [],
  };

  if (params.package) {
    if (params.main) {
      result.main = getMain();
    }

    if (typeof params.package === 'string') {
      result.packages = params.package.split(',').map(getPackage);
    } else {
      result.packages = getPackageNames().map(getPackage);
    }
  } else if (params.main) {
    result.main = getMain();
  } else {
    result.main = getMain();
    result.packages = getPackageNames().map(getPackage);
  }

  return result;
}

async function runRelease(
  config: { name: string; [prop: string]: any },
  params: Params,
): Promise<void> {
  await standardVersion({
    ...config,
    silent: false,
    noVerify: true,
    prerelease: params.prerelease,
    firstRelease: params.firstRelease,
    releaseCommitMessageFormat: `release(${config.name}): {{currentTag}}`,
    skip: {
      changelog: true,
    },
  });
  shell.exec('git push --follow-tags origin master');
}

async function releasePackage({
  packages,
  params,
}: {
  packages: Package[];
  params: Params;
}): Promise<void> {
  const pkg = packages.splice(0, 1)[0];
  if (!pkg) return;

  if (fs.existsSync(pkg.rootPath)) {
    shell.cd(pkg.rootPath);
    await runRelease(
      {
        tagPrefix: `${pkg.packageJson.name}@`,
        name: pkg.name,
        // infile: path.resolve(pkg.rootPath, 'CHANGELOG.md'),
      },
      params,
    );
    changelog({
      package: pkg.name,
      version: require(path.release(pkg.rootPath, 'package.json').version),
    });
  }

  await releasePackage({ packages, params });
}

async function release({
  main,
  packages,
  params,
}: {
  main: Package;
  packages: Package[];
  params: Params;
}): Promise<void> {
  if (main) {
    const packageJson = require(path.resolve(main.rootPath, 'package.json'));
    shell.cd(main.rootPath);
    await runRelease(
      {
        tagPrefix: `${packageJson.name}@`,
        name: main.name,
        // infile: path.resolve(main.rootPath, 'CHANGELOG.md'),
      },
      params,
    );
  }

  await releasePackage({
    packages: packages.slice(0),
    params,
  });
}

module.exports = {
  build,
  resolve,
  release,
};
