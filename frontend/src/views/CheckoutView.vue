<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { ApiError, errorText } from '@/api/http'
import type { CopyLookup, LoanItem, Policy, ReaderLookup } from '@/api/types'
import { dateTime, dueDate, expectedDueDate, newKey, statusLabel } from '@/utils/format'
import {
  UserFilled,
  Reading,
  Search,
  CircleCheckFilled,
  Back,
  Check,
} from '@element-plus/icons-vue'
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
let readerLookupVersion = 0
let copyLookupVersion = 0
watch(
  username,
  () => {
    readerLookupVersion++
    reader.value = null
    policy.value = null
    if (!busy.value) result.value = null
  },
  { flush: 'sync' },
)
watch(
  barcode,
  () => {
    copyLookupVersion++
    copy.value = null
    if (!busy.value) result.value = null
  },
  { flush: 'sync' },
)
const block = computed(() =>
  reader.value?.status === 'DISABLED'
    ? '读者账号已禁用'
    : (reader.value?.overdueLoanCount || 0) > 0
      ? '读者存在逾期借阅'
      : reader.value && policy.value && reader.value.activeLoanCount >= policy.value.maxActiveLoans
        ? `读者在借数量已达到 ${policy.value.maxActiveLoans} 本上限`
        : copy.value?.copy.status === 'READY' && copy.value.readyForReaderId !== reader.value?.id
          ? '此副本已留给其他读者'
          : copy.value && !['AVAILABLE', 'READY'].includes(copy.value.copy.status)
            ? '副本当前不可借'
            : '',
)
async function lookupReader() {
  const version = ++readerLookupVersion
  const query = username.value.trim()
  error.value = ''
  reader.value = null
  result.value = null
  if (!username.value.trim()) return
  lookupBusy.value = true
  try {
    const [currentReader, currentPolicy] = await Promise.all([api.reader(query), api.policy()])
    if (version !== readerLookupVersion || query !== username.value.trim()) return
    reader.value = currentReader
    policy.value = currentPolicy
  } catch (e) {
    if (version === readerLookupVersion) error.value = errorText(e)
  } finally {
    lookupBusy.value = false
  }
}
async function lookupCopy() {
  const version = ++copyLookupVersion
  const query = barcode.value.trim()
  error.value = ''
  copy.value = null
  result.value = null
  if (!barcode.value.trim()) return
  lookupBusy.value = true
  try {
    const currentCopy = await api.lookupCopy(query)
    if (version === copyLookupVersion && query === barcode.value.trim()) copy.value = currentCopy
  } catch (e) {
    if (version === copyLookupVersion) error.value = errorText(e)
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
  <div class="staff-breadcrumb">借阅管理 / <span>办理借出</span></div>
  <PageHeading title="办理借出" description="核对读者与图书副本信息，确认无误后办理借出。"
    ><RouterLink to="/staff/loans"
      ><el-button :icon="Back">返回借阅列表</el-button></RouterLink
    ></PageHeading
  >
  <el-steps
    class="checkout-steps"
    :active="reader && copy ? 2 : reader ? 1 : 0"
    align-center
    finish-status="success"
    ><el-step title="查找读者" /><el-step title="核对副本" /><el-step title="确认借出"
  /></el-steps>
  <section class="checkout-workflow">
    <div class="panel circulation-panel">
      <h2>
        <el-icon><UserFilled /></el-icon>查找读者
      </h2>
      <label class="circulation-label">读者账号</label>
      <div class="input-action">
        <el-input
          v-model="username"
          placeholder="请输入完整读者账号"
          :prefix-icon="Search"
          @keyup.enter="lookupReader"
        /><el-button type="primary" plain :loading="lookupBusy" @click="lookupReader"
          >查找</el-button
        >
      </div>
      <template v-if="reader"
        ><div class="verified-identity">
          <div class="identity-icon">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div>
            <h3>{{ reader.displayName }}</h3>
            <p>
              {{ reader.username }}
              <el-tag :type="reader.status === 'ACTIVE' ? 'success' : 'danger'">{{
                reader.status === 'ACTIVE' ? '账号正常' : '账号已禁用'
              }}</el-tag>
            </p>
          </div>
        </div>
        <dl class="verification-details">
          <div>
            <dt>当前在借</dt>
            <dd>
              <strong>{{ reader.activeLoanCount }}</strong> / {{ policy?.maxActiveLoans ?? '—' }} 本
            </dd>
          </div>
          <div>
            <dt>逾期借阅</dt>
            <dd :class="reader.overdueLoanCount ? 'text-danger' : 'text-success'">
              <strong>{{ reader.overdueLoanCount }}</strong> 本
            </dd>
          </div>
        </dl>
        <div v-if="!block" class="verification-success">
          <el-icon><CircleCheckFilled /></el-icon>读者状态正常，可以办理借阅
        </div>
        <el-alert v-else :title="block" type="warning" :closable="false" show-icon
      /></template>
      <div v-else class="verification-placeholder">
        <el-icon><UserFilled /></el-icon>
        <p>输入读者账号后，查找并核对读者信息</p>
      </div>
    </div>
    <div class="panel circulation-panel">
      <h2>
        <el-icon><Reading /></el-icon>核对图书副本
      </h2>
      <label class="circulation-label">副本条码</label>
      <div class="input-action">
        <el-input
          v-model="barcode"
          placeholder="请扫描或输入副本条码"
          :prefix-icon="Search"
          @keyup.enter="lookupCopy"
        /><el-button type="primary" plain :loading="lookupBusy" @click="lookupCopy">核对</el-button>
      </div>
      <template v-if="copy"
        ><div class="verified-identity">
          <div class="identity-icon book-identity">
            <el-icon><Reading /></el-icon>
          </div>
          <div>
            <h3>{{ copy.copy.bookTitle }}</h3>
            <p>实体馆藏副本</p>
          </div>
        </div>
        <dl class="verification-details copy-details">
          <div>
            <dt>副本条码</dt>
            <dd>{{ copy.copy.barcode }}</dd>
          </div>
          <div>
            <dt>馆藏位置</dt>
            <dd>{{ copy.copy.shelfLocation }}</dd>
          </div>
          <div>
            <dt>副本状态</dt>
            <dd>
              <el-tag
                :type="['AVAILABLE', 'READY'].includes(copy.copy.status) ? 'success' : 'warning'"
                >{{ statusLabel[copy.copy.status] }}</el-tag
              >
            </dd>
          </div>
          <div>
            <dt>待取预约</dt>
            <dd>
              {{
                copy.readyForReaderId
                  ? copy.readyForReaderId === reader?.id
                    ? '属于当前读者'
                    : '已为其他读者保留'
                  : '无待取预约'
              }}
            </dd>
          </div>
        </dl>
        <div
          v-if="['AVAILABLE', 'READY'].includes(copy.copy.status) && !block"
          class="verification-success"
        >
          <el-icon><CircleCheckFilled /></el-icon>副本状态符合借出条件
        </div></template
      >
      <div v-else class="verification-placeholder">
        <el-icon><Reading /></el-icon>
        <p>扫描副本条码后，核对馆藏与预约信息</p>
      </div>
    </div>
    <div class="panel checkout-confirm">
      <h2>
        <el-icon><CircleCheckFilled /></el-icon>确认借出信息
      </h2>
      <el-alert
        v-if="error"
        type="error"
        :title="error"
        :closable="false"
        class="form-alert"
        show-icon
      />
      <div class="checkout-confirm-body">
        <div>
          <p class="checkout-summary">
            {{
              reader && copy
                ? `${reader.displayName} 借阅《${copy.copy.bookTitle}》`
                : '请先完成读者和图书副本核对'
            }}
          </p>
          <div class="checkout-policy">
            <span
              >借阅期限 <strong>{{ policy?.loanDays ?? '—' }}</strong> 天</span
            ><span
              >预计到期日 <strong>{{ policy ? expectedDueDate(policy.loanDays) : '待核对' }}</strong
              ><small>到期当日结束前归还，以服务端办理结果为准</small></span
            >
          </div>
        </div>
        <el-button
          type="primary"
          :icon="Check"
          :disabled="!reader || !copy || !!block"
          :loading="busy"
          @click="submit"
          >确认借出</el-button
        >
      </div>
      <el-result
        v-if="result"
        icon="success"
        title="借出完成"
        :sub-title="`借阅编号 ${result.id} · 到期 ${dueDate(result.dueDate)} · 办理时间 ${dateTime(result.borrowedAt)}`"
      />
    </div>
  </section>
</template>
