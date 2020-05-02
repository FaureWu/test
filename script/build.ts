const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const commonjs = require('rollup-plugin-commonjs');
const typescript = require('rollup-plugin-typescript2');
const yargs = require('yargs');
const pkg = require('../package.json');

const argv = yargs.alias('m', 'main').alias('p', 'package').argv;

const rootPath = process.cwd();
const packageRootPath = path.resolve(rootPath, 'package');

function getPackages() {
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
}

interface Package {
  sourcePath: string;
  distPath: string;
  tsConfig: string;
  packageJson: PackageConfig;
}

async function build(packages: Package[]): Promise<void> {
  const pkg = packages.splice(0, 1)[0];
  if (!pkg) return;

  const { sourcePath, distPath, packageJson, tsConfig } = pkg;

  const bundle = await rollup.rollup({
    input: path.resolve(sourcePath, 'index.ts'),
    plugins: [
      nodeResolve({
        mainFields: ['module', 'main', 'jsnext'],
      }),
      typescript({
        useTsconfigDeclarationDir: false,
        clean: true,
        tsconfig: tsConfig,
        rollupCommonJSResolveHack: true,
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      }),
      commonjs(),
    ],
  });

  await bundle.write({
    file: path.resolve(distPath, packageJson.main),
    format: 'umd',
    name: toCamel(packageJson.name),
    exports: 'named',
  });

  await bundle.write({
    file: path.resolve(distPath, packageJson.module),
    format: 'es',
    exports: 'named',
  });

  await build(packages);
}

function run() {
  if (argv.package) {
    let packages = [];
    if (typeof argv.package === 'string') {
      // 此模式下仅打包指定子包
      const packageNames = argv.package.split(',');
      packages = packageNames.map(
        (name: string): Package => ({
          sourcePath: path.resolve(packageRootPath, name),
          distPath: path.resolve(packageRootPath, name),
          packageJson: require(path.resolve(
            packageRootPath,
            `${name}/package.json`,
          )),
          tsConfig: path.resolve(packageRootPath, `${name}/tsconfig.json`),
        }),
      );
    } else {
      // 此模式下打包所有的子包
      packages = getPackages().map(
        (name: string): Package => ({
          sourcePath: path.resolve(packageRootPath, name),
          distPath: path.resolve(packageRootPath, name),
          packageJson: require(path.resolve(
            packageRootPath,
            `${name}/package.json`,
          )),
          tsConfig: path.resolve(packageRootPath, `${name}/tsconfig.json`),
        }),
      );
    }
    build(packages);
  } else if (argv.main) {
    // 此模式下仅打包主包
    build([
      {
        sourcePath: path.resolve(rootPath, 'src'),
        distPath: rootPath,
        packageJson: pkg,
        tsConfig: path.resolve(rootPath, 'tsconfig.json'),
      },
    ]);
  } else {
    // 此模式下会打包主包及所以子包
    let packages = [
      {
        sourcePath: path.resolve(rootPath, 'src'),
        distPath: rootPath,
        packageJson: pkg,
        tsConfig: path.resolve(rootPath, 'tsconfig.json'),
      },
    ];
    packages = packages.concat(
      getPackages().map(
        (name: string): Package => ({
          sourcePath: path.resolve(packageRootPath, name),
          distPath: path.resolve(packageRootPath, name),
          packageJson: require(path.resolve(
            packageRootPath,
            `${name}/package.json`,
          )),
          tsConfig: path.resolve(packageRootPath, `${name}/tsconfig.json`),
        }),
      ),
    );
    build(packages);
  }
}

run();
