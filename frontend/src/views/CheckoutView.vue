<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { CopyLookup, LoanItem, Policy, ReaderLookup } from '@/api/types'
import { dateTime, dueDate, expectedDueDate, newKey, statusLabel } from '@/utils/format'
import PageHeading from '@/components/PageHeading.vue'
const username = ref(''),
  barcode = ref(''),
  reader = ref<ReaderLookup | null>(null),
  copy = ref<CopyLookup | null>(null),
  policy = ref<Policy | null>(null),
  result = ref<LoanItem | null>(null),
  error = ref(''),
  lookupBusy = ref(false),
  busy = ref(false),
  operationKey = ref(''),
  operationPayload = ref('')
const block = computed(() =>
  reader.value?.status === 'DISABLED'
    ? '读者账号已禁用'
    : (reader.value?.overdueLoanCount || 0) > 0
      ? '读者存在逾期借阅'
      : copy.value?.copy.status === 'READY' && copy.value.readyForReaderId !== reader.value?.id
        ? '此副本已留给其他读者'
        : copy.value && !['AVAILABLE', 'READY'].includes(copy.value.copy.status)
          ? '副本当前不可借'
          : '',
)
async function lookupReader() {
  error.value = ''
  reader.value = null
  result.value = null
  if (!username.value.trim()) return
  lookupBusy.value = true
  try {
    reader.value = await api.reader(username.value.trim())
    policy.value = await api.policy()
  } catch (e) {
    error.value = errorText(e)
  } finally {
    lookupBusy.value = false
  }
}
async function lookupCopy() {
  error.value = ''
  copy.value = null
  result.value = null
  if (!barcode.value.trim()) return
  lookupBusy.value = true
  try {
    copy.value = await api.lookupCopy(barcode.value.trim())
  } catch (e) {
    error.value = errorText(e)
  } finally {
    lookupBusy.value = false
  }
}
async function submit() {
  if (!reader.value || !copy.value || block.value || busy.value) return
  busy.value = true
  error.value = ''
  const payload = `${reader.value.id}:${copy.value.copy.barcode}`
  if (!operationKey.value || operationPayload.value !== payload) {
    operationKey.value = newKey()
    operationPayload.value = payload
  }
  try {
    result.value = await api.checkout(reader.value.id, copy.value.copy.barcode, operationKey.value)
    operationKey.value = ''
    operationPayload.value = ''
    ElMessage.success('借出办理完成')
    reader.value = null
    copy.value = null
    username.value = ''
    barcode.value = ''
  } catch (e) {
    error.value = errorText(e)
    if (e instanceof ApiError && [409, 422].includes(e.status)) {
      operationKey.value = ''
      operationPayload.value = ''
      await Promise.all([lookupReader(), lookupCopy()])
      error.value = errorText(e)
    }
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <PageHeading title="办理借出" description="先精确查找读者，再核对实体副本与预约优先权" />
  <section class="workflow">
    <div class="panel">
      <h2>① 查找读者</h2>
      <div class="input-action">
        <el-input
          v-model="username"
          placeholder="输入完整读者用户名"
          @keyup.enter="lookupReader"
        /><el-button :loading="lookupBusy" @click="lookupReader">查找</el-button>
      </div>
      <el-descriptions v-if="reader" :column="1" border class="verify-box"
        ><el-descriptions-item label="姓名">{{ reader.displayName }}</el-descriptions-item
        ><el-descriptions-item label="账号">{{ reader.username }}</el-descriptions-item
        ><el-descriptions-item label="状态">{{
          reader.status === 'ACTIVE' ? '正常' : '已禁用'
        }}</el-descriptions-item
        ><el-descriptions-item label="当前在借"
          >{{ reader.activeLoanCount }} / {{ policy?.maxActiveLoans ?? '—' }}</el-descriptions-item
        ><el-descriptions-item label="逾期"
          >{{ reader.overdueLoanCount }} 本</el-descriptions-item
        ></el-descriptions
      >
    </div>
    <div class="panel">
      <h2>② 扫描或输入条码</h2>
      <div class="input-action">
        <el-input v-model="barcode" placeholder="副本条码" @keyup.enter="lookupCopy" /><el-button
          :loading="lookupBusy"
          @click="lookupCopy"
          >核对</el-button
        >
      </div>
      <el-descriptions v-if="copy" :column="1" border class="verify-box"
        ><el-descriptions-item label="书名">{{ copy.copy.bookTitle }}</el-descriptions-item
        ><el-descriptions-item label="条码">{{ copy.copy.barcode }}</el-descriptions-item
        ><el-descriptions-item label="状态">{{
          statusLabel[copy.copy.status]
        }}</el-descriptions-item
        ><el-descriptions-item label="馆藏位置">{{ copy.copy.shelfLocation }}</el-descriptions-item
        ><el-descriptions-item label="待取预约">{{
          copy.readyForReaderId
            ? copy.readyForReaderId === reader?.id
              ? '属于当前读者'
              : '属于其他读者'
            : '无'
        }}</el-descriptions-item></el-descriptions
      >
    </div>
    <div class="panel workflow-confirm">
      <h2>③ 核对并办理</h2>
      <el-alert
        v-if="error"
        type="error"
        :title="error"
        :closable="false"
        class="form-alert"
      /><el-alert v-if="block" type="warning" :title="block" :closable="false" class="form-alert" />
      <p class="muted">
        <span v-if="reader && copy">{{ reader.displayName }} 借阅《{{ copy.copy.bookTitle }}》</span
        ><span v-else>请完成读者和副本核对</span>
      </p>
      <p class="muted">
        借期 {{ policy?.loanDays ?? '—' }} 天；预计到期日
        {{
          policy ? dueDate(expectedDueDate(policy.loanDays)) : '待查询'
        }}。实际日期以提交后的服务端结果为准。
      </p>
      <el-button
        type="primary"
        size="large"
        :disabled="!reader || !copy || !!block"
        :loading="busy"
        @click="submit"
        >确认借出</el-button
      ><el-result
        v-if="result"
        icon="success"
        title="借出完成"
        :sub-title="`借阅编号 ${result.id} · 到期 ${dueDate(result.dueDate)} · 办理时间 ${dateTime(result.borrowedAt)}`"
      />
    </div>
  </section>
</template>
<style scoped>
.workflow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.workflow-confirm {
  grid-column: span 2;
}
.panel h2 {
  font-size: 17px;
  margin: 0 0 17px;
}
.input-action {
  display: flex;
  gap: 9px;
}
.verify-box {
  margin-top: 20px;
}
@media (max-width: 760px) {
  .workflow {
    grid-template-columns: 1fr;
  }
  .workflow-confirm {
    grid-column: auto;
  }
}
</style>
