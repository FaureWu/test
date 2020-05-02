# TS 工具库脚手架搭建文档

## 初始化 npm 包

```bash
$ npm init -y
```

## 安装 ts 编译能力

```bash
$ npm install -g typescript
$ tsc --init
```

修改配置如下:

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "module": "umd",
    "target": "es5",
    "lib": ["es6"],
    "sourceMap": true,
    "allowJs": true,
    "jsx": "react",
    "moduleResolution": "node",
    "rootDir": "src",
    "declaration": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  },
  "exclude": ["node_modules", "dist", "__test__"]
}
```

[tsconfig 配置](https://www.typescriptlang.org/v2/en/tsconfig)

## 添加.editorconfig 配置

> 配置.eslintignore

```
#editorconfig.org
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_trailing_newline = true

[*.md]
trim_trailing_whitespace = false
```

[editorconfig 配置](https://github.com/editorconfig/editorconfig/blob/master/.editorconfig)

## 添加 eslint 代码验证

[关于弃用 tslint 的原因](https://github.com/typescript-eslint/typescript-eslint#what-about-tslint)

```bash
$ npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

> 配置.eslintrc 文件

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ]
}
```

[为 typescript 项目配置 eslint](https://github.com/typescript-eslint/typescript-eslint/blob/master/docs/getting-started/linting/README.md)

## 添加代码格式化 prettier

```bash
$ npm run install --save-dev eslint-config-prettier
```

> 修改配置.eslintrc 文件

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",

    // 新增配置
    "prettier/@typescript-eslint"
  ]
}
```

> 配置.prettierrc 文件

```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

[prettierrc 配置](https://prettier.io/docs/en/configuration.html)

## 添加单元测试支持 Jest

```bash
$ npm install --save-dev jest @type/jest ts-jest eslint-plugin-jest
```

> 修改配置.eslintrc 文件

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier/@typescript-eslint",

    // 新增配置
    "plugin:jest/recommended"
  ]
}
```

> 配置 jest.config.ts 文件

```js
module.exports = {
  preset: 'ts-jest',
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: ['**/test/**/*.test.(ts|js)'],
  testEnvironment: 'node',
};
```

## 添加提交风格及 changelog 生成

```bash
$ npm install --save-dev @commitlint/cli @commitlint/config-conventional commitizen husky conventional-changelog conventional-changelog-cli cz-conventional-changelog standard-version lint-staged
```

> 配置 package.json 文件

```json
{
  // 新增如下
  "commitlint": {
    "extends": ["@commitlint/config-conventional"]
  },
  "config": {
    "commitizen": {
      "path": "./node_modules/cz-conventional-changelog"
    }
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,md,json}": ["prettier --write", "npm run lint", "git add"],
    "*.ts": ["prettier --parser=typescript --write", "npm run lint", "git add"]
  }
}
```
