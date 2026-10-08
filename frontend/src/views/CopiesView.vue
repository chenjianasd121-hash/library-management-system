<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { BookDetail, Copy, CopyStatus } from '@/api/types'
import { statusLabel, statusTone } from '@/utils/format'
import LoadState from '@/components/LoadState.vue'
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
  <PageHeading
    :title="`副本管理${book ? ' · ' + book.title : ''}`"
    description="批量录入条码并维护实体副本"
    ><RouterLink to="/staff/books"><el-button>返回书目</el-button></RouterLink></PageHeading
  >
  <section class="panel add-copy">
    <h2>新增副本</h2>
    <el-alert
      v-if="formError"
      type="error"
      :title="formError"
      :closable="false"
      class="form-alert"
    />
    <div class="copy-form">
      <el-input
        v-model="barcodes"
        type="textarea"
        :rows="4"
        placeholder="一行一个条码，最多 50 个"
      /><el-input v-model="location" placeholder="馆藏位置，例如 A 区 2 排" /><el-button
        type="primary"
        :loading="busy"
        @click="add"
        >添加副本</el-button
      >
    </div>
  </section>
  <section class="panel">
    <div class="list-toolbar">
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
      ><el-button @click="load">刷新</el-button>
    </div>
    <LoadState :loading="loading" :error="error" :empty="!items.length" @retry="load"
      ><div class="table-scroll">
        <el-table :data="items" class="data-table" stripe
          ><el-table-column prop="barcode" label="条码" min-width="150" /><el-table-column
            prop="shelfLocation"
            label="馆藏位置"
            min-width="160"
          /><el-table-column label="状态" width="110"
            ><template #default="s"
              ><el-tag :type="statusTone(s.row.status)">{{
                statusLabel[s.row.status as CopyStatus]
              }}</el-tag></template
            ></el-table-column
          ><el-table-column prop="version" label="版本" width="75" /><el-table-column
            label="操作"
            width="300"
            ><template #default="s"
              ><el-button
                link
                type="primary"
                :loading="rowBusy === s.row.id"
                :disabled="s.row.status === 'RETIRED'"
                @click="edit(s.row)"
                >位置</el-button
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
                >恢复可用</el-button
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
      <div class="pager">
        <el-pagination
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
        /></div
    ></LoadState>
  </section>
</template>
<style scoped>
.add-copy {
  margin-bottom: 14px;
}
.add-copy h2 {
  font-size: 17px;
  margin-top: 0;
}
.copy-form {
  display: grid;
  gap: 10px;
  max-width: 600px;
}
.copy-form .el-button {
  justify-self: start;
}
</style>
