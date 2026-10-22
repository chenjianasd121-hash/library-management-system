<template>
  <section class="route-state">
    <img :src="'/design/state-forbidden.png'" alt="403" />
    <div>
      <h1>无权限访问</h1>
      <p>当前账号没有查看此页面的权限</p>
      <RouterLink to="/"><el-button type="primary">返回首页</el-button></RouterLink>
    </div>
  </section>
</template>
