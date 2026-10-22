# Git 保存与回退指南

本项目于 2026-10-08 建立本地 Git 仓库，主分支为 `main`。初始快照的标签为 `project-baseline`，表示开始使用 Git 时的代码状态；它不代表所有业务功能已经通过验收。

以下命令均在项目根目录的 PowerShell 中执行。先运行 `git status`，确认当前分支和改动。Git 只记录已提交的版本；修改文件后需要主动提交，才会增加恢复点。

## 1. 每完成一项修改，保存一个版本

```powershell
git status
git diff
git add -A
git diff --cached --stat
git commit -m "描述本次修改，例如：修复图书查询"
```

`git add -A` 包含新增、修改和删除的文件；忽略规则中的文件不会加入提交。提交前检查改动，确认没有把密码或临时文件加入。没有改动时无需提交。

## 2. 查看可恢复的版本

```powershell
git log --oneline --decorate -15
git show --stat project-baseline
```

日志最左侧的短编号就是提交编号。可用 `git show 提交编号` 查看该版本的具体改动。完成一个确认可用的阶段后，也可以执行 `git tag stable-v1`，为它命名；以后使用不同的标签名保存其他稳定版本。

## 3. 撤回已经提交的一次错误修改

```powershell
git status
git stash push -u -m "撤回错误提交前的临时备份"
git revert --no-edit 提交编号
```

将 `提交编号` 换成日志中那次错误修改的编号。`git revert` 会新增一个撤销提交，原有历史仍然保留。撤回最近的一次普通提交时可使用 `git revert --no-edit HEAD`。

如果出现冲突，可先执行 `git revert --abort` 退出这次撤回，再检查改动或请协作者处理。不要在不确定时使用强制重置。

## 4. 恢复一个文件到上次提交的状态

先备份该文件尚未提交的修改，再恢复它：

```powershell
git stash push -u -m "恢复图书页面前的临时备份" -- frontend/src/views/BooksView.vue
git restore --source=HEAD --staged --worktree -- frontend/src/views/BooksView.vue
```

这里的路径是示例，请将两条命令中的路径都换成实际文件路径。`stash` 会保存指定文件的改动，并把它恢复到当前提交的状态；其他文件的改动继续留在工作区。

若要从更早的版本恢复该文件，把 `HEAD` 换成提交编号或 `project-baseline`，检查后再提交这次恢复。

## 5. 把整个代码恢复到初始快照

```powershell
git status
git stash push -u -m "恢复初始快照前的临时备份"
git restore --source=project-baseline --staged --worktree -- .
git diff --cached --stat
git commit -m "恢复到初始快照 project-baseline"
```

这会将当前分支的代码恢复到初始快照，并以新提交记录这次恢复，之前的提交仍可查看。若代码已经与初始快照一致，最后一步会提示没有内容需要提交。也可以把 `project-baseline` 换成另一个提交编号或稳定标签。

暂时查看旧版本并在其基础上继续修改时，可先保存未提交的工作，再创建恢复分支：

```powershell
git stash push -u -m "切换旧版本前的临时备份"
git switch -c recovery-baseline project-baseline
```

`recovery-baseline` 是新分支名，重复操作时需要使用其他名称。执行 `git switch main` 可回到主分支；切换前先提交或暂存恢复分支上的新修改。

## 找回临时备份

```powershell
git stash list
git stash show --stat --include-untracked 'stash@{0}'
git stash apply 'stash@{0}'
```

PowerShell 中要给 `stash@{0}` 加单引号。根据列表选取需要的编号；只有确实生成了备份时才运行 `apply`。没有改动时 `stash push` 不会创建新备份。`apply` 会保留备份记录；在不同版本上应用可能产生冲突，恢复错误修改前的备份也可能把错误重新带回来。

## 管理范围

- 记录前后端源代码、依赖锁文件、数据库迁移 SQL、启动脚本、测试脚本、必要的图片素材和项目说明。
- 忽略本机密码文件 `backend/.env`、依赖目录、编译产物、运行日志、生成的截图报告及 `output/`。三个前端 `.env` 入口文件仅包含公开的入口名称，已纳入版本管理。
- MySQL 数据库内容、Docker 数据卷和 `backend/data/` 中上传的封面不会随 Git 回退。涉及数据修改或数据库迁移时，需要另行备份数据库及封面。
- 远程公开仓库为 [chenjianasd121-hash/library-management-system](https://github.com/chenjianasd121-hash/library-management-system)，本地远程名称为 `origin`，主分支为 `main`。完成本地提交后执行 `git push` 上传；初始恢复标签 `project-baseline` 也保存在远程。备份项目目录时应包含隐藏的 `.git`，迁移机器时还要单独带上需要的本机配置和运行数据。
- 未配置提交身份时，本仓库使用本地身份 `en <en@localhost>`。可用 `git config --local user.name "你的名字"` 和 `git config --local user.email "你的邮箱"` 更新，仅影响本项目。
