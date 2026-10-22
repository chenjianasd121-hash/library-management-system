from pathlib import Path
import json, hashlib
ROOT = Path(__file__).resolve().parents[1]
def template(name, content):
    path = ROOT / 'frontend/src/views' / (name + '.vue')
    script = path.read_text(encoding='utf-8').split('<template>')[0]
    path.write_text(script + content.strip() + '\n', encoding='utf-8')

template('HomeView', '''
<template>
  <section class="hero home-hero">
    <h1>让阅读，遇见更好的自己</h1>
    <p>检索馆藏，预约心仪好书，开启你的阅读之旅</p>
    <form class="home-search" @submit.prevent="search">
      <el-input v-model="keyword" placeholder="输入书名、作者或 ISBN 搜索馆藏" clearable><template #prefix><el-icon><Search /></el-icon></template></el-input>
      <el-button type="primary" native-type="submit" :icon="Search">搜索图书</el-button>
    </form>
    <div class="home-shortcuts"><RouterLink to="/books">浏览图书目录 <el-icon><ArrowRight /></el-icon></RouterLink><RouterLink to="/notices">查看系统公告 <el-icon><ArrowRight /></el-icon></RouterLink><RouterLink v-if="auth.user?.role === 'READER'" to="/me/reservations">我的预约 <el-icon><ArrowRight /></el-icon></RouterLink></div>
  </section>
  <div class="home-columns">
    <section class="panel home-books">
      <div class="section-head"><h2><el-icon><Reading /></el-icon>新到馆藏</h2><RouterLink to="/books">查看全部 <el-icon><ArrowRight /></el-icon></RouterLink></div>
      <LoadState :loading="loading" :error="error" :empty="!books.length" @retry="load"><div class="book-grid"><BookCard v-for="book in books" :key="book.id" :book="book" /></div></LoadState>
    </section>
    <div class="home-aside">
      <section class="panel home-notices">
        <div class="section-head"><h2><el-icon><Bell /></el-icon>最新公告</h2><RouterLink to="/notices">更多 <el-icon><ArrowRight /></el-icon></RouterLink></div>
        <LoadState :loading="loading" :error="error" :empty="!notices.length" @retry="load"><RouterLink v-for="notice in notices" :key="notice.id" :to="`/notices/${notice.id}`" class="home-notice"><span><i class="notice-dot" />{{ notice.title }}</span><time>{{ dateTime(notice.publishedAt).slice(0, 10) }}</time></RouterLink></LoadState>
      </section>
      <section class="panel home-services"><div class="section-head"><h2>我的服务</h2></div><div class="service-links"><RouterLink to="/me/loans"><span class="service-icon"><el-icon><Reading /></el-icon></span><strong>我的借阅</strong><small>查看借阅 · 在线续借</small></RouterLink><RouterLink to="/me/reservations"><span class="service-icon green"><el-icon><Calendar /></el-icon></span><strong>我的预约</strong><small>排队进度 · 待取信息</small></RouterLink></div></section>
    </div>
  </div>
</template>
''')

template('BookDetailView', '''
<template>
  <div class="detail-breadcrumb"><RouterLink to="/books">图书目录</RouterLink><span>/</span><span>图书详情</span></div>
  <div class="page-heading"><div><h1>图书详情</h1></div><RouterLink to="/books"><el-button>← 返回目录</el-button></RouterLink></div>
  <LoadState :loading="loading" :error="error" :empty="!book" @retry="load">
    <template v-if="book">
      <section class="panel detail-summary">
        <img v-if="book.coverPath" class="detail-cover" :src="book.coverPath" :alt="`${book.title}封面`" />
        <div v-else class="detail-cover cover-placeholder"><el-icon><Reading /></el-icon><span>暂无封面</span></div>
        <div class="detail-summary-body"><el-tag :type="book.availableCopies ? 'success' : 'warning'">{{ book.availableCopies ? '馆内有可借副本' : '可预约排队' }}</el-tag><h2>{{ book.title }}</h2><p>{{ book.author }}<span>·</span>{{ book.categoryName }}</p><div class="detail-counts"><span>可借 <strong>{{ book.availableCopies }}</strong></span><span>总册 {{ book.totalCopies }}</span><span>待取 {{ book.readyCopies }}</span><span>借出 {{ book.borrowedCopies }}</span></div></div>
      </section>
      <section class="panel book-metadata"><h2>书目信息</h2><dl><div><dt>ISBN</dt><dd>{{ book.isbn || '暂无' }}</dd></div><div><dt>出版社</dt><dd>{{ book.publisher || '暂无' }}</dd></div><div><dt>出版日期</dt><dd>{{ book.publishedOn || '暂无' }}</dd></div><div><dt>关键词</dt><dd>{{ book.keywords || '暂无' }}</dd></div></dl><h3>内容简介</h3><p class="pre-wrap">{{ book.description || '暂无简介' }}</p>
        <el-alert v-if="userError" type="warning" :title="`预约资格暂不可确认：${userError}`" :closable="false" class="form-alert" />
        <div class="detail-actions"><p><el-icon><InfoFilled /></el-icon>{{ restriction || (book.availableCopies ? '预约成功后，请在待取截止日期前到馆取书。' : '暂无可借副本，预约后将按顺序排队。') }}</p><div class="action-row"><RouterLink v-if="auth.user?.role === 'READER'" to="/me/reservations"><el-button>查看我的预约</el-button></RouterLink><el-button type="primary" :loading="busy" :disabled="!!restriction || !!userError || !book.enabled" @click="reserve">{{ book.availableCopies ? '预约待取' : '预约排队' }}</el-button></div></div>
      </section>
    </template>
  </LoadState>
</template>
''')
p = ROOT / 'frontend/src/views/BookDetailView.vue'
s = p.read_text(encoding='utf-8').replace("import LoadState from '@/components/LoadState.vue'", "import LoadState from '@/components/LoadState.vue'\nimport { Reading, InfoFilled } from '@element-plus/icons-vue'")
p.write_text(s, encoding='utf-8')

template('MyReservationsView', '''
<template>
  <PageHeading title="我的预约" description="查看排队进度与待取信息" />
  <section class="panel reader-records reservations-panel">
    <div class="record-toolbar"><el-radio-group v-model="status" @change="() => { page = 1; load() }"><el-radio-button value="READY">待取</el-radio-button><el-radio-button value="WAITING">排队中</el-radio-button><el-radio-button value="HISTORY">历史</el-radio-button></el-radio-group><el-button :icon="Refresh" @click="load">刷新</el-button></div>
    <p v-if="status === 'READY'" class="record-tip"><el-icon><InfoFilled /></el-icon>请到馆由馆员办理借出。</p>
    <p v-else-if="status === 'WAITING'" class="record-tip waiting-tip"><el-icon><InfoFilled /></el-icon>排队中的预约暂未分配副本，轮到您时将显示待取信息。</p>
    <LoadState :loading="loading" :error="error" :empty="!items.length" empty-text="暂无预约记录" @retry="load">
      <el-table :data="items" class="reservation-table" row-key="id">
        <el-table-column label="图书名称" min-width="210"><template #default="{ row }"><RouterLink :to="`/books/${row.bookId}`" class="record-book-title">{{ row.bookTitle }}</RouterLink><el-tag :type="statusTone(row.status)">{{ statusLabel[row.status] }}</el-tag></template></el-table-column>
        <el-table-column label="申请时间" min-width="160"><template #default="{ row }">{{ dateTime(row.requestedAt) }}</template></el-table-column>
        <el-table-column v-if="status === 'WAITING'" label="当前排队位置" min-width="150"><template #default="{ row }"><span class="queue-number">{{ row.queuePosition ?? '待更新' }}</span></template></el-table-column>
        <el-table-column v-if="status === 'READY'" label="待取截止" min-width="170"><template #default="{ row }"><strong>{{ row.pickupDeadline || '—' }}</strong><small class="record-sub">当日结束前</small></template></el-table-column>
        <el-table-column v-if="status === 'READY'" prop="shelfLocation" label="馆藏位置" min-width="140"><template #default="{ row }">{{ row.shelfLocation || '请咨询馆员' }}</template></el-table-column>
        <el-table-column v-if="status === 'READY'" prop="copyBarcode" label="条码" min-width="155" />
        <el-table-column label="操作" min-width="135"><template #default="{ row }"><el-button v-if="row.allowedActions?.canCancel" class="cancel-reservation" :loading="busy === row.id" @click="cancel(row)">取消预约</el-button><span v-else class="muted">{{ reasonLabel(row.allowedActions?.reasonCode) || '—' }}</span></template></el-table-column>
      </el-table>
      <div class="pager"><el-pagination background layout="prev, pager, next" :current-page="page" :page-size="10" :total="total" @current-change="(n: number) => { page = n; load() }" /></div>
    </LoadState>
  </section>
</template>
''')
p = ROOT / 'frontend/src/views/MyReservationsView.vue'
s = p.read_text(encoding='utf-8').replace('dateTime, dueDate, newKey', 'dateTime, newKey').replace("import PageHeading from '@/components/PageHeading.vue'", "import PageHeading from '@/components/PageHeading.vue'\nimport { Refresh, InfoFilled } from '@element-plus/icons-vue'")
p.write_text(s, encoding='utf-8')

manifest_path = ROOT / 'design/asset-manifest.json'
m = json.loads(manifest_path.read_text(encoding='utf-8'))
for name, source, size, method in [
    ('sidebar-art.png', '读者端/pages/home.png', [274,248], 'exact crop (0,690,274,938)'),
    ('hero-reader.png', '读者端/pages/home.png', [1165,333], 'imagegen edit: remove foreground UI and restore obscured original background'),
    ('hero-admin.png', '管理员端/pages/dashboard.png', [1164,210], 'imagegen edit: remove foreground UI and restore obscured original background'),
]:
    if not any(a['output'].replace('\\', '/').endswith(name) for a in m['assets']):
        path = ROOT / 'frontend/public/design' / name
        m['assets'].append(dict(source='design/frontend-handoff/'+source, output='frontend/public/design/'+name, dimensions=size, method=method, status='saved', sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
m.update(phase=2, status='saved', next='extract empty and error state illustrations; implement reader pages')
manifest_path.write_text(json.dumps(m, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
