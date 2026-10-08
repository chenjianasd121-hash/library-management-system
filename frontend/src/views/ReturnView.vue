<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { CopyLookup, ReturnResult } from '@/api/types'
import { dateTime, dueDate, newKey, statusLabel } from '@/utils/format'
import PageHeading from '@/components/PageHeading.vue'
const barcode = ref(''),
  copy = ref<CopyLookup | null>(null),
  result = ref<ReturnResult | null>(null),
  error = ref(''),
  lookupBusy = ref(false),
  busy = ref(false),
  operationKey = ref(''),
  operationPayload = ref('')
async function lookup() {
  error.value = ''
  copy.value = null
  result.value = null
  if (!barcode.value.trim()) return
  lookupBusy.value = true
  try {
    copy.value = await api.lookupCopy(barcode.value.trim())
    if (!copy.value.activeLoan) error.value = '该副本当前没有在借记录'
  } catch (e) {
    error.value = errorText(e)
  } finally {
    lookupBusy.value = false
  }
}
async function submit() {
  if (!copy.value?.activeLoan || busy.value) return
  busy.value = true
  error.value = ''
  const payload = `${copy.value.activeLoan.id}:${copy.value.copy.barcode}`
  if (!operationKey.value || operationPayload.value !== payload) {
    operationKey.value = newKey()
    operationPayload.value = payload
  }
  try {
    result.value = await api.returnLoan(
      copy.value.activeLoan.id,
      copy.value.copy.barcode,
      operationKey.value,
    )
    operationKey.value = ''
    operationPayload.value = ''
    copy.value = null
    barcode.value = ''
    ElMessage.success('归还办理完成')
  } catch (e) {
    const message =
      e instanceof ApiError && e.code === 'LOAN_ALREADY_CLOSED'
        ? '该借阅已处理，请重新核对条码'
        : errorText(e)
    if (e instanceof ApiError && [409, 422].includes(e.status)) {
      operationKey.value = ''
      operationPayload.value = ''
      await lookup()
    }
    error.value = message
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <PageHeading title="办理归还" description="扫描副本条码，核对在借记录后确认归还" />
  <section class="panel form-panel">
    <h2>① 查找副本</h2>
    <div class="input-action">
      <el-input
        v-model="barcode"
        placeholder="输入或扫描副本条码"
        @keyup.enter="lookup"
      /><el-button :loading="lookupBusy" @click="lookup">核对</el-button>
    </div>
    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      class="form-alert"
    /><el-descriptions v-if="copy" :column="1" border class="verify-box"
      ><el-descriptions-item label="书名">{{ copy.copy.bookTitle }}</el-descriptions-item
      ><el-descriptions-item label="条码">{{ copy.copy.barcode }}</el-descriptions-item
      ><el-descriptions-item label="副本状态">{{
        statusLabel[copy.copy.status]
      }}</el-descriptions-item
      ><el-descriptions-item label="借阅者">{{
        copy.activeLoan?.readerName || '—'
      }}</el-descriptions-item
      ><el-descriptions-item label="借出时间">{{
        dateTime(copy.activeLoan?.borrowedAt)
      }}</el-descriptions-item
      ><el-descriptions-item label="到期日">{{
        dueDate(copy.activeLoan?.dueDate)
      }}</el-descriptions-item></el-descriptions
    >
    <div v-if="copy?.activeLoan" class="return-action">
      <el-button type="primary" size="large" :loading="busy" @click="submit">② 确认归还</el-button>
    </div>
    <el-result
      v-if="result"
      icon="success"
      title="归还完成"
      :sub-title="`归还时间 ${dateTime(result.returnedAt)} · 副本去向：${result.copyStatus === 'READY' ? '已分配给下一位待取读者' : '已恢复可借'}`"
    />
  </section>
</template>
<style scoped>
.input-action {
  display: flex;
  gap: 9px;
}
.verify-box {
  margin-top: 20px;
}
.return-action {
  margin-top: 20px;
}
</style>
