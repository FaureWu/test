const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const commonjs = require('rollup-plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const shell = require('shelljs');
const standardVersion = require('standard-version');

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

interface PackageConfig {
  main: string;
  module: string;
  name: string;
  version: string;
  [props: string]: any;
}

interface Package {
  name?: string;
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
  version: string;
}

const commitRE = /^(revert: )?(feat|fix|doc|style|refactor|perf|test|build|ci|chore|types|release|dep)(\(.+\))?: .{1,50}/;

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

  const newCommits = [] as Commit[];
  // commits.every((commit: string, index: number): boolean => {
  //   const [message, revert, type, name] = commit.match(commitRE) as [
  //     string,
  //     string,
  //     string,
  //     string,
  //   ];
  // });

  tags.every((tag: string, index: number): boolean => {
    if (!tag) {
      newCommits.push({
        commit: commits[index],
        message: messages[index],
        version,
        // ...resolveMessage(messages[index]),
      });
      return true;
    }

    const [, n, v] = tag.match(/tag: (.+)@(\d+.\d+.\d+)/) as [
      string,
      string,
      string,
    ];
    if (n === package && v === version) {
      newCommits.push({
        commit: commits[index],
        message: messages[index],
        version: v,
        // ...resolveMessage(messages[index]),
      });
      return true;
    }

    return false;
  });

  console.log(newCommits);
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

async function runRelease(config: object, params: Params): Promise<void> {
  await standardVersion({
    ...config,
    silent: true,
    noVerify: false,
    prerelease: params.prerelease,
    firstRelease: params.firstRelease,
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
        // infile: path.resolve(pkg.rootPath, 'CHANGELOG.md'),
      },
      params,
    );
    changelog({ package: 'test', version: '1.11.7' });
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
  commitRE,
};
