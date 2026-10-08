<template>
  <section class="panel">
    <el-result icon="warning" title="无权限访问" sub-title="当前账号没有查看此页面的权限"
      ><template #extra
        ><RouterLink to="/"><el-button type="primary">返回首页</el-button></RouterLink></template
      ></el-result
    >
  </section>
</template>
