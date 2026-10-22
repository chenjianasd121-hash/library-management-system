# 管理员创建员工账号弹窗
2026-10-21，Asia/Shanghai。仅管理员端，全部设计图确定前不生成应用实现代码。使用内置Image Gen，三张独立候选图依实际显示顺序编号。

## 目标与功能依据
路由 /admin/users，读取 frontend/src/views/UsersView.vue，并直接查看 design/admin-users/final.png。
open() 初始化用户名、显示名、初始密码为空，角色为LIBRARIAN。标题「创建员工账号」，四个必填字段「用户名」「显示名」「角色」「初始密码」，页脚「取消」「创建账号」。
用户名4–32位字母、数字或下划线；显示名2–40字；角色仅馆员或管理员；初始密码8–64位，有密码可见性控件。成功后首次登录需改密，当前只设计初始正常状态。
不加入读者角色、电话邮箱、部门工号、重复密码、头像上传、权限配置、邀请发送、自动生成密码或启用开关等现有流程没有的功能。

## 视觉约束
继承已选账号管理第1张的深蓝侧栏、白顶栏、浅蓝灰背景与表格。当前路由侧栏根入口为「读者管理」，仅该项激活，不能增设账号管理根菜单。
背景23账号、当前页10条、当前管理员禁用按钮不可用，创建尚未发生。前景为单个白色弹窗，背景有统一蓝灰遮罩，不画成功、报错或加载。
三方案使用相同内容，只比较标签对齐与表单布局。空密码显示提示与眼睛控件，不显示明文密码或密码圆点。

## 三个方向
- 对齐式员工表单：A compact centered modal about560px wide and440px tall. Four single-column rows with fixed-width labels on the LEFT and inputs/select aligned on the RIGHT. Helpers sit below their corresponding inputs, aligned with input edges. Natural vertical rhythm and clear field alignment. Footer bottom-right, 取消 then 创建账号.
- 纵向员工表单：A centered modal about520px wide and570px tall. All four fields stack vertically in the required order, TOP labels and full-width controls. Helpers below each input with subtle text and enough room. Form reads as a calm top-to-bottom entry task. Footer bottom-right, 取消 then 创建账号. No extra section headings.
- 双列员工表单：A wider centered modal about680px wide and400px tall. Balanced TWO-COLUMN grid without nested panels: username and display name in the top row, role and initial password in the second row. Top labels, equal control widths, helpers below each relevant control; allow password helper to wrap. Title full width, footer full width, 取消 then 创建账号 right aligned. Whitespace and alignment create a compact form with no added fields.
