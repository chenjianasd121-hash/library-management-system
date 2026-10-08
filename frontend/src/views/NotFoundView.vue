<template>
  <section class="panel">
    <el-result icon="info" title="页面不存在" sub-title="请检查地址或返回首页"
      ><template #extra
        ><RouterLink to="/"><el-button type="primary">返回首页</el-button></RouterLink></template
      ></el-result
    >
  </section>
</template>
