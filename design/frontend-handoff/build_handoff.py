"""Collect selected design originals without altering their sources.

Run with the bundled Python runtime. Preview files have no dependency on the
original worktrees; rebuilding intentionally requires the recorded sources.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import struct
from collections import Counter
from datetime import datetime
from html import escape
from pathlib import Path

OUT = Path(__file__).resolve().parent
PROJECT = OUT.parent.parent
WORKTREES = Path(r'C:\Users\en\.codex\worktrees')
PROJECT_NAME = PROJECT.name
ADMIN = WORKTREES / '2f69' / PROJECT_NAME / 'design'
READER = WORKTREES / '6241' / PROJECT_NAME / 'design' / 'reader'
LIBRARIAN = PROJECT / 'design' / 'librarian'
CURRENT = PROJECT / 'design'
NOW = datetime.now().astimezone().isoformat(timespec='seconds')
ROLE_NAMES = {'admin': '管理员', 'librarian': '馆员', 'reader': '读者'}
ROLE_FOLDERS = {role: name + '端' for role, name in ROLE_NAMES.items()}
THREADS = {
    'admin': 'codex://threads/01a11f0d-1cca-75d0-92ce-6b7c296189ac',
    'librarian': 'codex://threads/01a11ef2-6176-7dc0-8ad3-3bc134cf3f21',
    'reader': 'codex://threads/01a11ef4-36af-73d3-90c7-93d4c3d0608d',
}
CONTINUATION = 'codex://threads/01a15ced-f4b8-7f61-b1cb-8e8fb9b11f3e'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def save(path, data):
    target = OUT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def write(path, text):
    target = OUT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text.strip() + '\n', encoding='utf-8')


def source_hashes():
    result = {}
    for folder in ['frontend/src', 'backend/src']:
        for p in sorted((PROJECT / folder).rglob('*')):
            if p.is_file():
                result[p.relative_to(PROJECT).as_posix()] = sha(p)
    return result


def image_info(path):
    data = Path(path).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'Not PNG: {path}'
    w, h = struct.unpack('>II', data[16:24])
    from PIL import Image
    with Image.open(path) as im:
        im.verify()
    return {'width': w, 'height': h, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


baseline = source_hashes()
entries = []


def add(role, slug, title, kind, routes, source, selection, historical_status, note='', expected_hash=None, reuse_of=None):
    source = Path(source)
    info = image_info(source)
    if expected_hash:
        assert info['sha256'] == expected_hash, f'Recorded hash differs: {source}'
    if isinstance(routes, str):
        routes = [routes]
    if reuse_of:
        reused = next(e for e in entries if e['id'] == reuse_of)
        assert info['sha256'] == reused['sha256'], f'Reuse image differs: {source}'
        file = reused['file']
    else:
        file = f'{ROLE_FOLDERS[role]}/{"pages" if kind == "page" else "states"}/{slug}.png'
        target = OUT / file
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists() or sha(target) != info['sha256']:
            shutil.copyfile(source, target)
        assert sha(target) == info['sha256']
    candidate_matches = []
    if source.name == 'final.png':
        for p in sorted(source.parent.glob('*.png')):
            if p != source and sha(p) == info['sha256']:
                candidate_matches.append(str(p))
    e = {
        'id': f'{role}-{slug}', 'role': role, 'role_label': ROLE_NAMES[role],
        'title': title, 'kind': kind, 'routes': routes, 'file': file,
        'source_path': str(source.resolve()), 'source_thread': THREADS[role],
        'selection_basis': selection, 'historical_status': historical_status,
        'handoff_basis': '用户于2026-10-21说明三端设计均已完成，并要求按各对话整理；保留历史逐图状态。',
        'note': note, 'matching_original_candidates': candidate_matches,
        'reuse_of': reuse_of, **info,
    }
    entries.append(e)
    return e


# Administrator: original selected pages plus the explicitly confirmed newest
# dashboard and five continuation dialogs. Never pick an arbitrary candidate.
admin_pages = [
    ('admin-dashboard', '首页工作台', '/staff/dashboard', 1),
    ('book-management', '图书管理', '/staff/books', 2),
    ('book-create', '新增书目', '/staff/books/new', 1),
    ('book-edit', '编辑书目', '/staff/books/:id/edit', 2),
    ('book-copies', '实体副本管理', '/staff/books/:id/copies', 1),
    ('categories', '分类管理', '/staff/categories', 2),
    ('checkout', '办理借出', '/staff/checkout', 3),
    ('return', '办理归还', '/staff/return', 1),
    ('loan-management', '借阅管理', '/staff/loans', 3),
    ('reservations', '预约管理', '/staff/reservations', 1),
    ('admin-users', '账号管理', '/admin/users', 1),
    ('admin-notices', '公告管理', '/staff/notices', 2),
    ('admin-statistics', '数据统计', '/staff/stats', 1),
    ('admin-audit', '审计日志', '/admin/audit', 2),
    ('admin-login', '管理员登录', '/login', 2),
    ('admin-profile', '个人资料', '/me/profile', 3),
    ('admin-change-password', '修改密码', '/change-password', 3),
    ('admin-public-catalogue', '公开图书目录', '/books', 1),
    ('admin-book-detail', '公开书目详情', '/books/:id', 2),
    ('admin-public-notices', '公开公告', '/notices', 1),
    ('admin-notice-detail', '公告详情', '/notices/:id', 3),
    ('admin-forbidden', '无权限', '/403', 2),
    ('admin-not-found', '页面不存在', '/:pathMatch(.*)*', 2),
]
for folder, title, route, number in admin_pages:
    root = CURRENT if folder == 'admin-dashboard' else ADMIN
    note = ''
    expected = None
    if folder == 'admin-dashboard':
        note = '采用最新文字修正版：读者数 1,532；说明为“正常读者账号”。旧工作树首页不作为定稿。'
        expected = 'cc3aa9936af9355e0a1770c717336ed2089400d5a97da63107f985ce4061d93e'
    add('admin', folder.removeprefix('admin-'), title, 'page', route, root / folder / 'final.png',
        f'管理员选图记录第{number}张；final.png；最新修订优先', '已确认定稿', note, expected)

admin_dialogs = [
    (ADMIN, 'admin-category-create', '新增分类弹窗', '/staff/categories', 3),
    (ADMIN, 'admin-category-edit', '编辑分类弹窗', '/staff/categories', 3),
    (ADMIN, 'admin-category-disable-confirm', '分类停用确认', '/staff/categories', 3),
    (CURRENT, 'admin-staff-create', '创建员工弹窗', '/admin/users', 3),
    (CURRENT, 'admin-password-reset', '重置密码弹窗', '/admin/users', 3),
    (CURRENT, 'admin-notice-edit', '编辑公告弹窗', '/staff/notices', 1),
    (CURRENT, 'admin-notice-preview', '公告只读预览', '/staff/notices', 2),
    (CURRENT, 'admin-operation-confirm', '操作确认弹窗', ['/admin/users', '/staff/notices'], 2),
]
for root, folder, title, routes, number in admin_dialogs:
    add('admin', folder.removeprefix('admin-'), title, 'dialog', routes, root / folder / 'final.png',
        f'管理员选图记录第{number}张；final.png；详情见归档记录', '已确认定稿')
for stem, title in [('loading', '加载中'), ('empty', '空结果'), ('error', '请求失败')]:
    add('admin', f'shared-{stem}', title, 'state', ['shared'], CURRENT / 'admin-shared-states' / f'{stem}.png',
        '管理员通用状态收尾确认；每种状态一张', '已确认定稿', '按具体容器复用；静态示例不新增独立路由。')

# Reader: the final selection manifest is the sole enumeration source.
reader_manifest = load(READER / 'SELECTED_IMAGES.json')
reader_titles = {
    'home': '读者首页', 'catalogue': '图书目录', 'book-detail': '图书详情',
    'my-loans': '我的借阅', 'my-reservations': '我的预约：待取', 'profile': '个人资料',
    'change-password': '修改密码', 'notices': '系统公告', 'notice-detail': '公告详情',
    'login': '读者登录', 'register': '读者注册', 'forbidden': '无权限', 'not-found': '页面不存在',
    'states/cancel-reservation': '取消预约确认', 'states/renew-loan': '续借确认',
    'states/loading': '加载中', 'states/empty': '空结果', 'states/load-error': '请求失败',
    'states/form-validation': '表单校验', 'states/reservation-waiting': '我的预约：排队',
    'states/reservation-history': '我的预约：历史',
}
for item in reader_manifest['items']:
    source = READER / item['final_file']
    assert sha(source) == sha(source.parent / item['selected_candidate'])
    add('reader', item['folder'].replace('/', '-'), reader_titles[item['folder']],
        'page' if item['kind'] == 'main_page' else 'dialog' if item['folder'] in ['states/cancel-reservation', 'states/renew-loan'] else 'state',
        item['route'], source,
        f"SELECTED_IMAGES.json：第{item['selected_display_number']}张，{item['selected_candidate']}",
        '已选定（读者最终清单）', expected_hash=item['sha256'])

# Librarian: take only review-items entries, retaining historical review status.
lib_items = load(LIBRARIAN / 'review-items.json')
lib_main = {p['page']: p for p in load(LIBRARIAN / 'main-pages-verification.json')['pages']}
lib_new = {p['file']: p for p in load(LIBRARIAN / 'continuation-2026-10-21.manifest.json')['images']}
lib_routes = {Path(i['file']).parts[0]: i['route'] for i in lib_items[:14]}
for item in lib_items:
    file = item['file']
    source = LIBRARIAN / file
    reference = item['group'] == '正文复用参考'
    kind = 'body_reference' if reference else 'page' if item['group'] in ['已选主页面', '公共页适配'] else 'dialog' if item['group'] == '已选弹窗' else 'state'
    slug = file.removesuffix('.png').replace('/final', '').replace('/', '-')
    routes = item.get('route') or lib_routes.get(file.split('/')[0], 'shared')
    expected = lib_new.get(file, {}).get('sha256')
    if file.count('/') == 1 and file.endswith('/final.png') and file.split('/')[0] in lib_main:
        expected = lib_main[file.split('/')[0]]['sha256']
    reuse = 'reader-' + source.stem.removeprefix('reader-') if reference else None
    note = item.get('note', '')
    if reference:
        note += ' 仅复用正文/结果区；必须套用馆员导航和权限，不照搬读者完整外壳。'
    add('librarian', slug, item['title'], kind, routes, source,
        f"馆员 review-items.json / {item['id']} / {item['group']}", item['status'], note.strip(), expected, reuse)

assert Counter(e['role'] for e in entries) == {'admin': 34, 'reader': 21, 'librarian': 59}
assert len({e['id'] for e in entries}) == 114
assert len({e['file'] for e in entries}) == 110
save('manifest.json', {
    'schema_version': 1, 'generated_at': NOW, 'handoff_date': '2026-10-21',
    'purpose': '三端设计图片整理及前端实现交接；本包不生成应用前端代码。',
    'physical_png_count': 110, 'entry_count': 114, 'body_reference_count': 4,
    'role_folders': ROLE_FOLDERS,
    'counts': {'admin': {'pages': 23, 'dialogs_and_states': 11, 'png': 34},
               'librarian': {'pages': 17, 'dialogs_and_states': 38, 'png': 55, 'body_references': 4},
               'reader': {'pages': 13, 'dialogs_and_states': 8, 'png': 21}},
    'source_threads': THREADS, 'continuation_thread': CONTINUATION,
    'selection_policy': '仅采用各门户定稿和明确的最新修订；不收录未选候选。历史待审阅状态如实保留，按用户本次三端已完成的整体交接指令打包。',
    'entries': entries,
})
write('CHECKPOINT.md', f'''# 整理检查点

更新时间：{NOW}

- 阶段一完成：110张原始PNG已按门户复制；114条清单含4条正文复用引用。
- 来源图片逐张SHA-256一致；读者21张与选图清单及候选原图一致。
- 管理员首页采用最新“读者数 / 正常读者账号”修正版。
- 下一步：保存历史证据、路由映射及离线预览，执行交接包检查。
''')
print('PHASE 1: 110 selected PNG originals and manifest saved.', flush=True)


def archive_records(role, labeled_roots):
    records = []
    seen = set()
    for label, root, recursive in labeled_roots:
        if not root.exists():
            continue
        paths = root.rglob('*') if recursive else root.glob('*')
        for p in sorted(paths):
            if not p.is_file() or p.suffix.lower() not in ['.md', '.json', '.txt'] or p in seen:
                continue
            seen.add(p)
            records.append({'record_id': f'{label}/{p.relative_to(root).as_posix()}',
                            'source_path': str(p.resolve()), 'sha256': sha(p),
                            'content': p.read_text(encoding='utf-8-sig')})
    save(f'provenance/{role}-records.json', {
        'role': role, 'source_thread': THREADS[role], 'archived_at': NOW,
        'notice': '历史原文快照；其中旧的进度、待审阅、下一步不覆盖本包manifest与本次整体交接范围。图片路径为历史来源信息。',
        'records': records,
    })
    return len(records)


admin_roots = [('original-worktree', ADMIN, True)]
for folder in ['admin-dashboard', 'admin-staff-create', 'admin-password-reset', 'admin-notice-edit', 'admin-notice-preview', 'admin-operation-confirm', 'admin-shared-states']:
    admin_roots.append((f'latest-continuation/{folder}', CURRENT / folder, True))
admin_roots.append(('continuation-root', CURRENT, False))
record_counts = {
    'admin': archive_records('admin', admin_roots),
    'librarian': archive_records('librarian', [('current-completed', LIBRARIAN, True)]),
    'reader': archive_records('reader', [('reader-final-worktree', READER, True)]),
}
specs = []
for name in ['前端开发规范.md', '后端开发规范.md', 'API_CONTRACT.md', 'DATABASE_DESIGN.md', 'CONTRACT_GAP.md', 'INTEGRATION_REPORT.md', 'README.md']:
    source = PROJECT / name
    if source.exists():
        target = OUT / 'specifications' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        specs.append({'file': 'specifications/' + name, 'source_path': str(source), 'sha256': sha(source)})
save('provenance/specification-snapshots.json', specs)
write('provenance/README.md', '''# 来源与版本证据

三个 `*-records.json` 保存对应设计目录中的原始说明、提示词、选图、检查点和验证记录文本，并保存原路径及SHA-256。正文是历史快照，因此保留当时的“待审阅”或旧进度。当前采用范围以 `../manifest.json` 为准。

`manifest.json` 每条记录包含原图片路径、来源对话、选图依据、历史状态、原图SHA-256、尺寸、字节数及匹配候选。4条馆员正文引用指向读者同一原图，不再复制，也不代表馆员完整页面。

`specification-snapshots.json` 记录项目规范快照；后续实现应同时核对工作区最新API和规范。原图与原记录均未移动、修改或删除。
''')

# Derive route/view mapping from the actual router rather than inventing paths.
router_path = PROJECT / 'frontend/src/router/index.ts'
router = router_path.read_text(encoding='utf-8')
route_pattern = r"route\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*\(\)\s*=>\s*import\('@/(views/[^']+)'\)"
actual_routes = re.findall(route_pattern, router)
assert len(actual_routes) == 27, f'Unexpected route count: {len(actual_routes)}'
route_rows = []
for route, view in actual_routes:
    role_assets = {}
    for role in ROLE_NAMES:
        matches = [e for e in entries if e['role'] == role and e['kind'] in ['page', 'body_reference'] and route in e['routes']]
        assert len(matches) <= 1, (role, route)
        role_assets[role] = matches[0]['id'] if matches else None
    route_rows.append({'route': route, 'view': f'frontend/src/{view}', 'role_assets': role_assets})
route_set = {r for r, _ in actual_routes}
assert all(route in route_set or route == 'shared' for e in entries for route in e['routes'])
save('routes.json', {'router_source': str(router_path), 'router_sha256': sha(router_path), 'routes': route_rows})
by_id = {e['id']: e for e in entries}


def asset_link(asset_id):
    if not asset_id:
        return '—'
    e = by_id[asset_id]
    suffix = '（仅正文）' if e['kind'] == 'body_reference' else ''
    return f"[{e['title']}{suffix}]({e['file']})"


rows = ['| 路由 | 现有Vue视图 | 管理员 | 馆员 | 读者 |', '|---|---|---|---|---|']
for row in route_rows:
    view = row['view']
    rows.append('| `' + row['route'] + '` | [' + Path(view).name + '](../../' + view + ') | ' + ' | '.join(asset_link(row['role_assets'][r]) for r in ROLE_NAMES) + ' |')
write('ROUTE_MAP.md', '''# 页面与现有前端对应

从当前 `frontend/src/router/index.ts` 提取27条路由。点击角色列直接打开该端采用的原图；“仅正文”必须换成馆员外壳。完整状态和弹窗通过预览或manifest按路由查询，不新增路由。

''' + '\n'.join(rows) + '''

## 入口与权限

- `/` 是读者首页；管理员和馆员根路径沿用现有守卫跳转 `/staff/dashboard`。读者登录后角色首页仍按当前 `roleHome` 跳转 `/me/loans`。
- `/register` 仅读者端；管理员、馆员沿用跳转登录的逻辑。`/me/loans`、`/me/reservations` 只供读者。
- `/admin/users`、`/admin/audit` 仅管理员。馆员菜单不展示这两项。
- 未登录、角色错配、强制首次改密、403及404沿用现有守卫。设计图中的身份与导航不能覆盖真实权限。
- `shared` 表示通用状态示例，不是浏览器地址。相同路径在不同门户使用对应角色图；不能用管理员图替代馆员图。
''')

write('FRONTEND_BRIEF.md', '''# 前端实现交接说明

## 使用顺序

先看 [三端总览](index.html)，按门户和页面确认布局；再按 [路由映射](ROUTE_MAP.md) 找现有Vue文件，并查看关联状态图。`manifest.json` 是本包选图与来源清单。项目已有Vue实现，后续工作应在现有页面上还原设计并接入既有接口。

本次整理未生成或修改应用代码。图片为桌面视觉参考；交互、响应式和真实数据需在实现阶段验证。图中的演示账号、日期、条码、库存、统计和书封不应成为业务逻辑常量。

## 门户与图片优先级

同一路由按 `VITE_PORTAL` 选择管理员、馆员或读者的设计。管理员23个主页面、8个弹窗、3个通用状态；馆员17个完整页面、38个弹窗/状态，另有4个正文参考；读者13个主页面、8个补充状态。

管理员首页必须采用本包 `管理员端/pages/dashboard.png`，显示“读者数”与“正常读者账号”，演示值1,532；不要从原工作树拿旧首页。读者21张严格采用原读者对话的最终清单。馆员以最新 `review-items.json` 枚举为准；历史逐图“待审阅”状态已保存在来源快照，当前按用户三端已完成的整体交接指令收录，未改写为逐图确认。

馆员公开公告、公告详情、403、404只复用读者正文/结果区，替换为馆员导航、身份、返回目标及权限。馆员已有登录、公开目录、书目详情三张独立适配图；登录不出现注册，目录与详情不出现馆员可预约的操作。管理员有自己的公共页定稿。

## 现有结构与公共组件

沿用 Vue 3 + TypeScript + Element Plus + Pinia，以及现有ECharts组件。保留 `frontend/src/portal.ts`、路由守卫、API封装、会话及权限行为。

| 现有文件/组件 | 实现职责 |
|---|---|
| `App.vue` / `AppShell.vue` | 登录注册独立布局；其余页面按门户渲染导航、身份、内容区与激活项 |
| `PageHeading.vue` | 页标题、副说明、面包屑及页面操作区 |
| `BookCard.vue` | 公开目录封面、书目信息、可借状态；行为根据门户权限 |
| `LoadState.vue` | 加载、空结果、请求失败和重试；按实际内容容器调整占位 |
| `TrendChart.vue` / `TopBooksChart.vue` | 首页与统计的真实数据图表 |
| `styles/main.css` | 统一字体、蓝灰配色、间距、卡片、表格、按钮、表单及状态标记 |
| 现有各 `*View.vue` | 页面业务与接口；先抽公共结构，再按三端设计实现差异 |

建议抽取一致的筛选栏、表格分页、状态标签、确认弹窗、只读公告和字段反馈样式；具体组件边界服从现有页面逻辑。以图中蓝灰背景、白色卡片、深蓝导航及蓝色主按钮为视觉基础，后续从图片取色建立统一tokens。不要把整张设计图当作网页背景来代替组件。

## 状态与业务约束

- 预约区分 `WAITING`、`READY` 和历史记录；排队时不伪造已分配副本，历史只读。归还成功恢复的副本状态是 `AVAILABLE`，与预约待取 `READY` 分开。
- 借阅逾期天数、是否能续借/借出/预约、预约排序与分配结果由后端决定；不新增罚金、支付、电子书、多馆或批量导入导出业务。
- 个人资料的用户名、角色只读；字段规则沿用现有DTO和接口。首次登录改密复用改密页，保留强制改密守卫。
- 请求失败展示请求级反馈；只有后端明确返回字段错误时才标红对应字段。当前密码错误不要在所有输入框上制造错误边框。
- 提交中复用原按钮忙碌态、重复提交保护及现有成功/失败反馈；状态图不等于新增成功页。列表加载图按内容容器调整，正文不强制套用书卡骨架。
- 公共公告列表查询须显式提交 `status=PUBLISHED`；此项为实现要求，本次整理未修改 `NoticesView.vue`。
- 未登录的读者公共页使用游客导航，不硬编码“张三”等身份。管理员和馆员菜单保持各自权限。

## 接口与启动约束

先读项目最新 [前端开发规范](specifications/前端开发规范.md) 与 [API契约](specifications/API_CONTRACT.md) 快照，再核对工作区原文件和现有接口代码。ID按字符串处理；时间显示使用Asia/Shanghai；保留 `/api/v1`、门户头、CSRF、幂等和会话行为。视觉图不覆盖接口契约。

三个入口继续使用不同主机，避免会话Cookie混用：读者 `127.0.0.1:5173`、馆员 `127.0.0.2:5174`、管理员 `127.0.0.3:5175`。分别使用已有 `dev:reader`、`dev:librarian`、`dev:admin`。后续构建分别使用 `build:reader`、`build:librarian`、`build:admin`；Node版本遵守package.json的engines。

## 建议实现阶段与验收

1. 公共样式、三端外壳、权限导航和登录；保存可运行检查点。
2. 读者目录/详情、借阅/预约、个人资料/改密和公告；覆盖8种补充状态。
3. 馆员图书/副本/分类、借还/预约、公告、统计与账号资料；覆盖对应弹窗和状态。
4. 管理员账号/审计及其门户视觉差异，完成管理员8个弹窗和3个通用状态。
5. 在1366×768及1920×1080验证三端、长文本、滚动、弹窗、表格、图片失败与空数据；移动端需要后续另行确认设计。运行现有类型检查、三端构建及适当的现有测试，并联调真实权限和借还预约流程。

页面完成应同时具备对应门户的视觉、真实API交互、错误与忙碌态、权限校验以及可运行验证结果。本包的图片哈希校验仅证明整理准确，不代表应用已实现或通过联调。
''')

write('README.md', '''# 三端设计图片交接包

整理日期：2026-10-21。用于下一步前端代码实现；原始图片、历史记录及应用代码均保留。

**入口：[打开三端图片总览](index.html)** · [前端实现说明](FRONTEND_BRIEF.md) · [页面/路由对应](ROUTE_MAP.md) · [逐图来源清单](manifest.json) · [检查结果](audit.json)

| 门户 | 完整页面 | 弹窗/状态 | 独立PNG | 额外复用引用 |
|---|---:|---:|---:|---:|
| 管理员 | 23 | 11 | 34 | 0 |
| 馆员 | 17 | 38 | 55 | 4 |
| 读者 | 13 | 8 | 21 | 0 |
| 合计 | 53 | 57 | **110** | **4** |

114条展示记录包含110张原始PNG和4条馆员正文引用。复用引用指向同一读者原图，不计作馆员完整页面。总览可按门户、页面/弹窗/状态/正文参考、标题和路由筛选。

## 三端图片文件夹

三端图片分别存放在本目录下三个独立文件夹中：

- [管理员端](管理员端/)：34张。
- [馆员端](馆员端/)：55张。
- [读者端](读者端/)：21张。

每个文件夹内，`pages/` 存放完整页面，`states/` 存放弹窗及状态图片。馆员的4条正文复用引用仍指向读者原图，在总览和来源清单中单独标注，不作为馆员整页图重复存放。

## 选图与版本

- 管理员：来自管理员原对话工作树的已选final，叠加续接确认的5个弹窗、3个通用状态及最新首页文字修正版。未选候选不混入本包。
- 馆员：来自馆员续接完成后的59条review-items，实际55张独立设计图，另4条正文复用参考；保留当时逐图状态。本次按用户说明三端已完成的整体指令交接，不伪造历史逐图确认。
- 读者：来自读者原对话最新 `SELECTED_IMAGES.json` 的21张定稿；当前主目录早期读者图不作为选图来源。

每张图在manifest保存门户、源对话、绝对来源路径、选图依据、原图尺寸和SHA-256。复制后逐张校验，未压缩、裁切或改图。`provenance/` 保存说明、提示词及验证记录的文本快照；`specifications/` 保存当前项目规范快照。

## 使用

复制整个本目录即可离线查看 `index.html`，无需服务端或原工作树。图片路径均在本目录内；图片总览不请求网络。保留整个目录结构，勿只复制HTML。

下一步生成代码时，先使用 `FRONTEND_BRIEF.md`，再按 `ROUTE_MAP.md` 对现有Vue视图逐页实现。图片包含静态演示数据，真实字段、权限与业务约束依照现有接口和项目规范。

`build_handoff.py` 是本次整理的可重复脚本；重新执行需要原工作树仍存在。原图、原分支设计目录未移动或删除。
''')

# Offline gallery uses inline metadata: file:// needs no fetch, server or CDN.
gallery_entries = [{k: e[k] for k in ['id', 'role', 'role_label', 'title', 'kind', 'routes', 'file', 'width', 'height', 'note', 'reuse_of']} for e in entries]
write('gallery.css', '''
:root{font-family:"Microsoft YaHei",system-ui,sans-serif;color:#1d304d;background:#f1f5fa;font-synthesis:none}*{box-sizing:border-box}body{margin:0}header{background:#102b4e;color:white;padding:28px max(24px,5vw)}header h1{font-size:26px;margin:0 0 12px}header p{margin:0;line-height:1.8;color:#d7e4f5}header a{color:#e0efff}main{max-width:1680px;margin:auto;padding:24px}.toolbar{position:sticky;top:0;z-index:2;display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding:16px;background:#fff;border:1px solid #d9e2ed;border-radius:12px;box-shadow:0 3px 12px #1735570b}.toolbar label{display:flex;gap:8px;align-items:center;font-size:14px}select,input,button{font:inherit;border:1px solid #b6c7db;border-radius:6px;background:white;color:#173557;padding:8px}input{min-width:240px}button{cursor:pointer}button:hover{background:#eaf2ff}button:focus-visible,a:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #2e76cb;outline-offset:3px}#count{font-size:14px;color:#52647e;margin-left:auto}.notice{font-size:13px;line-height:1.8;color:#5a6c82;margin:16px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:20px}.card{background:white;border:1px solid #dce5ef;border-radius:12px;overflow:hidden}.thumb{display:block;width:100%;padding:0;border:0;border-radius:0;aspect-ratio:1.405;background:#e8eef6;overflow:hidden}.thumb img{width:100%;height:100%;object-fit:contain;display:block}.info{padding:15px}.info h2{font-size:16px;margin:10px 0}.tag{display:inline-block;font-size:12px;background:#eaf1fc;color:#285992;padding:3px 7px;border-radius:4px;margin-right:5px}.tag.ref{background:#fff3d4;color:#765300}.route{font-size:13px;color:#576d87;word-break:break-all;margin:8px 0}.note{font-size:12px;line-height:1.7;color:#6b5e36}.info a{font-size:13px;color:#1a5eac}.empty{text-align:center;padding:60px;color:#586a80}dialog{width:min(96vw,1600px);max-height:96vh;border:1px solid #acbdd3;border-radius:10px;padding:0;background:#f4f7fb}dialog::backdrop{background:#071a32c9}.dialogbar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:white;padding:12px 18px;position:sticky;top:0}.dialogbar strong{margin-right:auto}.dialogbar a{color:#1c5ca2;font-size:14px}#largeImage{display:block;width:100%;height:auto}#dialogNote{padding:0 18px;font-size:13px;color:#735817}footer{padding:30px 0;color:#5c6f87;font-size:13px}a{color:#205b9c}@media(max-width:600px){main{padding:12px}.toolbar{position:static}input{min-width:0;width:100%}.grid{grid-template-columns:1fr}header{padding:22px}#count{margin-left:0}}
''')
gallery_js = '''
const items = __DATA__;
const kinds = {page:'页面', dialog:'弹窗', state:'状态', body_reference:'正文参考'};
const role = document.querySelector('#role');
const kind = document.querySelector('#kind');
const search = document.querySelector('#search');
const grid = document.querySelector('#grid');
const count = document.querySelector('#count');
const dialog = document.querySelector('#viewer');
let opener;
function make(tag, text, className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function view(item, button){
 opener=button;
 document.querySelector('#dialogTitle').textContent=item.role_label+' · '+item.title+'（'+item.width+'×'+item.height+'）';
 const img=document.querySelector('#largeImage');img.src=item.file;img.alt=item.role_label+' '+item.title;
 document.querySelector('#original').href=item.file;
 document.querySelector('#dialogNote').textContent=item.note||'';
 dialog.showModal();
}
function render(){
 const term=search.value.trim().toLowerCase();
 const selected=items.filter(i=>(!role.value||i.role===role.value)&&(!kind.value||i.kind===kind.value)&&(!term||[i.title,i.id,...i.routes].join(' ').toLowerCase().includes(term)));
 grid.replaceChildren();
 count.textContent='显示 '+selected.length+' 条 / 总计114条（110张原图 + 4条正文引用）';
 if(!selected.length){grid.append(make('p','没有匹配项，请调整筛选。','empty'));return;}
 for(const item of selected){
  const card=make('article',null,'card');
  const button=make('button',null,'thumb');button.type='button';button.setAttribute('aria-label','查看'+item.role_label+item.title);
  const img=make('img');img.src=item.file;img.alt=item.role_label+' · '+item.title;img.loading='lazy';img.decoding='async';img.width=item.width;img.height=item.height;
  button.append(img);button.addEventListener('click',()=>view(item,button));card.append(button);
  const info=make('div',null,'info');info.append(make('span',item.role_label,'tag'),make('span',kinds[item.kind],item.reuse_of?'tag ref':'tag'));
  info.append(make('h2',item.title),make('p',item.routes.map(r=>r==='shared'?'通用状态':r).join(' · '),'route'));
  if(item.note)info.append(make('p',item.note,'note'));
  const link=make('a','打开原始PNG');link.href=item.file;link.target='_blank';link.rel='noopener';info.append(link);card.append(info);grid.append(card);
 }
}
role.addEventListener('change',render);kind.addEventListener('change',render);search.addEventListener('input',render);
document.querySelector('#reset').addEventListener('click',()=>{role.value='';kind.value='';search.value='';render();});
document.querySelector('#close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{document.querySelector('#largeImage').removeAttribute('src');opener?.focus();});
render();
'''.replace('__DATA__', json.dumps(gallery_entries, ensure_ascii=False).replace('</', '<\\/'))
write('gallery.js', gallery_js)
write('index.html', '''
<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>图书管理系统 · 三端设计交接</title><link rel="stylesheet" href="gallery.css"><script src="gallery.js" defer></script></head>
<body><header><h1>图书管理系统 · 三端设计交接</h1><p>管理员34张 · 馆员55张 + 4条正文参考 · 读者21张<br>110张原始PNG，按各对话定稿和最新修订整理，2026-10-21。<br><a href="FRONTEND_BRIEF.md">前端实现说明</a> · <a href="ROUTE_MAP.md">路由对应</a> · <a href="manifest.json">逐图来源</a> · <a href="audit.json">检查结果</a><br>图片文件夹：<a href="管理员端/">管理员端</a> · <a href="馆员端/">馆员端</a> · <a href="读者端/">读者端</a></p></header>
<main><div class="toolbar"><label>门户<select id="role"><option value="">全部三端</option><option value="admin">管理员</option><option value="librarian">馆员</option><option value="reader">读者</option></select></label><label>类型<select id="kind"><option value="">全部类型</option><option value="page">完整页面</option><option value="dialog">弹窗</option><option value="state">状态</option><option value="body_reference">正文复用参考</option></select></label><label>搜索<input id="search" type="search" placeholder="页面标题、路由或标识"></label><button id="reset" type="button">重置</button><span id="count" role="status" aria-live="polite"></span></div>
<p class="notice">点击图片放大，Esc关闭。正文参考只复用内容区，需使用馆员导航与权限。管理员首页采用最新文字修正版；读者图来自读者最终21张清单。图片中的静态数据仅作视觉示例。历史逐图审阅状态保存在来源清单，当前按用户三端已完成的整体指令交接。</p><noscript>请启用浏览器JavaScript以使用筛选；也可直接打开管理员端、馆员端、读者端文件夹或manifest.json。</noscript><section id="grid" class="grid" aria-label="设计图片"></section><footer>完整页面53张 · 弹窗和状态57张 · 正文引用4条。原设计目录及应用代码未移动、修改或删除。</footer></main>
<dialog id="viewer" aria-labelledby="dialogTitle"><div class="dialogbar"><strong id="dialogTitle"></strong><a id="original" target="_blank" rel="noopener">打开原始PNG</a><button id="close" type="button" autofocus>关闭（Esc）</button></div><p id="dialogNote"></p><img id="largeImage" alt=""></dialog></body></html>
''')
print('PHASE 2: provenance, route map, frontend brief and offline gallery saved.', flush=True)

# Final checks cover all copied images, source hashes, references and role routes.
unique_files = {e['file']: e for e in entries}
for file, e in unique_files.items():
    info = image_info(OUT / file)
    assert all(info[k] == e[k] for k in info)
assert sum(len(list((OUT / folder).rglob('*.png'))) for folder in ROLE_FOLDERS.values()) == 110
assert source_hashes() == baseline, 'Application source changed during collection'
assert sum(e['kind'] == 'page' for e in entries) == 53
assert sum(e['kind'] in ['state', 'dialog'] for e in entries) == 57
assert sum(e['kind'] == 'body_reference' for e in entries) == 4
for role, expected in [('admin', 23), ('librarian', 21), ('reader', 13)]:
    actual = sum(bool(r['role_assets'][role]) for r in route_rows)
    assert actual == expected, (role, actual)
for file in ['index.html', 'gallery.js', 'gallery.css', 'FRONTEND_BRIEF.md', 'ROUTE_MAP.md', 'manifest.json']:
    assert (OUT / file).is_file()
audit = {
    'checked_at': NOW, 'status': 'passed', 'physical_png_count': 110, 'manifest_entries': 114,
    'checks': {
        'all_copied_png_sha256_equal_source': True, 'all_110_png_decode': True,
        'reader_21_match_manifest_and_selected_candidates': True,
        'librarian_14_main_match_recorded_hashes': True,
        'librarian_20_continuation_match_recorded_hashes': True,
        'librarian_4_body_references_match_reader_originals': True,
        'administrator_latest_corrected_dashboard_hash': True,
        'all_27_existing_routes_mapped_with_role_restrictions': True,
        'gallery_image_files_all_inside_package': True,
        'frontend_backend_source_unchanged_during_collection': True,
    },
    'historical_record_counts': record_counts,
    'application_source_file_count': len(baseline),
    'browser_validation': 'pending; file, metadata and image checks complete',
    'limits': ['未生成应用前端代码；未执行应用构建或业务联调。', '历史逐图确认状态未改写；以本次用户三端完成的整体交接指令整理。'],
}
save('audit.json', audit)
save('provenance/application-source-hashes.json', {'checked_at': NOW, 'files': baseline})
write('CHECKPOINT.md', f'''# 整理检查点

更新时间：{NOW}

- 阶段一完成：110张原始PNG、114条记录，含4条不重复复制的馆员正文引用。
- 阶段二完成：保存三端历史说明/提示词/选图证据、规范快照、27条路由映射、实现说明与离线总览。
- 阶段三文件检查通过：逐张原图哈希和PNG解码，读者21张最终清单、馆员14主页面及20张续接图、管理员最新首页均一致。
- 原设计来源和应用代码未修改；详见audit.json。浏览器交互验证单独补记。
''')
print('PHASE 3: file audit passed; application sources unchanged.', flush=True)
