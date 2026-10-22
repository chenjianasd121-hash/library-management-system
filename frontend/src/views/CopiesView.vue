<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { BookDetail, Copy, CopyStatus } from '@/api/types'
import { statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
import { Reading, Plus, Refresh, Back, InfoFilled } from '@element-plus/icons-vue'
import PageHeading from '@/components/PageHeading.vue'
const route = useRoute(),
  id = computed(() => String(route.params.id)),
  book = ref<BookDetail | null>(null),
  items = ref<Copy[]>([]),
  page = ref(1),
  total = ref(0),
  filter = ref(''),
  barcodes = ref(''),
  location = ref(''),
  loading = ref(true),
  error = ref(''),
  formError = ref(''),
  busy = ref(false),
  rowBusy = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [b, d] = await Promise.all([
      api.book(id.value),
      api.copies(id.value, { status: filter.value, page: page.value, size: 10 }),
    ])
    book.value = b
    items.value = d.items
    total.value = d.total
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}
async function add() {
  const codes = barcodes.value
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
  if (!codes.length || codes.length > 50) {
    formError.value = '每次请输入 1–50 个条码，每行一个'
    return
  }
  if (new Set(codes).size !== codes.length) {
    formError.value = '输入中存在重复条码'
    return
  }
  if (!location.value.trim()) {
    formError.value = '请输入馆藏位置'
    return
  }
  formError.value = ''
  busy.value = true
  try {
    await api.addCopies(id.value, codes, location.value.trim())
    ElMessage.success('副本已添加')
    barcodes.value = ''
    await load()
  } catch (e) {
    formError.value = errorText(e)
  } finally {
    busy.value = false
  }
}
async function edit(copy: Copy, targetStatus?: CopyStatus) {
  if (targetStatus) {
    try {
      await ElMessageBox.confirm(
        `确认将条码 ${copy.barcode} 转为“${statusLabel[targetStatus]}”？待取与借出副本不能直接变更。`,
        '确认副本状态',
        { type: 'warning' },
      )
    } catch {
      return
    }
  }
  rowBusy.value = copy.id
  try {
    const place = targetStatus
      ? undefined
      : await ElMessageBox.prompt('请输入新的馆藏位置', '修改位置', {
          inputValue: copy.shelfLocation,
        })
    const data = targetStatus
      ? { targetStatus, version: copy.version }
      : {
          shelfLocation: place ? (place as { value: string }).value : copy.shelfLocation,
          version: copy.version,
        }
    await api.updateCopy(copy.id, data)
    ElMessage.success('副本已更新')
    await load()
  } catch (e) {
    if (e instanceof Error && e.message === 'cancel') return
    ElMessage.error(errorText(e))
    if (e instanceof ApiError && [409, 422].includes(e.status)) await load()
  } finally {
    rowBusy.value = ''
  }
}
onMounted(load)
watch(id, () => {
  page.value = 1
  load()
})
</script>
<template>
  <div class="staff-breadcrumb">图书管理 / <span>副本管理</span></div>
  <PageHeading title="副本管理" description="维护实体图书条码、馆藏位置与流通状态。"
    ><RouterLink to="/staff/books"
      ><el-button :icon="Back">返回书目</el-button></RouterLink
    ></PageHeading
  >
  <section v-if="book" class="panel copies-book-summary">
    <div class="staff-cover">
      <img v-if="book.coverPath" :src="book.coverPath" :alt="book.title" /><el-icon v-else
        ><Reading
      /></el-icon>
    </div>
    <div>
      <h2>{{ book.title }}</h2>
      <p>{{ book.author }}</p>
      <p>ISBN：{{ book.isbn || '未填写' }}</p>
    </div>
    <div class="copies-book-count">
      馆藏 <strong>{{ book.totalCopies }}</strong> 册 · 可借
      <strong class="text-success">{{ book.availableCopies }}</strong> 册
      <p>副本状态变更后，馆藏数量自动更新</p>
    </div>
  </section>
  <section class="panel add-copy">
    <h2>
      <el-icon><Plus /></el-icon>新增副本
    </h2>
    <el-alert
      v-if="formError"
      type="error"
      :title="formError"
      :closable="false"
      class="form-alert"
      show-icon
    />
    <div class="copy-form">
      <label for="copy-barcodes">副本条码</label>
      <div>
        <el-input
          id="copy-barcodes"
          v-model="barcodes"
          type="textarea"
          :rows="2"
          placeholder="请输入条码，每行一个"
        />
        <p class="staff-hint">每次最多添加 50 个条码，请勿输入重复条码。</p>
      </div>
      <label for="copy-location">馆藏位置</label
      ><el-input id="copy-location" v-model="location" placeholder="如：A 区 2 排 3 层" /><el-button
        type="primary"
        :icon="Plus"
        :loading="busy"
        @click="add"
        >添加副本</el-button
      >
    </div>
  </section>
  <section class="panel staff-table-panel copies-list">
    <div class="section-head">
      <h2>副本列表</h2>
      <div class="section-tools">
        <el-select
          v-model="filter"
          placeholder="全部状态"
          @change="
            () => {
              page = 1
              load()
            }
          "
          ><el-option label="全部状态" value="" /><el-option
            v-for="s in ['AVAILABLE', 'READY', 'BORROWED', 'MAINTENANCE', 'RETIRED']"
            :key="s"
            :label="statusLabel[s as CopyStatus]"
            :value="s" /></el-select
        ><el-button :icon="Refresh" @click="load">刷新</el-button>
      </div>
    </div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" class="data-table" stripe
          ><el-table-column prop="barcode" label="副本条码" min-width="220" /><el-table-column
            prop="shelfLocation"
            label="馆藏位置"
            min-width="230"
          /><el-table-column label="状态" width="180"
            ><template #default="s"
              ><el-tag :type="statusTone(s.row.status)">{{
                statusLabel[s.row.status as CopyStatus]
              }}</el-tag></template
            ></el-table-column
          ><el-table-column label="操作" min-width="300"
            ><template #default="s"
              ><el-button
                link
                type="primary"
                :loading="rowBusy === s.row.id"
                :disabled="s.row.status === 'RETIRED'"
                @click="edit(s.row)"
                >修改位置</el-button
              ><el-button
                v-if="s.row.status === 'AVAILABLE'"
                link
                type="warning"
                @click="edit(s.row, 'MAINTENANCE')"
                >转维修</el-button
              ><el-button
                v-if="s.row.status === 'MAINTENANCE'"
                link
                type="success"
                @click="edit(s.row, 'AVAILABLE')"
                >恢复可借</el-button
              ><el-button
                v-if="['AVAILABLE', 'MAINTENANCE'].includes(s.row.status)"
                link
                type="danger"
                @click="edit(s.row, 'RETIRED')"
                >退役</el-button
              ></template
            ></el-table-column
          ></el-table
        >
      </div>
      <div class="staff-list-footer">
        <p>
          <el-icon><InfoFilled /></el-icon
          >待取、借出中的副本不能直接变更流通状态；退役副本仅供查看。
        </p>
        <div class="pager">
          <span>共 {{ total }} 条记录</span
          ><el-pagination
            background
            layout="prev, pager, next"
            :current-page="page"
            :page-size="10"
            :total="total"
            @current-change="
              (n: number) => {
                page = n
                load()
              }
            "
          />
        </div></div
    ></LoadState>
  </section>
</template>
