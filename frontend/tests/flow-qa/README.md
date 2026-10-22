# 本机流程与并发测试

仅对独立 QA 环境写入。`common.mjs` 固定后端 `18081`、MySQL 容器 `library-flow-qa-mysql-1`，不读取原库密码。Node 需满足项目版本要求，安装本机 Google Chrome、Docker Desktop、前端现有依赖。

从项目根目录首次建立环境：

```powershell
./backend/scripts/start-flow-qa.ps1
```

脚本生成忽略提交的 `output/flow-stress-qa/run-*/`，包括随机密码、Compose 配置、源码哈希与检查点。端口被占用或运行目录已存在时会停止；中断后先读取 `current-run.txt` 和对应 `checkpoint.json`，继续当前环境，不能重新初始化原数据库。

分别在三个终端启动前端（工作目录 `frontend`）：

```powershell
$env:API_PROXY_TARGET = 'http://127.0.0.1:18081'
npx vite --mode reader --host 127.0.0.1 --port 5273 --strictPort
```

另外两端改为 `--mode librarian --host 127.0.0.2 --port 5274`、`--mode admin --host 127.0.0.3 --port 5275`，并保留 `--strictPort`。此环境变量仅影响当前进程；默认代理仍连接 `8080`。

执行：

```powershell
npm run test:flow:browser
npm run test:flow:api
npm run test:flow:concurrency
npm run test:flow:stress
```

浏览器脚本默认启动后台 Chrome，使用独立上下文，不连接日常浏览器用户目录。可通过 `CHROME_PATH` 指定 Chrome 文件。`QA_ROUNDS` 可用于调试缩短并发轮数，验收必须使用默认 20 轮。压力测试固定 5/10/20 并发各 60 秒，应单独运行，避免构建或其他测试干扰指标。

结果写入当前运行目录：每套件 JSON、并发逐轮 JSONL、请求延迟、Docker 资源、截图和失败上下文。`before-*` 文件是缺陷证据，最新无后缀文件是回归结果。再次施压前先归档上次 `stress*` 文件；脚本会重新开始请求日志，避免混入上次指标。不要提交 `.env`、私有凭据、会话、请求跟踪或输出目录。

`lifecycle-extra.mjs` 仅在 QA 数据库将一条待取预约日期调到过去，然后用真实接口触发过期分配；这不是等待午夜调度器执行。限流测试会等待下一分钟窗口，保留真实登录和注册限额。

后端测试从 `backend` 执行 `./mvnw.cmd test`，Docker 可用时应看到 MySQL 工作流测试真正执行；检查最终 `Skipped: 0`，不能把 Docker 不可用造成的跳过当作成功。`design/verify-real-api.ps1` 另有 35 项初始基线，它依赖新演示库的逾期借阅夹具，重复运行前应另建隔离环境。

功能测试结果见根目录 `TEST_REPORT.md`。这些脚本不证明参考设计图的像素和色彩完全一致。
