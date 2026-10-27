# Bilibili Comment Exporter (bilibili-comment-exporter)

一款运行于浏览器环境的哔哩哔哩（B站）视频评论区导出油猴脚本（Tampermonkey UserScript）。该工具完全移植并适配了由 [WShihan](https://github.com/WShihan) 编写的基于 Go 语言的命令行评论下载工具 [blblcd](https://github.com/WShihan/blblcd) 的核心功能，并在此之上提供了极具现代视觉美感的控制面板及数据统计图表。

[![GitHub Repo stars](https://img.shields.io/github/stars/heroxv/bilibili-comment-exporter?style=plastic) ![GitHub repo size](https://img.shields.io/github/repo-size/heroxv/bilibili-comment-exporter?style=plastic) ![GitHub last commit](https://img.shields.io/github/last-commit/heroxv/bilibili-comment-exporter?style=plastic) ![GitHub](https://img.shields.io/github/license/heroxv/bilibili-comment-exporter?style=plastic) ![GitHub top language](https://img.shields.io/github/languages/top/heroxv/bilibili-comment-exporter?style=plastic)](https://github.com/heroxv/bilibili-comment-exporter)

---

### 🔗 关联项目：blblcd (Go 语言命令行下载工具)

本项目移植自下述项目的核心 API 与 CSV 数据结构定义：

*   **blblcd (Bilibili Comment Downloader)**：一款基于 [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 的B站视频评论下载命令行工具。
*   🗂️ 仓库： [Codeberg](https://codeberg.org/wsh233/blblcd) | [GitHub](https://github.com/WShihan/blblcd)
*   🎉 支持跨平台（Mac/Linux/Windows），可高效、快速地在终端下载并进行各种本地映射与统计。

## 🌟 项目特点

*   **全数据抓取**：支持导出视频下所有的主评论，以及评论下的楼中楼（子评论）。
*   **原生入口集成**：无悬浮按钮打扰，导出入口直接嵌入视频操作栏（点赞/投币/收藏/分享旁）与 UP 主空间页操作区，自动适配页面明暗主题。
*   **Wbi 鉴权签名**：脚本内建 Wbi 接口签名机制，自动获取 img_key 和 sub_key 完成签名，避免 API 请求返回 -403 受限。
*   **批量导出**：支持在 UP 主个人空间页（`space.bilibili.com`）一键批量抓取该 UP 主的投稿视频评论。
*   **Excel 兼容**：导出的 CSV 文件默认添加 UTF-8 BOM 编码头，彻底杜绝使用 Microsoft Excel/WPS 打开中文评论时出现的乱码问题。
*   **实时数据看板**：完成导出后，在页面内直接渲染可视化的数据分析统计：
    *   📍 **IP 属地分布** (Top 5 柱状图)
    *   📈 **用户等级分布** (LV1 - LV6 比例)
    *   👫 **用户性别比例** (男/女/保密 百分比)
*   **对齐 B 站原生界面**：沿用 B 站设计规范——品牌粉 `#FB7299`、扁平白卡、1px 细边框、12px 圆角、下划线式标签页，文字层级与 B 站一致；自动跟随 B 站明暗主题换装，并记忆上次的导出配置。

---

## 🎨 界面效果预览

| 视频工具栏入口 | 空间页入口 |
| :---: | :---: |
| ![视频工具栏入口](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E8%A7%86%E9%A2%91%E5%B7%A5%E5%85%B7%E6%A0%8F%E5%85%A5%E5%8F%A3.png) | ![空间页入口](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E7%A9%BA%E9%97%B4%E9%A1%B5%E5%85%A5%E5%8F%A3.png) |

| 控制面板 | 导出进度 | 数据看板 |
| :---: | :---: | :---: |
| ![控制面板](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E6%8E%A7%E5%88%B6%E9%9D%A2%E6%9D%BF.png) | ![导出进度](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E5%AF%BC%E5%87%BA%E8%BF%9B%E5%BA%A6.png) | ![数据看板](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E6%95%B0%E6%8D%AE%E7%9C%8B%E6%9D%BF.png) |
---

## 📂 项目结构

```text
bilibili-comment-exporter/
├── assets/
│   ├── logo.svg                         # 脚本标志图标 (Logo)
│   ├── 视频工具栏入口.png               # 视频操作栏中的导出评论按钮
│   ├── 空间页入口.png                   # UP 主空间页操作区的导出评论按钮
│   ├── 控制面板.png                     # 导出参数配置面板
│   ├── 导出进度.png                     # 导出评论数据进度视图
│   └── 数据看板.png                     # 数据可视化分析面板
├── bilibili_comment_exporter.user.js    # 油猴脚本核心源文件
├── test/
│   ├── harness.mjs                      # 测试装载器（最小 DOM / fetch 桩）
│   ├── logic.test.js                    # 纯函数、限速、API 与抓取流程测试
│   └── ui.test.js                       # 面板构建、日志合批与端到端测试
├── package.json                         # 仅用于本地测试（脚本本身无需构建）
├── .gitignore                           # Git 忽略规则
├── LICENSE                              # MIT 开源许可证
└── README.md                            # 项目说明文档
```

---

## 🧪 开发与测试

脚本本身是零依赖的单文件用户脚本，不需要构建。仓库内的 `package.json` 只用于跑离线测试：

```bash
npm test          # 等价于 node --test "test/*.test.js"
```

测试不联网：`test/harness.mjs` 会把脚本尾部的 `init()` 调用替换成内部函数导出，并提供最小的 `document` / `localStorage` / `fetch` 桩，因此可以直接断言签名算法、错误分类、并发与取消行为。修改脚本尾部结构时若装载失败，测试会给出明确报错。

---

## 🚀 安装指南

### 1. 准备工作
确保您的浏览器已安装了用户脚本管理器插件：
*   [Tampermonkey (油猴)](https://www.tampermonkey.net/) (强烈推荐)
*   [Violentmonkey (暴力猴)](https://violentmonkey.github.io/)

### 2. 安装脚本
*   👉 **[从 Greasy Fork 安装](https://greasyfork.org/zh-CN/scripts/582735)**（推荐）
*   👉 **[从 GitHub 直接安装](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/bilibili_comment_exporter.user.js)**
---

## 🛠️ 使用说明

### 视频评论导出
1.  打开任意 B站视频播放页面（例如：`https://www.bilibili.com/video/BV...`）。
2.  视频下方的操作栏（点赞 / 投币 / 收藏 / 分享 附近）会出现 **"导出评论"** 按钮，点击即可展开控制面板。
3.  脚本会自动提取并填入当前视频的 BVID。
4.  在面板中按需配置：
    *   **排序方式**：按热度优先或最新时间优先。
    *   **楼中楼**：是否抓取子评论。
    *   **数量限制**：设置最大抓取主评论数量（留空表示抓取全部）。
    *   **请求延迟**：默认 500 毫秒，调大可以降低触发防爬策略的风险。
5.  点击 **"开始导出"**。导出过程中可在控制台区域实时查看进度和日志。
6.  抓取完成后，浏览器会自动触发 CSV 文件下载，并展示数据统计看板。

### UP 主视频批量导出
1.  进入任意 B站 UP 主的空间首页（例如：`https://space.bilibili.com/...`）。
2.  点击 UP 主昵称旁操作区的 **"导出评论"** 按钮，面板会自动切到 **"UP主批量"** 选项卡并填入该 UP 主的 Mid。
3.  配置批量抓取的视频页数（默认 3 页，每页包含 30 个视频）以及其他过滤条件。
4.  点击 **"开始批量导出"**，脚本将依次迭代视频下载评论，并最终合并为一个 CSV 文件保存。

> 💡 面板支持拖拽标题栏移动位置，按 `Esc` 快速关闭；导出配置（排序、楼中楼、延迟等）会自动记忆，下次打开无需重新设置。

---

## 📊 导出字段说明

导出的 CSV 文件字段与命令行版 `blblcd` 保持一致：

| 字段名称 | 说明 | 示例 |
| :--- | :--- | :--- |
| **bvid** | 视频 BV 号 | BV1e7NRemEwv |
| **upname** | 评论发送者用户名 | 用户A |
| **sex** | 发送者性别 | 男 / 女 / 保密 |
| **content** | 评论正文 | 精彩的视频！ |
| **pictures** | 评论中附带的图片 URL | 图片链接 (若有多张用分号分隔) |
| **rpid** | 当前评论 ID | 243795113873 |
| **oid** | 视频的 AVID (十进制数字) | 113976755094913 |
| **mid** | 评论发送者的用户 UID | 123456 |
| **parent** | 父评论 ID | 若是一级评论则为 0，若是回复则为被回复评论的 ID |
| **fans_grade** | 是否佩戴粉丝牌 | 0：无，1：有（粉丝牌等级在 `member.fans_detail.medal_level`） |
| **ctime** | 评论发布时间戳 (秒) | 1718314584 |
| **like** | 评论获赞数 | 256 |
| **level** | 发送者的当前 B站等级 | 5 (表示 LV5) |
| **location** | 发送者 IP 归属地（需登录） | 北京 |

---

## ⚖️ 免责声明

1.  本项目代码仅供个人学习、研究和交流使用，请勿用于商业及非法用途。
2.  在使用本工具时，请遵守哔哩哔哩（Bilibili）相关用户协议及法律法规，因滥用工具导致账号被封禁或由此产生的其他后果由使用者自行承担。
