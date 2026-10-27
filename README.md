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
*   **精致玻璃质感 UI**：高斯模糊玻璃面板、流畅的展开动画、顶部 Toast 通知替代弹窗、跟随 B 站暗色模式自动换装，并记忆上次的导出配置。

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

## 📝 更新日志

### v0.4.1 (2026-10-28)

性能与工程化收尾，行为与 0.4.0 保持一致：

*   ⚡ **楼中楼并发抓取**：同一页内不同楼层的子评论改为 3 路并发，单个楼层内部仍严格按页顺序，导出结果的「主评论 → 其楼中楼」相邻关系不变。
*   🚦 **全局令牌桶限速**：所有 API 请求统一排队，保证全局最小请求间隔。之前「每个循环里 sleep」在并发下无法约束整体 QPS，现在「请求间隔」设置对所有请求真实生效，风控风险可控。
*   🧱 **CSV 分块构建**：改为按 2000 行分块生成 `Blob`，不再把全部行拼成一个超大字符串，十万级评论导出时内存峰值明显下降。
*   🧾 **日志合批刷新**：抓取高峰每秒几十条日志，改为 120ms 合并一次、用 `DocumentFragment` 批量插入；用户向上翻看历史日志时不再被强制拉到底部。
*   ✅ **测试入库**：新增 `test/` 与 `npm test`（Node 内置 test runner，零依赖），覆盖 MD5/BV/WBI 签名、CSV 转义与分块、限速与并发、错误分类、抓取与取消流程、UI 构建与一次完整的端到端导出。

### v0.4.0 (2026-10-28)

依据 [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 文档对 API 调用层做的一次结构性重构：

*   🧱 **统一 API 客户端**：`getWbiKeys` / 主评论 / 楼中楼 / 投稿列表统一走 `apiGet()`，签名、超时、状态码、业务错误码、重试策略集中在一处，不再各自拼装。
*   🛑 **错误分类与熔断**：只有网络异常、超时、HTTP 5xx/429 才退避重试（带随机抖动）；HTTP 412、`-352`、`-400`、`12002` 等不可恢复错误立即失败并给出可操作提示，避免把风控打成常态。
*   🧩 **空响应防御**：识别文档中的 `code:0 + data.v_voucher` 响应，不再因 `data.cursor` 缺失抛 `TypeError`；`top_replies` 等字段统一做类型判断。
*   ✍️ **签名不再伪造**：Wbi 密钥获取失败时不再用空 mixin_key 拼出一个必然被拒的 `w_rid`，而是明确报错提示刷新/登录。
*   ⏹ **取消立即生效**：导出全程共享 `AbortController`，在途请求与等待间隔都能被立刻打断；**取消/中断后会保存已抓取的部分数据**（文件名带 `_中断` 后缀）。
*   🔢 **进度更诚实**：`all_count` 含子评论，未勾选楼中楼时不再显示永远到不了 100% 的百分比，改为「已抓取 N 条」+ 不确定进度条；批量导出显示第几个视频。
*   🧮 **子评论分页更可靠**：改用响应中的 `data.page.count` 计算总页数，不再依赖「返回不足 20 条即结束」，楼层有删除时也能抓全；抓取失败的楼层会在结束时汇总提示。
*   🧯 **大数组修复**：批量导出改用逐条合并，避免 `push(...arr)` 在评论数上万时触发 `RangeError`。
*   🛡️ **CSV 公式注入防护**：对以 `= + - @` 开头的字段加前缀单引号，防止评论内容在 Excel/WPS 中被当作公式执行。
*   ✅ **BV 号校验**：非法 BV（长度/字符集不符）直接提示错误，不再静默算出错误的 avid；大小写前缀 `bv` 会被规范化。
*   📑 **投稿列表风控识别**：识别 `data.is_risk`，不再把风控返回误判为「没有更多视频」而静默截断；翻页时按 bvid 去重。
*   🧹 **工程清理**：移除误提交的第三方构建产物 `export-comment.js`，补充 `.gitignore`；表单数值做范围收敛（延时 100–10000ms、页数 1–50）。

### v0.3.2 (2026-10-28)

依据 [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 文档对 API 层的优化：

*   🔓 **未登录可用**：Wbi 密钥获取兼容 nav 接口未登录响应（code -101 时 `wbi_img` 仍然有效），未登录状态下导出不再退化为无签名请求。
*   💾 **Wbi 密钥跨会话缓存**：Wbi Key 全站统一且每日才更替，现缓存至 `localStorage`（6 小时有效期），跨页面刷新复用，减少 nav 请求与被风控概率。
*   🔁 **签名自动重试**：主评论接口返回 `-403`（Wbi 签名被拒，密钥可能已更替）时，自动刷新密钥重签并重试当前页。
*   📌 **置顶评论补全**：置顶评论除 `top_replies` 外，还会从 `top.admin` / `top.upper` / `top.vote` 合并，不再漏抓 UP 主置顶。
*   💬 **错误信息可读化**：`12002`（评论区已关闭）、`-352` / `-412` / HTTP 412（风控校验失败）等错误码映射为明确提示与处理建议。

### v0.3.1 (2026-10-28)

*   🐛 **修复顶栏空白 / 评论区无法加载**：入口按钮此前可能在 B 站前端 Vue hydration（水合）窗口期内被插入工具栏，打断其初始化渲染，导致页面顶栏为空、评论列表不加载。现在入口注入会等待页面 `load` 完成后再进行（并为 `history` 路由钩子与 MutationObserver 回调添加了异常隔离，避免脚本异常传播进宿主页面）。

### v0.3.0 (2026-10-28)

*   🧲 **入口重构**：移除右下角悬浮按钮，导出入口原生集成到视频操作栏（点赞/投币/收藏/分享旁）与 UP 主空间页操作区（关注/发消息旁），SPA 切换视频自动重新注入，并兼容旧版页面结构。
*   🌙 **暗色模式**：面板、入口按钮、Toast 跟随 B 站暗色主题自动切换配色。
*   🍞 **Toast 通知**：所有提示改用顶部 Toast，替代突兀的 `alert` 弹窗；输入校验失败时输入框抖动聚焦。
*   💾 **配置记忆**：排序方式、楼中楼开关、请求延迟等导出配置持久化到 `localStorage`，重新打开面板自动恢复。
*   🐛 **问题修复**：
    *   修复调用未定义的 `updateProgressUI` 导致导出首轮即报错的问题。
    *   修复设置"主评论限制数量"后被误判为用户取消、不保存 CSV 的问题。
    *   修复批量导出时"单视频主评论限制"不生效、会翻完整本视频评论的问题（现达到上限立即切换下一个视频）。
*   ✨ **UI/UX 优化**：进度视图新增百分比大数字；进度/看板与表单改为视图切换，不再随内容滚动；完成横幅、摘要卡片、图表卡片重绘；Esc 关闭面板；支持 Enter 快捷开始导出；导出按钮禁用态统一样式。

### v0.2.0 (2026-06-17)

*   🛡️ **网络健壮性**：所有 API 请求新增 15s 超时保护和自动重试机制（最多 3 次，指数退避），避免偶发网络波动导致导出中断。
*   ⚡ **Wbi Key 缓存**：缓存已获取的 Wbi 签名密钥（5 分钟有效期），批量导出时不再每个视频重复请求。
*   🚀 **性能优化**：CSV 构建改用数组拼接，进度 DOM 更新改为 500ms 节流，大规模数据导出时页面更流畅。
*   📊 **导出耗时显示**：完成导出后在看板顶部展示总耗时。
*   🔔 **桌面通知**：导出完成后发送浏览器通知，便于长时间导出时切换标签页。
*   ✂️ **拖拽面板**：控制面板现可通过拖拽标题栏自由移动到屏幕任意位置。
*   🛡️ **防重复点击**：导出进行中禁用导出按钮，防止并发触发。
*   🧹 **代码整洁**：简化 `@match` 规则、修复 `URL.revokeObjectURL` 安全时序、rpid 类型安全。

---

## ⚖️ 免责声明

1.  本项目代码仅供个人学习、研究和交流使用，请勿用于商业及非法用途。
2.  在使用本工具时，请遵守哔哩哔哩（Bilibili）相关用户协议及法律法规，因滥用工具导致账号被封禁或由此产生的其他后果由使用者自行承担。
