# 贡献指南

## 概览

项目仓库借助于 [pnpm 工作空间](https://pnpm.io/zh/workspaces) 来实现
[Monorepo](https://en.wikipedia.org/wiki/Monorepo) ，存放了多个互相关联的独立 Package 。

- 主题于 `theme` 目录中进行开发维护。
- 插件于 `plugins` 目录中进行开发维护。
- 文档于 `docs` 目录中进行开发维护。

在 `plugins` 目录中：

- `plugin-auto-frontmatter` ： 为 md 文件自动添加 frontmatter。
- `plugin-blog-data`： 生成 blog 文章列表数据
- `plugin-notes-data`： 生成 notes 数据，管理不同 note 的 `sidebar` 的数据
- ~~`plugin-caniuse`: 添加 `caniuse` 内容容器，已弃用，不再维护~~
- `plugin-content-update`: 重写 `Content` 组件，提供 `onContentUpdated` 钩子
- ~~`plugin-copy-code`: 为 代码块添加 复制 按钮，并适配 `shikiji`，已弃用，不再维护~~
- `plugin-search`: 为主题提供 全文模糊搜索 功能
- `plugin-shikiji`: 代码高亮插件，支持 highlight、diff、focus、error level
- `plugin-iconify`: 添加全局组件 `Iconify`
- `plugin-md-power`: 提供 markdown 增强功能
- `plugin-netlify-functions`: 提供 `netlify functions` 支持
- `plugin-page-collection`: 一个使用 `plugin-netlify-functions` 的插件示例

## 开发配置

开发要求：

- [Node.js](http://nodejs.org/) version 18.16.0+
- [pnpm](https://pnpm.io/zh/) version 9+

克隆代码仓库，并安装依赖：

```sh
pnpm install
```

构建源代码：

```sh
pnpm build
```

### 主要工具

- [TypeScript](https://www.typescriptlang.org/) 作为开发语言
- [ESLint](https://eslint.org/) 用于代码检查和格式化
- [StyleLint](https://stylelint.io/) 用于代码检查和格式化

### 开发脚本

#### `pnpm build`

`build` 命令使用 `tsc` 将源代码编译成 `lib` 目录下的 `.js` 文件。
同时复制 不需要编译的资源到对应的`lib` 目录下。

你在克隆代码仓库后，需要先执行该命令来确保项目代码可以顺利运行，因为编译后的输出目录被 `.gitignore` 排除在仓库以外了。

#### `pnpm dev`

`dev` 命令会在本地开启两个服务，一个是运行 主题`theme` 目录的 `tsc watch & copy watch`,
一个是运行 示例 `docs` 目录的 `vuepress` 开发服务。

`plugins` 目录下的所有插件，默认都没有 `dev` 命令，因此，你对 `plugins` 下的改动，可能需要执行 `pnpm build` 命令
进行重新构建，部分对 `plugins/**/node` 目录下的改动，可能需要 重新执行 `pnpm dev` 才能生效。

#### `pnpm lint`

`lint` 命令使用 ESLint 来检查所有源文件。

当 `lint` 给出了错误时，你可以手动修改源码以修复 eslint 的报错。
也可以执行 `pnpm lint --fix` 来自动修复。

### IDE 支持

推荐使用 `vs code` 进行开发。本仓库配置了开发本主题时，推荐的 `vs code` 扩展，
当你导入本仓库时，`vs code` 可能会推荐你安装一些扩展。
