# Bilibili Comment Exporter

B 站视频评论区的导出工具，做成油猴脚本跑在浏览器里。点开视频或 UP 主空间页的「导出评论」，把主评论和楼中楼抓下来存成 CSV。

[![GitHub Repo stars](https://img.shields.io/github/stars/heroxv/bilibili-comment-exporter?style=plastic) ![GitHub repo size](https://img.shields.io/github/repo-size/heroxv/bilibili-comment-exporter?style=plastic) ![GitHub last commit](https://img.shields.io/github/last-commit/heroxv/bilibili-comment-exporter?style=plastic) ![GitHub](https://img.shields.io/github/license/heroxv/bilibili-comment-exporter?style=plastic) ![GitHub top language](https://img.shields.io/github/languages/top/heroxv/bilibili-comment-exporter?style=plastic)](https://github.com/heroxv/bilibili-comment-exporter)

---

## 和 blblcd 的关系

[blblcd](https://github.com/WShihan/blblcd) 是 [WShihan](https://github.com/WShihan) 用 Go 写的命令行评论下载工具，基于 [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)，跨 Mac / Linux / Windows。脚本的接口调用方式和 CSV 字段都沿用它，两边导出的数据可以对照着看。

仓库：[Codeberg](https://codeberg.org/wsh233/blblcd) | [GitHub](https://github.com/WShihan/blblcd)

## 功能

* 主评论、楼中楼（子评论）都能抓。
* 入口直接嵌在视频操作栏和 UP 主空间页的操作区，不是悬浮球；跟着页面明暗主题走。
* 接口要 Wbi 签名，脚本自己取 `img_key` / `sub_key` 算，避免 -403。
* 在 UP 主空间页可以按页批量抓他的投稿，最后合成一个 CSV。
* CSV 带 UTF-8 BOM，Excel / WPS 打开中文不乱码。
* 导出完成后面板里出一份统计：IP 属地 Top 5、LV1–LV6 等级分布、性别构成（男 / 女 / 保密）。
* 界面按 B 站的设计规范来：品牌粉 `#FB7299`、白卡、1px 细边框、12px 圆角、下划线式标签页，明暗主题自动跟随，上次的导出配置也会记住。

---

## 界面

| 视频工具栏入口 | 空间页入口 |
| :---: | :---: |
| ![视频工具栏入口](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E8%A7%86%E9%A2%91%E5%B7%A5%E5%85%B7%E6%A0%8F%E5%85%A5%E5%8F%A3.png) | ![空间页入口](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E7%A9%BA%E9%97%B4%E9%A1%B5%E5%85%A5%E5%8F%A3.png) |

| 控制面板 | 导出进度 | 数据看板 |
| :---: | :---: | :---: |
| ![控制面板](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E6%8E%A7%E5%88%B6%E9%9D%A2%E6%9D%BF.png) | ![导出进度](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E5%AF%BC%E5%87%BA%E8%BF%9B%E5%BA%A6.png) | ![数据看板](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/%E6%95%B0%E6%8D%AE%E7%9C%8B%E6%9D%BF.png) |

---

## 项目结构

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

## 开发与测试

脚本是单文件、零依赖，不用构建。`package.json` 只是为了跑测试：

```bash
npm test          # 等价于 node --test "test/*.test.js"
```

测试不联网。`test/harness.mjs` 把脚本末尾的 `init()` 换成一段内部函数导出，再配一套最小的 `document` / `localStorage` / `fetch` 桩，所以签名算法、错误分类、并发和取消这些都能直接断言。要是改了脚本尾部的结构，装载会失败并报错。

---

## 安装

先装一个用户脚本管理器：[Tampermonkey](https://www.tampermonkey.net/)（推荐）或 [Violentmonkey](https://violentmonkey.github.io/)。

然后二选一：

* [从 Greasy Fork 安装](https://greasyfork.org/zh-CN/scripts/582735)
* [从 GitHub 直接安装](https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/bilibili_comment_exporter.user.js)

---

## 使用

### 视频评论

1. 打开任意视频页（`https://www.bilibili.com/video/BV...`）。
2. 视频下方的操作栏（点赞、投币、收藏、分享旁边）会多出一个「导出评论」，点它展开面板。
3. 面板会填好当前视频的 BVID。
4. 面板里能改这几项：
    * 排序方式：热度优先 / 时间优先
    * 要不要抓楼中楼
    * 最多抓多少条主评论（留空是不限）
    * 请求间隔（默认 500 毫秒，调大能降低触发防爬的风险）
5. 点「开始导出」，进度和日志在面板里实时滚。
6. 抓完自动下载 CSV，接着展示统计看板。

### UP 主批量

1. 打开任意 UP 主的空间首页（`https://space.bilibili.com/...`）。
2. 点昵称旁操作区的「导出评论」，面板会切到「UP主批量」并填好 Mid。
3. 设置抓几页投稿（默认 3 页，每页 30 个视频），以及其它过滤条件。
4. 点「开始批量导出」，脚本一个视频一个视频地抓，最后合成一个 CSV。

> 面板可以拖标题栏挪位置，`Esc` 关闭。排序方式、楼中楼开关、延迟这些会记住，下次打开不用重设。

---

## 导出字段

CSV 字段和命令行版 `blblcd` 一致：

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

## 免责声明

1.  本项目代码仅供个人学习、研究和交流使用，请勿用于商业及非法用途。
2.  在使用本工具时，请遵守哔哩哔哩（Bilibili）相关用户协议及法律法规，因滥用工具导致账号被封禁或由此产生的其他后果由使用者自行承担。
