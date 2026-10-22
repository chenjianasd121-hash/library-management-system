<template>
  <section class="route-state">
    <img :src="'/design/state-not-found.png'" alt="404" />
    <div>
      <h1>页面不存在</h1>
      <p>请检查地址或返回首页</p>
      <RouterLink to="/"><el-button type="primary">返回首页</el-button></RouterLink>
    </div>
  </section>
</template>
