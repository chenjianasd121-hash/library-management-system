<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { CopyLookup, ReturnResult } from '@/api/types'
import { dateTime, dueDate, expectedDueDate, newKey, statusLabel } from '@/utils/format'
import {
  Reading,
  Search,
  CircleCheckFilled,
  Back,
  Check,
  User,
  Clock,
  Calendar,
  InfoFilled,
} from '@element-plus/icons-vue'
import PageHeading from '@/components/PageHeading.vue'
const barcode = ref(''),
  copy = ref<CopyLookup | null>(null),
  result = ref<ReturnResult | null>(null),
  error = ref(''),
  lookupBusy = ref(false),
  busy = ref(false),
  operationKey = ref(''),
  operationPayload = ref('')
let lookupVersion = 0
watch(
  barcode,
  () => {
    lookupVersion++
    copy.value = null
    if (!busy.value) result.value = null
  },
  { flush: 'sync' },
)
const overdue = computed(
  () => !!copy.value?.activeLoan && copy.value.activeLoan.dueDate < expectedDueDate(0),
)
async function lookup() {
  const version = ++lookupVersion
  const query = barcode.value.trim()
  error.value = ''
  copy.value = null
  result.value = null
  if (!barcode.value.trim()) return
  lookupBusy.value = true
  try {
    const currentCopy = await api.lookupCopy(query)
    if (version !== lookupVersion || query !== barcode.value.trim()) return
    copy.value = currentCopy
    if (!copy.value.activeLoan) error.value = '该副本当前没有在借记录'
  } catch (e) {
    if (version === lookupVersion) error.value = errorText(e)
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
  <div class="staff-breadcrumb">借阅管理 / <span>办理归还</span></div>
  <PageHeading title="办理归还" description="扫描图书副本条码，核对借阅信息后确认归还。"
    ><RouterLink to="/staff/loans"
      ><el-button :icon="Back">返回借阅列表</el-button></RouterLink
    ></PageHeading
  >
  <section class="return-workflow">
    <div class="panel return-lookup">
      <h2>
        <el-icon><Search /></el-icon>核对副本
        <el-tag v-if="copy?.activeLoan" type="success"
          ><el-icon><CircleCheckFilled /></el-icon> 已找到借阅</el-tag
        >
      </h2>
      <label class="circulation-label">图书副本条码</label>
      <div class="input-action">
        <el-input
          v-model="barcode"
          placeholder="请扫描或输入副本条码"
          :prefix-icon="Reading"
          @keyup.enter="lookup"
        /><el-button type="primary" :loading="lookupBusy" @click="lookup">核对</el-button>
      </div>
      <p class="staff-hint">支持扫码枪录入；也可手动输入完整条码后进行核对。</p>
      <el-alert
        v-if="error"
        type="error"
        :title="error"
        :closable="false"
        class="form-alert"
        show-icon
      />
      <template v-if="copy"
        ><div class="return-book">
          <div class="identity-icon book-identity">
            <el-icon><Reading /></el-icon>
          </div>
          <div>
            <h3>{{ copy.copy.bookTitle }}</h3>
            <dl class="verification-details">
              <div>
                <dt>副本条码</dt>
                <dd>{{ copy.copy.barcode }}</dd>
              </div>
              <div>
                <dt>馆藏位置</dt>
                <dd>{{ copy.copy.shelfLocation }}</dd>
              </div>
            </dl>
          </div>
          <el-tag :type="copy.activeLoan ? 'primary' : 'info'">{{
            statusLabel[copy.copy.status]
          }}</el-tag>
        </div>
        <h2 class="return-loan-heading">
          <el-icon><Reading /></el-icon>当前借阅记录
        </h2>
        <dl class="verification-details return-loan-details">
          <div>
            <dt>
              <el-icon><User /></el-icon>借阅读者
            </dt>
            <dd>{{ copy.activeLoan?.readerName || '—' }}</dd>
          </div>
          <div>
            <dt>
              <el-icon><Clock /></el-icon>借出时间
            </dt>
            <dd>{{ dateTime(copy.activeLoan?.borrowedAt) }}</dd>
          </div>
          <div>
            <dt>
              <el-icon><Calendar /></el-icon>应还日期
            </dt>
            <dd>{{ dueDate(copy.activeLoan?.dueDate) }}</dd>
          </div>
        </dl></template
      >
      <div v-else class="verification-placeholder return-placeholder">
        <el-icon><Reading /></el-icon>
        <p>核对条码后，在这里查看图书与借阅信息</p>
      </div>
    </div>
    <div class="panel return-confirm">
      <h2>归还确认</h2>
      <p class="return-intro">请核对本次归还信息，确认无误后提交。</p>
      <dl class="verification-details">
        <div>
          <dt>
            <el-icon><User /></el-icon>借阅读者
          </dt>
          <dd>{{ copy?.activeLoan?.readerName || '—' }}</dd>
        </div>
        <div>
          <dt>
            <el-icon><Reading /></el-icon>图书名称
          </dt>
          <dd>{{ copy?.copy.bookTitle || '—' }}</dd>
        </div>
        <div>
          <dt>
            <el-icon><Reading /></el-icon>副本条码
          </dt>
          <dd>{{ copy?.copy.barcode || '—' }}</dd>
        </div>
      </dl>
      <div class="return-date">
        <span>应还日期</span><strong>{{ copy?.activeLoan?.dueDate || '—' }}</strong>
      </div>
      <el-alert
        v-if="copy?.activeLoan"
        :type="overdue ? 'warning' : 'info'"
        :title="
          overdue
            ? '该借阅已超过应还日期，请及时办理归还。实际逾期情况以服务端办理结果为准。'
            : '核对无误后可办理归还，副本去向以办理结果为准。'
        "
        :closable="false"
        show-icon
      />
      <p class="return-tip">
        <el-icon><InfoFilled /></el-icon>归还后，副本将恢复可借或分配给下一位预约读者。
      </p>
      <el-button
        type="primary"
        :icon="Check"
        :disabled="!copy?.activeLoan"
        :loading="busy"
        @click="submit"
        >确认归还</el-button
      >
      <p class="return-footnote">请在确认已收到实体图书后办理归还</p>
      <el-result
        v-if="result"
        icon="success"
        title="归还完成"
        :sub-title="`归还时间 ${dateTime(result.returnedAt)} · 副本去向：${result.copyStatus === 'READY' ? '已分配给下一位待取读者' : '已恢复可借'}`"
      />
    </div>
  </section>
</template>
