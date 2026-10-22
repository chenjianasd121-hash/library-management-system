from pathlib import Path

root = Path(__file__).resolve().parents[1]
views = root / 'frontend/src/views'

def replace_template(name, template):
    p = views / name
    s = p.read_text(encoding='utf-8')
    s = s[:s.index('<template>')] + template.strip() + '\n'
    p.write_text(s, encoding='utf-8')

p = views / 'DashboardView.vue'
s = p.read_text(encoding='utf-8')
s = s.replace("import { Reading, Refresh, UserFilled, WarningFilled }", "import { portal } from '@/portal'\nimport PageHeading from '@/components/PageHeading.vue'\nimport { Reading, Refresh, UserFilled, WarningFilled, TrendCharts, PieChart, Clock, Bell, Right, Back, Plus, Medal, CircleCheck, Grid }")
s = s.replace("api.notices({ page: 1, size: 5 })", "api.notices({ page: 1, size: 5, status: 'PUBLISHED' })")
s = s.replace('<section class="hero">', '''<PageHeading v-if="portal === 'librarian'" title="馆员工作台" description="管理馆藏与借还业务，掌握今日工作动态。">
    <RouterLink to="/staff/checkout"><el-button type="primary" :icon="Right">办理借出</el-button></RouterLink>
    <RouterLink to="/staff/return"><el-button :icon="Back">办理归还</el-button></RouterLink>
    <RouterLink to="/staff/books/new"><el-button link type="primary" :icon="Plus">新增书目</el-button></RouterLink>
  </PageHeading>
  <section v-else class="hero">''')
s = s.replace('✦ GRADUATION PROJECT', 'GRADUATION PROJECT')
s = s.replace('<span>◈ 简洁高效</span><span>◉ 功能完善</span><span>▣ 支持扩展</span>', '<span><el-icon><Medal /></el-icon> 简洁高效</span><span><el-icon><CircleCheck /></el-icon> 功能完善</span><span><el-icon><Grid /></el-icon> 支持扩展</span>')
s = s.replace('▥ 借阅趋势统计', '<el-icon><TrendCharts /></el-icon> 借阅趋势统计').replace('◕ 热门书目', '<el-icon><PieChart /></el-icon> 热门书目').replace('◷ 最新借阅记录', '<el-icon><Clock /></el-icon> 最新借阅记录').replace('◈ 系统公告', '<el-icon><Bell /></el-icon> 系统公告')
start = s.index('        <section class="panel dashboard-actions">')
end = s.index('        <section class="panel wide dashboard-loans">', start)
s = s[:start] + s[end:]
s = s[:s.index('<style scoped>')]
p.write_text(s, encoding='utf-8')

p = views / 'StaffBooksView.vue'
s = p.read_text(encoding='utf-8').replace("import LoadState", "import { Search, Plus, Reading, Edit, Collection, SwitchButton } from '@element-plus/icons-vue'\nimport LoadState")
s = s.replace('size: 10,', 'size: 6,')
s = s.replace('onMounted(async () => {', '''function search() { page.value = 1; load() }
function reset() { Object.assign(filter, { keyword: '', categoryId: '', enabled: '' }); search() }
function category(id: string) { filter.categoryId = id; search() }
onMounted(async () => {''')
p.write_text(s, encoding='utf-8')
replace_template('StaffBooksView.vue', '''<template>
  <PageHeading title="书目管理" description="维护馆藏书目信息与上架状态">
    <RouterLink to="/staff/books/new"><el-button type="primary" :icon="Plus">新增书目</el-button></RouterLink>
  </PageHeading>
  <form class="panel staff-book-filter" @submit.prevent="search">
    <el-input v-model="filter.keyword" :prefix-icon="Search" placeholder="搜索书名、作者或 ISBN" clearable />
    <el-select v-model="filter.enabled" placeholder="全部状态"><el-option label="全部状态" value="" /><el-option label="已上架" value="true" /><el-option label="已下架" value="false" /></el-select>
    <el-button type="primary" native-type="submit">查询</el-button><el-button @click="reset">重置</el-button><span>共 {{ total }} 条</span>
  </form>
  <div class="staff-catalogue">
    <aside class="panel category-rail"><h2>图书分类</h2><button :class="{ selected: !filter.categoryId }" @click="category('')">全部分类</button><button v-for="c in categories" :key="c.id" :class="{ selected: filter.categoryId === c.id }" @click="category(c.id)">{{ c.name }}</button></aside>
    <div class="staff-catalogue-content"><LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load">
      <div class="staff-book-grid"><article v-for="b in items" :key="b.id" class="panel staff-book-card">
        <div class="staff-cover"><img v-if="b.coverPath" :src="b.coverPath" :alt="b.title" /><el-icon v-else><Reading /></el-icon></div>
        <div class="staff-book-info"><h2 :title="b.title">{{ b.title }}</h2><p>{{ b.author }}</p><el-tag type="info">{{ b.categoryName }}</el-tag><p class="staff-book-count">在册 {{ b.totalCopies }} 册 <strong>可借 {{ b.availableCopies }} 册</strong></p><small>ISBN {{ b.isbn || '未填写' }}</small>
          <div class="staff-card-actions"><RouterLink :to="`/staff/books/${b.id}/edit`"><el-button link type="primary" :icon="Edit">编辑</el-button></RouterLink><RouterLink :to="`/staff/books/${b.id}/copies`"><el-button link type="primary" :icon="Collection">副本</el-button></RouterLink><el-button link :type="b.enabled ? 'danger' : 'success'" :icon="SwitchButton" :loading="busy === b.id" @click="toggle(b)">{{ b.enabled ? '停用' : '上架' }}</el-button></div>
        </div><el-tag class="staff-book-status" :type="b.enabled ? 'success' : 'info'">{{ b.enabled ? '已上架' : '已下架' }}</el-tag>
      </article></div>
    </LoadState><div class="pager"><span>共 {{ total }} 条书目，每页 6 条</span><el-pagination background layout="prev, pager, next" :current-page="page" :page-size="6" :total="total" @current-change="(n: number) => { page = n; load() }" /></div></div>
  </div>
</template>''')

p = views / 'BookFormView.vue'
s = p.read_text(encoding='utf-8').replace("import LoadState", "import { Reading, Search, Picture, InfoFilled, Upload, Back, Check } from '@element-plus/icons-vue'\nimport LoadState")
p.write_text(s, encoding='utf-8')
replace_template('BookFormView.vue', '''<template>
  <div class="staff-breadcrumb">图书管理 / <span>{{ id ? '编辑书目' : '新增书目' }}</span></div>
  <PageHeading :title="id ? '编辑书目' : '新增书目'" description="录入书目信息，创建后可继续添加实体副本。" />
  <LoadState :loading="loading" :error="loadError" @retry="load"><section class="panel catalogue-form-panel">
    <el-alert v-if="error" type="error" :title="error" :closable="false" class="form-alert" />
    <el-form :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
      <div class="staff-form-section"><h2><el-icon><Reading /></el-icon>基本书目信息</h2><span><i>*</i> 为必填项</span></div>
      <div class="staff-form-grid"><el-form-item label="书名" prop="title" required :error="fields.title"><el-input v-model="form.title" maxlength="200" placeholder="请输入书名" /></el-form-item>
      <el-form-item label="作者" prop="author" required :error="fields.author"><el-input v-model="form.author" maxlength="120" placeholder="请输入作者" /></el-form-item>
      <el-form-item label="ISBN-13" :error="fields.isbn"><el-input v-model="form.isbn" placeholder="可留空；填写时需为有效 ISBN-13" /></el-form-item>
      <el-form-item label="分类" prop="categoryId" required :error="fields.categoryId"><el-select v-model="form.categoryId" placeholder="请选择分类"><el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" /></el-select></el-form-item></div>
      <div class="staff-form-section divider"><h2><el-icon><Search /></el-icon>出版与检索</h2></div>
      <div class="staff-form-grid inline-fields"><el-form-item label="出版社"><el-input v-model="form.publisher" placeholder="请输入出版社（可选）" /></el-form-item><el-form-item label="出版日期"><el-date-picker v-model="form.publishedOn" type="date" value-format="YYYY-MM-DD" placeholder="请选择日期（可选）" /></el-form-item><el-form-item class="span-2" label="关键词"><el-input v-model="form.keywords" placeholder="使用逗号分隔多个关键词，方便检索（可选）" /></el-form-item></div>
      <div class="staff-form-section divider"><h2><el-icon><Picture /></el-icon>展示与上架</h2></div>
      <div class="staff-display-fields"><el-form-item label="内容简介" prop="description" :error="fields.description"><el-input v-model="form.description" type="textarea" :rows="5" maxlength="5000" show-word-limit placeholder="请输入内容简介（可选）" /></el-form-item>
        <div class="staff-cover-upload"><label>封面（可选）</label><div class="cover-upload-body"><div class="cover-upload-preview"><img v-if="form.coverPath" :src="form.coverPath" alt="封面预览" /><el-icon v-else><Picture /></el-icon></div><div><el-upload :show-file-list="false" :before-upload="upload" accept="image/jpeg,image/png,image/webp"><el-button :icon="Upload" :loading="uploading">上传封面</el-button></el-upload><p>JPEG / PNG / WebP<br />大小不超过 2 MiB</p></div></div></div>
      </div>
      <div class="staff-enabled-row"><span>上架状态</span><el-switch v-model="form.enabled" /><strong>{{ form.enabled ? '上架' : '下架' }}</strong><span>下架后将停止新的预约和借出。</span></div>
      <div class="staff-form-footer"><span><el-icon><InfoFilled /></el-icon>保存后可继续为本书添加实体副本。</span><RouterLink to="/staff/books"><el-button :icon="Back">返回列表</el-button></RouterLink><el-button type="primary" native-type="submit" :icon="Check" :loading="busy">保存书目</el-button></div>
    </el-form>
  </section></LoadState>
</template>''')
