# Vue 前端工程

完整的启动方式、接口契约说明与联调限制见[仓库根目录 README](../README.md)。

```powershell
npm ci
npm run dev
npm run type-check
npm run build
npm run test:unit -- --run
npm run lint
node tests/chrome-acceptance.mjs
node tests/chrome-states.mjs
```

要求 Node.js `^22.18.0 || >=24.12.0`。开发服务器将 `/api` 代理到 `http://localhost:8080`。正式页面始终请求真实 `/api/v1`，视觉样例只在 `tests/chrome-acceptance.mjs` 中使用。
