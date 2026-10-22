from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'frontend' / 'src'

def replace_view(name, template, imports='', keep_dialog=False, transform=None):
    path = root / 'views' / (name + 'View.vue')
    source = path.read_text(encoding='utf-8')
    script = source.split('</script>')[0]
    if imports:
        script = script.replace('<script setup lang="ts">', '<script setup lang="ts">\n' + imports)
    if transform:
        script = transform(script)
    dialog = ''
    if keep_dialog:
        dialog = source[source.index('  <el-dialog'):source.rindex('</template>')]
    path.write_text(script + '</script>\n<template>\n' + template + '\n' + dialog + '</template>\n', encoding='utf-8')

pager = '''<div class="staff-list-footer"><span>共 {{ total }} 条记录</span><el-pagination background layout="prev, pager, next" :current-page="page" :page-size="10" :total="total" @current-change="(n: number) => { page = n; load() }" /></div>'''

replace_view('StaffLoans', '''
  <PageHeading title="借阅管理" description="查看借阅记录，及时跟进逾期图书。"><RouterLink to="/staff/return"><el-button type="primary">办理归还</el-button></RouterLink></PageHeading>
  <section class="panel staff-record-panel">
    <el-tabs v-model="filter.mode" class="record-tabs" @tab-change="page = 1; load()"><el-tab-pane label="全部记录" name="ALL" /><el-tab-pane label="在借" name="ACTIVE" /><el-tab-pane label="已归还" name="RETURNED" /><el-tab-pane label="逾期" name="OVERDUE" /></el-tabs>
    <form class="record-query" @submit.prevent="page = 1; load()"><label>读者<el-input v-model="filter.readerKeyword" placeholder="输入读者用户名或姓名" clearable /></label><label>副本条码<el-input v-model="filter.barcode" placeholder="输入完整副本条码" clearable /></label><el-button type="primary" native-type="submit">查询</el-button></form>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"><div class="table-scroll"><el-table :data="items" class="management-table">
      <el-table-column label="图书 / 副本条码" min-width="235"><template #default="s"><strong>{{ s.row.bookTitle }}</strong><small>{{ s.row.copyBarcode }}</small></template></el-table-column>
      <el-table-column label="读者" min-width="130"><template #default="s">{{ s.row.readerName || '—' }}</template></el-table-column>
      <el-table-column label="借出时间" min-width="170"><template #default="s"><span class="wrapped-time">{{ dateTime(s.row.borrowedAt) }}</span></template></el-table-column>
      <el-table-column label="应还日期" min-width="150"><template #default="s">{{ s.row.dueDate }}<small>当日结束前归还</small></template></el-table-column>
      <el-table-column label="状态" min-width="150"><template #default="s"><el-tag :type="s.row.overdueDays > 0 ? 'danger' : statusTone(s.row.status)">{{ s.row.overdueDays > 0 ? `逾期 ${s.row.overdueDays} 天` : statusLabel[s.row.status as keyof typeof statusLabel] }}</el-tag><small v-if="s.row.returnedAt">{{ dateTime(s.row.returnedAt) }}</small></template></el-table-column>
      <el-table-column label="操作" width="105"><template #default="s"><RouterLink v-if="s.row.status === 'ACTIVE'" to="/staff/return"><el-button link type="primary">办理归还</el-button></RouterLink><span v-else class="muted">—</span></template></el-table-column>
    </el-table></div>''' + pager + '''</LoadState>
  </section>''', transform=lambda s: s.replace('dateTime, dueDate,', 'dateTime,'))

replace_view('StaffReservations', '''
  <PageHeading title="预约管理" description="查看排队与待取预约，处理读者预约记录。" />
  <section class="panel staff-record-panel">
    <el-tabs v-model="filter.status" class="record-tabs" @tab-change="page = 1; load()"><el-tab-pane label="全部" name="" /><el-tab-pane label="待取" name="READY" /><el-tab-pane label="排队中" name="WAITING" /><el-tab-pane label="已履约" name="FULFILLED" /><el-tab-pane label="已取消" name="CANCELLED" /><el-tab-pane label="已过期" name="EXPIRED" /></el-tabs>
    <form class="record-query" @submit.prevent="page = 1; load()"><label>读者<el-input v-model="filter.readerKeyword" placeholder="输入读者用户名或姓名" clearable /></label><label>书目 ID<el-input v-model="filter.bookId" placeholder="输入书目 ID" clearable /></label><el-button type="primary" native-type="submit">查询</el-button></form>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"><div class="table-scroll"><el-table :data="items" class="management-table reservation-management-table">
      <el-table-column label="图书 / 读者" min-width="260"><template #default="s"><strong>{{ s.row.bookTitle }}</strong><small>{{ s.row.readerName || '—' }}</small></template></el-table-column>
      <el-table-column label="状态" width="150"><template #default="s"><el-tag :type="statusTone(s.row.status)">{{ statusLabel[s.row.status as keyof typeof statusLabel] }}</el-tag></template></el-table-column>
      <el-table-column label="排队 / 待取信息" min-width="270"><template #default="s"><template v-if="s.row.status === 'WAITING'">排队第 <b class="text-primary">{{ s.row.queuePosition ?? '—' }}</b> 位</template><template v-else-if="s.row.status === 'READY'"><span>截止 {{ s.row.pickupDeadline || '—' }}</span><small>当日结束前到馆取书</small><small v-if="s.row.copyBarcode">{{ s.row.copyBarcode }} · {{ s.row.shelfLocation || '待分配位置' }}</small></template><span v-else class="muted">—</span></template></el-table-column>
      <el-table-column label="申请时间" min-width="190"><template #default="s"><span class="wrapped-time">{{ dateTime(s.row.requestedAt) }}</span></template></el-table-column>
      <el-table-column label="操作" width="100"><template #default="s"><el-button v-if="s.row.allowedActions?.canCancel" link type="danger" :loading="busy === s.row.id" @click="cancel(s.row)">取消预约</el-button><span v-else class="muted">—</span></template></el-table-column>
    </el-table></div>''' + pager + '''</LoadState>
  </section><p class="staff-page-footnote">取消预约需要填写业务原因；待取副本将按规则分配给下一位读者。</p>''', transform=lambda s: s.replace('dateTime, dueDate,', 'dateTime,'))

replace_view('Categories', '''
  <div class="staff-breadcrumb">图书管理 / <span>分类管理</span></div>
  <PageHeading title="分类管理" description="维护图书分类，让馆藏井然有序。"><el-button type="primary" @click="open()">＋ 新增分类</el-button></PageHeading>
  <p class="category-summary">共 <b>{{ items.length }}</b> 个分类，<span class="text-success">启用 {{ items.filter(c => c.enabled).length }}</span>，<span class="muted">停用 {{ items.filter(c => !c.enabled).length }}</span></p>
  <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load">
    <section v-for="group in groups" :key="group.label" class="panel category-group">
      <div class="category-group-heading"><h2><i :class="{ disabled: !group.enabled }" />{{ group.label }}分类 <small>{{ group.items.length }} 个</small></h2><span>{{ group.enabled ? '可用于图书编目与读者检索' : '已停用分类不再出现在读者分类筛选中' }}</span></div>
      <el-table :data="group.items" class="category-table"><el-table-column label="分类名称" min-width="280"><template #default="s"><span class="category-name"><el-icon><Collection /></el-icon>{{ s.row.name }}</span></template></el-table-column><el-table-column prop="code" label="分类编码" min-width="190" /><el-table-column prop="sortOrder" label="排序" min-width="130" /><el-table-column label="状态" min-width="160"><template #default="s"><el-tag :type="s.row.enabled ? 'success' : 'info'">{{ s.row.enabled ? '已启用' : '已停用' }}</el-tag></template></el-table-column><el-table-column label="操作" width="110"><template #default="s"><el-button link type="primary" @click="open(s.row)">编辑</el-button></template></el-table-column></el-table>
      <p v-if="!group.items.length" class="category-empty">暂无{{ group.label }}分类</p>
    </section>
  </LoadState><p class="staff-page-footnote">分类按排序值从小到大显示；停用分类不会删除已有书目的分类信息。</p>''', "import { Collection } from '@element-plus/icons-vue'", True, lambda s: s.replace('{ onMounted, reactive, ref }', '{ computed, onMounted, reactive, ref }').replace('const rules:', "const groups = computed(() => [true, false].map(enabled => ({ enabled, label: enabled ? '启用' : '停用', items: items.value.filter(c => c.enabled === enabled).sort((a, b) => a.sortOrder - b.sortOrder) })))\nconst rules:"))

replace_view('Users', '''
  <PageHeading title="账号管理" description="管理系统账号，维护员工与读者的访问权限。"><el-button type="primary" @click="open">＋ 创建员工</el-button></PageHeading>
  <form class="panel staff-filter users-filter" @submit.prevent="page = 1; load()"><el-input v-model="filter.keyword" placeholder="搜索用户名 / 显示名" :prefix-icon="Search" clearable /><el-select v-model="filter.role"><el-option label="全部角色" value="" /><el-option label="管理员" value="ADMIN" /><el-option label="馆员" value="LIBRARIAN" /><el-option label="读者" value="READER" /></el-select><el-select v-model="filter.status"><el-option label="全部状态" value="" /><el-option label="正常" value="ACTIVE" /><el-option label="禁用" value="DISABLED" /></el-select><el-button type="primary" native-type="submit" :icon="Search">筛选</el-button></form>
  <section class="panel users-panel"><div class="management-section-heading"><h2>账号列表</h2><span>共 {{ total }} 个账号</span></div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"><div class="table-scroll"><el-table :data="items" class="management-table users-table">
      <el-table-column prop="username" label="用户名" min-width="205" /><el-table-column label="显示名" min-width="215"><template #default="s">{{ s.row.displayName }} <el-tag v-if="s.row.id === auth.user?.id" class="current-account-tag" size="small">当前账号</el-tag></template></el-table-column>
      <el-table-column label="角色" min-width="140"><template #default="s"><el-icon><User /></el-icon> {{ { ADMIN: '管理员', LIBRARIAN: '馆员', READER: '读者' }[s.row.role as 'ADMIN' | 'LIBRARIAN' | 'READER'] }}</template></el-table-column>
      <el-table-column label="状态" min-width="110"><template #default="s"><el-tag :type="s.row.status === 'ACTIVE' ? 'success' : 'info'">{{ s.row.status === 'ACTIVE' ? '正常' : '已禁用' }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="295"><template #default="s"><el-button plain :type="s.row.status === 'ACTIVE' ? 'danger' : 'success'" :disabled="s.row.id === auth.user?.id || (s.row.role === 'ADMIN' && s.row.status === 'ACTIVE' && activeAdminCount <= 1)" :loading="rowBusy === s.row.id" @click="toggle(s.row)">{{ s.row.status === 'ACTIVE' ? '禁用账号' : '启用账号' }}</el-button><el-button plain type="primary" :loading="rowBusy === s.row.id" @click="reset(s.row)">重置密码</el-button><small v-if="s.row.id === auth.user?.id" class="account-lock-hint"><el-icon><Lock /></el-icon>当前登录账号不能禁用</small></template></el-table-column>
    </el-table></div>''' + pager + '''</LoadState>
  </section>''', "import { Search, User, Lock } from '@element-plus/icons-vue'", True)

replace_view('Audit', '''
  <PageHeading title="审计日志" description="查看关键业务操作记录，追踪系统变更。" />
  <div class="audit-layout"><form class="panel audit-filter" @submit.prevent="page = 1; load()"><h2><el-icon><Filter /></el-icon>筛选条件</h2><label>操作者 ID<el-input v-model="filter.actorId" placeholder="输入操作者 ID" clearable /></label><label>操作动作<el-input v-model="filter.action" placeholder="输入动作编码" clearable /></label><label>开始时间<el-date-picker v-model="filter.from" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss+08:00" placeholder="选择开始时间" /></label><label>结束时间<el-date-picker v-model="filter.to" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss+08:00" placeholder="选择结束时间" /></label><el-button type="primary" native-type="submit" :icon="Search">筛选日志</el-button></form>
    <section class="panel audit-results"><div class="management-section-heading"><h2>操作记录</h2><span>共 {{ total }} 条</span></div><LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"><div class="table-scroll"><el-table :data="items" class="management-table audit-table"><el-table-column label="时间" width="130"><template #default="s"><span class="wrapped-time">{{ dateTime(s.row.occurredAt) }}</span></template></el-table-column><el-table-column prop="actorName" label="操作者" min-width="105" show-overflow-tooltip /><el-table-column prop="action" label="动作" min-width="170" show-overflow-tooltip /><el-table-column prop="entityType" label="对象类型" min-width="105" /><el-table-column prop="entityId" label="对象 ID" min-width="115" show-overflow-tooltip /><el-table-column label="追踪号" min-width="145"><template #default="s"><el-tooltip :content="s.row.traceId" placement="top"><span class="trace-id">{{ s.row.traceId ? s.row.traceId.slice(0, 13) + (s.row.traceId.length > 13 ? '…' : '') : '—' }}</span></el-tooltip></template></el-table-column></el-table></div>''' + pager + '''</LoadState></section>
  </div>''', "import { Filter, Search } from '@element-plus/icons-vue'")

replace_view('StaffNotices', '''
  <div class="staff-breadcrumb">系统设置 / <span>公告管理</span></div>
  <PageHeading title="公告管理" description="发布馆内通知，让重要信息及时传达。"><el-button type="primary" @click="open()">＋ 新建公告</el-button></PageHeading>
  <section class="panel staff-notice-panel"><div class="notice-management-tools"><el-tabs v-model="status" class="record-tabs" @tab-change="page = 1; load()"><el-tab-pane label="草稿" name="DRAFT" /><el-tab-pane label="已发布" name="PUBLISHED" /><el-tab-pane label="已撤下" name="WITHDRAWN" /></el-tabs><el-button :icon="Refresh" @click="load">刷新</el-button><span>共 {{ total }} 条</span></div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"><article v-for="notice in items" :key="notice.id" class="managed-notice"><el-icon class="managed-notice-icon"><Document /></el-icon><div class="managed-notice-text"><h2>{{ notice.title }} <el-tag :type="statusTone(notice.status)">{{ statusLabel[notice.status] }}</el-tag></h2><p>{{ notice.content }}</p></div><time>{{ dateTime(notice.publishedAt || notice.updatedAt) }}</time><div class="managed-notice-actions"><el-button v-if="notice.status !== 'PUBLISHED'" link type="primary" @click="open(notice)">编辑</el-button><el-button link type="primary" @click="form.title = notice.title; form.content = notice.content; preview = true">预览</el-button><el-button v-if="notice.status !== 'PUBLISHED'" link type="success" :loading="busy" @click="action(notice, 'publish')">发布</el-button><el-button v-else link type="danger" :loading="busy" @click="action(notice, 'withdraw')">撤下</el-button></div></article>''' + pager + '''</LoadState>
  </section><p class="staff-page-footnote">公告发布后对所有访客可见；撤下后将不再出现在公开公告列表。</p>''', "import { Document, Refresh } from '@element-plus/icons-vue'", True)

replace_view('Stats', '''
  <div class="staff-breadcrumb">首页概览 / <span>数据统计</span></div>
  <PageHeading title="数据统计" description="馆藏与借阅数据一目了然，助力高效管理。"><el-button :icon="Refresh" @click="load">刷新数据</el-button></PageHeading>
  <LoadState :loading="loading" :error="error" :empty="!overview" @retry="load"><template v-if="overview">
    <section class="panel statistics-metrics"><div v-for="metric in [ { label: '书目总数', value: overview.bookCount, icon: Reading, tone: 'blue', hint: '馆藏书目种类' }, { label: '馆藏总册', value: overview.totalCopies, icon: Collection, tone: 'purple', hint: '实体图书副本' }, { label: '可借册数', value: overview.availableCopies, icon: CircleCheck, tone: 'green', hint: '当前可借阅副本' }, { label: '当前在借', value: overview.activeLoans, icon: Tickets, tone: 'blue', hint: '尚未归还的借阅' }, { label: '逾期借阅', value: overview.overdueLoans, icon: Warning, tone: 'orange', hint: '需及时跟进归还' }, { label: '待取预约', value: overview.readyReservations, icon: Clock, tone: 'cyan', hint: '等待到馆取书' }, { label: '注册读者', value: overview.readerCount, icon: User, tone: 'blue', hint: '读者账号总数' } ]" :key="metric.label" class="statistics-metric"><el-icon :class="'metric-' + metric.tone"><component :is="metric.icon" /></el-icon><div><span>{{ metric.label }}</span><strong>{{ metric.value ?? '—' }}</strong></div><small>{{ metric.hint }}</small></div></section>
    <p class="statistics-generated"><el-icon><Clock /></el-icon>数据生成时间：{{ dateTime(overview.generatedAt) }}（上海时间）</p>
    <section class="panel statistics-trend"><h2>近 30 天借出与归还趋势</h2><p>{{ trend.length ? trend[0]?.date + ' 至 ' + trend[trend.length - 1]?.date : '暂无日期记录' }} · 单位：次</p><TrendChart v-if="trend.length" :data="trend" /><el-empty v-else description="暂无趋势数据" /><small>数据按日汇总，统计近 30 天的借出与归还次数。</small></section>
    <section class="panel statistics-ranking"><h2>近 30 天热门书目</h2><p>按借出次数排序 · 单位：次</p><div v-if="top.length" class="rank-chart-grid"><RankedBooksChart :data="top.slice(0, 5)" :offset="0" /><RankedBooksChart v-if="top.length > 5" :data="top.slice(5, 10)" :offset="5" /></div><el-empty v-else description="暂无热门书目" /></section>
  </template></LoadState>''', "import { Refresh, Reading, Collection, CircleCheck, Tickets, Warning, Clock, User } from '@element-plus/icons-vue'\nimport RankedBooksChart from '@/components/RankedBooksChart.vue'", transform=lambda s: s.replace("import TopBooksChart from '@/components/TopBooksChart.vue'\n", ''))

print('Updated 7 management views; preserved API handlers and dialogs.')
