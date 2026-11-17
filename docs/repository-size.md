# main 文件体积与历史资料

main 的当前 Git 文件树限制为 **100,000,000 字节以下**，不计 `.git/`、未跟踪文件及忽略文件。检查命令：

```powershell
python scripts/check-tracked-size.py main
```

清理前 main 为 `8b847851df5fe604f7bb76c9137e38abb39abfae`，跟踪文件共 308,142,987 字节。完整版本已推送至 GitHub 的 [`backup/main-before-size-reduction-20261117-222209`](https://github.com/GOD-OF-PPT/mota-xiyou/tree/backup/main-before-size-reduction-20261117-222209) 分支。

## 日常运行

直接打开 `index.html`，无需解压、构建或网络。十八层战役、确定性战斗、有限资源、两套画境、四首原始 MP3 和结局图片均保留。PNG 只优化编码及完全透明像素的隐藏 RGB；图像尺寸、alpha 和所有 alpha 非零像素的 RGBA 保持一致。

`.backups/implementation-v23-20261024/` 是 v22 对照页的实际依赖，继续原样跟踪。它使用的旧悟空图集等资源也保留。其他历史快照并入压缩归档，未改写其文件字节。

## 开发回放和验收

历史源码快照、测试 JSON、验收 JSON、测试说明、大型研究回放及网页调查原文保存在 `archives/development-evidence-20261117.tar.xz`。在干净克隆中运行回放或浏览器验收脚本前先执行：

```powershell
python scripts/restore-development-evidence.py
```

恢复程序检查全部路径及本地文件冲突后再写入；相同文件跳过，不同文件报错。恢复内容默认被 Git 忽略，重新运行可安全检查。当前交互指导、报告、提示词及大部分研究 JSON 仍可直接查阅。各历史文档中的录像、截图及生产源图路径可在完整备份分支查阅。

生产原稿、参考图、未使用的中间切片和批量验收截图/录像移出 main 的跟踪范围。本机已有文件保留；从 main 新克隆时不下载这些文件。涉及原始生产图哈希或历史图集的检查，请在完整备份分支的独立工作区执行：

```powershell
git fetch origin backup/main-before-size-reduction-20261117-222209
git worktree add ..\mota-full-backup origin/backup/main-before-size-reduction-20261117-222209
```

这次修改是普通提交，不重写 Git 历史。完整历史及备份分支仍引用原文件，因此 `.git/`、普通完整克隆和 GitHub 后端存储不受 100 MB 限制。只获取当前 main 工作文件可下载 GitHub 的 main ZIP，或使用 `git clone --depth 1 --single-branch --branch main`。
