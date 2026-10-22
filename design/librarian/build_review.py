"""Build the offline design review and verify saved images without altering them."""
import hashlib
import html
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote

from PIL import Image

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / "continuation-2026-10-21.manifest.json").read_text(encoding="utf-8"))
main = json.loads((ROOT / "main-pages-verification.json").read_text(encoding="utf-8"))
references = json.loads((ROOT / "public/reference-provenance.json").read_text(encoding="utf-8"))
new_paths = {item["file"] for item in manifest["images"]}
entries = []


def add(title, file, group, status="待审阅", note="", route=""):
    entries.append(dict(id=f"item-{len(entries)+1:02d}", title=title, file=file,
                        group=group, status=status, note=note, route=route,
                        new=file in new_paths))


titles = ["馆员首页", "办理借出", "办理归还", "借阅记录", "预约管理", "图书管理",
          "新增书目", "编辑书目", "实体副本管理", "分类管理", "公告管理", "数据统计", "个人资料", "修改密码"]
for title, page in zip(titles, main["pages"], strict=True):
    add(title, f'{page["page"]}/final.png', "已选主页面", "已选定", route=page["route"])
add("新增分类弹窗", "categories/states/create/final.png", "已选弹窗", "已选第 3 版")
add("新建公告弹窗", "notices/states/create/final.png", "已选弹窗", "已选第 1 版", "保留已选布局的页脚修正版")

fixed = [
    ("编辑分类", "categories/states/edit-category.png", "分类维护"),
    ("分类停用前确认", "categories/states/disable-confirmation.png", "分类维护"),
    ("分类必填校验", "categories/states/required-validation.png", "分类维护"),
    ("编辑公告草稿", "notices/states/edit-notice.png", "公告维护"),
    ("公告只读预览", "notices/states/preview-notice.png", "公告维护"),
    ("公告发布前确认", "notices/states/publish-confirmation.png", "公告维护"),
    ("公告已发布筛选", "notices/states/published-list.png", "公告维护"),
    ("公告撤下前确认", "notices/states/withdraw-confirmation.png", "公告维护"),
    ("公告已撤下筛选", "notices/states/withdrawn-list.png", "公告维护"),
    ("公告必填校验", "notices/states/required-validation.png", "公告维护"),
    ("修改馆藏位置", "book-copies/states/location-dialog.png", "副本与书目"),
    ("副本转维修确认", "book-copies/states/maintenance-confirmation.png", "副本与书目"),
    ("重复条码校验", "book-copies/states/barcode-validation.png", "副本与书目"),
    ("书目字段校验", "book-create/states/field-validation.png", "副本与书目"),
    ("ISBN 已存在", "book-create/states/isbn-conflict.png", "副本与书目"),
    ("封面上传状态板", "book-create/states/cover-feedback.png", "副本与书目"),
    ("书目停用前确认", "books/states/disable-confirmation.png", "副本与书目"),
    ("借出受限：读者逾期", "checkout/states/blocked-checkout.png", "借还与清单"),
    ("借出办理成功", "checkout/states/checkout-success.png", "借还与清单"),
    ("归还：无在借记录", "return/states/no-active-loan.png", "借还与清单"),
    ("归还成功：恢复可借", "return/states/return-success.png", "借还与清单"),
    ("逾期借阅筛选", "loans/states/overdue-filter.png", "借还与清单"),
    ("待取预约筛选", "reservations/states/ready-filter.png", "借还与清单"),
    ("排队预约筛选", "reservations/states/waiting-filter.png", "借还与清单"),
    ("取消预约原因校验", "reservations/states/cancel-reason-validation.png", "借还与清单"),
    ("显示名校验", "profile/states/display-name-validation.png", "账号与密码"),
    ("资料保存中", "profile/states/save-pending.png", "账号与密码"),
    ("资料保存成功", "profile/states/save-success.png", "账号与密码"),
    ("资料保存失败", "profile/states/save-failed.png", "账号与密码"),
    ("当前密码错误", "change-password/states/current-password-incorrect.png", "账号与密码"),
    ("两次密码不一致", "change-password/states/password-mismatch.png", "账号与密码"),
    ("首次登录必须改密", "change-password/states/first-login-required.png", "账号与密码"),
    ("列表加载中", "shared/list-loading.png", "通用与统计"),
    ("列表空结果", "shared/list-empty.png", "通用与统计"),
    ("列表请求失败", "shared/list-failed.png", "通用与统计"),
    ("统计无数据", "stats/states/empty-data.png", "通用与统计"),
]
for title, file, group in fixed:
    status = "用户已确认" if file == "categories/states/required-validation.png" else "待审阅"
    add(title, file, group, status)
add("馆员登录", "public/login.png", "公共页适配", route="/login")
add("馆员公开目录", "public/catalogue.png", "公共页适配", route="/books")
add("馆员书目详情", "public/book-detail.png", "公共页适配", route="/books/:id")
for title, page, route in [("公开公告正文", "notices", "/notices"),
                           ("公告详情正文", "notice-detail", "/notices/:id"),
                           ("无权限结果区", "forbidden", "/403"),
                           ("页面不存在结果区", "not-found", "/:pathMatch(.*)*")]:
    add(title, f"public/references/reader-{page}.png", "正文复用参考", "正文复用参考",
        "图中是读者原版；馆员使用该正文与已选馆员外壳组合，详见公共页复用说明。", route)

assert len(entries) == 59
assert len({e["file"] for e in entries}) == len(entries)
assert sum(e["new"] for e in entries) == 20
(ROOT / "review-items.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

groups = list(dict.fromkeys(e["group"] for e in entries))
index = ["# 馆员设计审阅目录", "", "2026-10-21 · [打开离线图片总览](review.html)。共 59 项，支持分类、搜索、本次新增筛选和大图切换。", "",
         "14 个主页面与两个已选新建弹窗保留；分类必填校验已获确认。其余固定状态和本次馆员公共适配图待审阅。四张公共正文参考按馆员外壳复用，不能视为馆员整页定稿。", "",
         "本次新增 20 张，原有 95 张与七张公共页参考均完整保留。未修改前后端应用代码。", "",
         "- [状态覆盖与复用规则](STATE_COVERAGE.md)", "- [公共页复用说明](PUBLIC_REUSE.md)",
         "- [阶段检查点](PHASE_CHECKPOINT.md)", "- [图片与来源校验](final-audit.json)",
         "- [本次生成来源与哈希](continuation-2026-10-21.manifest.json)", ""]
for group in groups:
    index.extend([f"## {group}", "", "| 图片 | 审阅状态 | 说明 |", "| --- | --- | --- |"])
    for e in entries:
        if e["group"] == group:
            detail = " · ".join(filter(None, ["本次新增" if e["new"] else "", e["route"], e["note"]]))
            index.append(f'| [{e["title"]}]({e["file"]}) | {e["status"]} | {detail} |')
    index.append("")
(ROOT / "REVIEW_INDEX.md").write_text("\n".join(index) + "\n", encoding="utf-8")

cards = []
for e in entries:
    esc = html.escape
    badge_class = "ref" if e["status"] == "正文复用参考" else "ok" if e["status"] != "待审阅" else "pending"
    tag = '<span class="new">本次新增</span>' if e["new"] else ""
    cards.append(f'''<article class="card" data-id="{e['id']}" data-group="{esc(e['group'])}" data-new="{str(e['new']).lower()}" data-search="{esc(e['title']+' '+e['group']+' '+e['route']+' '+e['status'])}">
<button class="preview" data-open="{e['id']}" aria-label="查看{esc(e['title'])}大图"><img src="{quote(e['file'])}" alt="{esc(e['title'])}" loading="lazy" width="1487" height="1058"></button>
<div class="info"><div class="tags"><span class="badge {badge_class}">{esc(e['status'])}</span>{tag}</div><h2>{esc(e['title'])}</h2><p>{esc(e['group'])}{(' · '+esc(e['route'])) if e['route'] else ''}</p>{'<p class="note">'+esc(e['note'])+'</p>' if e['note'] else ''}<a href="{quote(e['file'])}" target="_blank" rel="noopener">打开原图 ↗</a></div></article>''')
options = "".join(f'<option value="{html.escape(g)}">{html.escape(g)}</option>' for g in groups)
template = '''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>馆员界面设计 · 审阅总览</title>
<style>
:root{font-family:"Microsoft YaHei",system-ui,sans-serif;color:#20334f;background:#f3f6fa;font-synthesis:none}*{box-sizing:border-box}body{margin:0}a{color:#245bbd;text-underline-offset:3px}button,input,select{font:inherit}button,a,input,select{outline-offset:4px}button{cursor:pointer}header{background:#122b4d;color:#fff;padding:42px max(5vw,22px) 32px}.eyebrow{font-size:12px;letter-spacing:.13em;color:#a9c4e9;margin:0 0 12px}h1{font-size:clamp(25px,3vw,38px);line-height:1.3;margin:0 0 16px;font-weight:650}header p{max-width:920px;color:#cfdaea;font-size:14px;line-height:1.9;margin:7px 0}.metrics{display:flex;gap:30px;flex-wrap:wrap;margin-top:25px}.metrics strong{font-size:27px;color:#fff;margin-right:8px}.metrics span{font-size:13px;color:#c6d4e6}.links{display:flex;gap:20px;flex-wrap:wrap;margin-top:24px}.links a{color:#b9d3fa;font-size:13px}.toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:15px;flex-wrap:wrap;background:#ffffffed;backdrop-filter:blur(12px);padding:18px max(5vw,22px);border-bottom:1px solid #dfe6ef}.toolbar input[type=search],select{border:1px solid #ccd7e5;border-radius:8px;padding:10px 12px;background:#fff;color:#263d5d}.toolbar input[type=search]{width:290px;max-width:100%}.toolbar label{font-size:13px;display:flex;align-items:center;gap:7px}.toolbar input[type=checkbox]{width:16px;height:16px;accent-color:#2464c4}#count{margin-left:auto;font-size:13px;color:#526982}main{padding:25px max(5vw,22px) 60px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.card{border:1px solid #dfe6ef;border-radius:12px;background:white;overflow:hidden;box-shadow:0 5px 18px #223e6410;display:flex;flex-direction:column}.card[hidden]{display:none}.preview{width:100%;border:0;padding:0;display:block;background:#e8eef5;overflow:hidden}.preview img{display:block;width:100%;height:auto;aspect-ratio:1487/1058;object-fit:contain;transition:transform .2s}.preview:hover img{transform:scale(1.015)}.info{padding:18px 20px 20px}.tags{display:flex;gap:7px;align-items:center;min-height:24px}.badge,.new{font-size:11px;line-height:1.6;padding:3px 8px;border-radius:5px}.ok{color:#226e55;background:#eaf6ef}.pending{color:#9b610e;background:#fff5df}.ref{color:#64539d;background:#f0ecfa}.new{color:#2460af;background:#edf4ff}h2{font-size:17px;line-height:1.5;margin:12px 0 6px}.info p{font-size:12px;color:#61748c;margin:5px 0;line-height:1.7}.info p.note{color:#6b567d}.info a{display:inline-block;font-size:12px;margin-top:12px}#no-results{padding:65px 0;text-align:center;color:#637891}footer{border-top:1px solid #dfe6ef;padding:22px 5vw;color:#657a93;font-size:12px;line-height:1.8}dialog{width:min(97vw,1600px);max-height:96vh;border:0;border-radius:12px;padding:0;background:#11243d;color:white;box-shadow:0 20px 100px #0008}dialog::backdrop{background:#071426dd}.modal-bar{display:flex;align-items:center;gap:12px;padding:12px 16px;flex-wrap:wrap}.modal-bar p{margin:0;flex:1;min-width:180px;font-size:13px}.modal-bar button{color:#fff;border:1px solid #7991ae;border-radius:6px;background:#263f5f;padding:7px 12px}.modal-bar button:disabled{opacity:.4;cursor:default}.modal-bar a{color:#c0d9ff;font-size:12px}#full-image{display:block;width:100%;max-height:calc(96vh - 110px);object-fit:contain;background:#e7eef6}#modal-note{font-size:12px;color:#ccdaeb;padding:0 16px 13px;margin:0}.hint{font-size:11px;color:#afc1d7}noscript{display:block;padding:20px 5vw;background:#fff4d7}@media(min-width:1800px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:1050px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.grid{grid-template-columns:1fr}.toolbar{position:static}.toolbar input[type=search]{width:100%}.toolbar select{flex:1;min-width:130px}#count{width:100%;margin:0}header{padding-top:30px}.metrics{gap:20px}.modal-bar{gap:7px}.hint{display:none}}
</style></head><body>
<header><p class="eyebrow">LIBRARY / LIBRARIAN · 2026.10.21</p><h1>馆员界面设计 · 审阅总览</h1><p>沿用此前选定的主页面，补齐必要状态。点击图片查看大图，可用键盘左右键切换、Esc 关闭。</p><p>14 个主页面、两个新建弹窗及分类必填校验已有选择记录。其余固定状态和新增公共适配图待审阅；四张公共正文参考需结合已选馆员外壳使用。</p><div class="metrics"><span><strong>14</strong>已选主页面</span><span><strong>20</strong>本次新增图片</span><span><strong>59</strong>审阅与复用项目</span></div><nav class="links" aria-label="设计文档"><a href="REVIEW_INDEX.md">文字目录</a><a href="STATE_COVERAGE.md">状态覆盖与复用</a><a href="PUBLIC_REUSE.md">公共页适配说明</a><a href="final-audit.json">完整性校验</a></nav></header>
<noscript>当前浏览器未启用 JavaScript。下方仍可逐项查看，点击“打开原图”查看图片。</noscript>
<section class="toolbar" aria-label="筛选图片"><input id="search" type="search" placeholder="搜索页面、状态或路由" aria-label="搜索页面、状态或路由"><select id="group" aria-label="选择分类"><option value="">全部分类</option>__OPTIONS__</select><label><input id="new-only" type="checkbox">仅本次新增</label><span id="count" role="status" aria-live="polite">共 59 项</span></section>
<main><div class="grid">__CARDS__</div><p id="no-results" hidden>没有匹配项目，请调整搜索或筛选条件。</p></main>
<footer>仅交付设计图片与复用说明，未修改应用代码。生成完成与用户确认分别记录；三个角色及必要状态完成选择后再进入实现。原候选、提示词和来源记录均保留。</footer>
<dialog id="viewer" aria-labelledby="modal-title"><div class="modal-bar"><p id="modal-title"></p><span class="hint">← → 切换 · Esc 关闭</span><button id="previous" aria-label="上一张">←</button><button id="next" aria-label="下一张">→</button><a id="original" target="_blank" rel="noopener">打开原图 ↗</a><button id="close">关闭</button></div><img id="full-image" alt=""><p id="modal-note"></p></dialog>
<script>
const items=__DATA__;
const cards=[...document.querySelectorAll('.card')], search=document.querySelector('#search'),group=document.querySelector('#group'),newOnly=document.querySelector('#new-only'),viewer=document.querySelector('#viewer');
let visible=items.slice(),current=null;
function filter(){const q=search.value.trim().toLocaleLowerCase();cards.forEach(c=>{c.hidden=!!((group.value&&c.dataset.group!==group.value)||(newOnly.checked&&c.dataset.new!=='true')||(q&&!c.dataset.search.toLocaleLowerCase().includes(q)))});const ids=new Set(cards.filter(c=>!c.hidden).map(c=>c.dataset.id));visible=items.filter(x=>ids.has(x.id));document.querySelector('#count').textContent=`显示 ${visible.length} / ${items.length} 项`;document.querySelector('#no-results').hidden=visible.length>0}
search.addEventListener('input',filter);group.addEventListener('change',filter);newOnly.addEventListener('change',filter);
function show(id){current=items.find(x=>x.id===id);if(!current)return;const i=visible.findIndex(x=>x.id===id);document.querySelector('#modal-title').textContent=`${current.title} · ${current.status}（${i+1}/${visible.length}）`;const img=document.querySelector('#full-image');img.src=current.file;img.alt=current.title;document.querySelector('#original').href=current.file;document.querySelector('#modal-note').textContent=current.note||current.group;document.querySelector('#previous').disabled=i<=0;document.querySelector('#next').disabled=i>=visible.length-1;if(!viewer.open)viewer.showModal()}
function move(d){const i=visible.findIndex(x=>x.id===current?.id);if(visible[i+d])show(visible[i+d].id)}
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.open)));
document.querySelector('#previous').addEventListener('click',()=>move(-1));document.querySelector('#next').addEventListener('click',()=>move(1));document.querySelector('#close').addEventListener('click',()=>viewer.close());
viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}if(e.key==='ArrowRight'){e.preventDefault();move(1)}});viewer.addEventListener('click',e=>{if(e.target===viewer){const r=viewer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)viewer.close()}});filter();
</script></body></html>'''
page = template.replace("__OPTIONS__", options).replace("__CARDS__", "\n".join(cards)).replace("__DATA__", json.dumps(entries, ensure_ascii=False).replace("</", "<\\/"))
(ROOT / "review.html").write_text(page, encoding="utf-8")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


checks = []
def check(name, condition, count=None):
    checks.append(dict(check=name, passed=bool(condition), **({"count": count} if count is not None else {})))


original = Path(manifest["recovered_from"])
old_images = sorted(original.rglob("*.png"))
check("Recovered originals are all byte-identical", len(old_images) == 95 and all(
    (ROOT / p.relative_to(original)).is_file() and digest(p) == digest(ROOT / p.relative_to(original)) for p in old_images), len(old_images))
check("Selected main-page hashes unchanged", len(main["pages"]) == 14 and all(
    digest(ROOT / p["page"] / "final.png") == p["sha256"] for p in main["pages"]), 14)
check("New images match manifests and generated source files", len(manifest["images"]) == 20 and all(
    digest(ROOT / p["file"]) == p["sha256"] == digest(Path(p["source"])) and
    (ROOT / p["file"]).stat().st_size == p["bytes"] for p in manifest["images"]), 20)
check("Reader references match their provenance and sources", len(references) == 7 and all(
    digest(ROOT / p["file"]) == p["sha256"] == digest(Path(p["source"])) for p in references), 7)
check("All generated images retain prompt files", all((ROOT / p["file"]).with_suffix(".prompt.txt").is_file() for p in manifest["images"]), 20)
phase_counts = Counter(p["phase"] for p in manifest["images"])
check("No image phase exceeds three images", max(phase_counts.values()) <= 3, len(phase_counts))
decoded = []
for path in sorted(ROOT.rglob("*.png")):
    with Image.open(path) as im:
        im.load()
        decoded.append(dict(file=path.relative_to(ROOT).as_posix(), width=im.width, height=im.height,
                            bytes=path.stat().st_size, sha256=digest(path)))
check("All PNGs decode and expected inventory exists", len(decoded) == 122, len(decoded))
check("Review contains 59 unique existing images and 20 new images", len(entries) == 59 and
      len({e["file"] for e in entries}) == 59 and all((ROOT / e["file"]).is_file() for e in entries)
      and sum(e["new"] for e in entries) == 20, 59)
check("Review preserves the specifically confirmed classification validation", sum(e["status"] == "用户已确认" for e in entries) == 1)
broken = []
documents = sorted(ROOT.rglob("*.md"))
for doc in documents:
    for target in re.findall(r"\]\(([^)]+)\)", doc.read_text(encoding="utf-8")):
        if not target.startswith(("http:", "https:", "#")) and target != "final-audit.json":
            if not (doc.parent / unquote(target.split("#")[0]).strip("<>")).exists():
                broken.append(f"{doc.relative_to(ROOT).as_posix()}: {target}")
check("All librarian Markdown documents have no missing local links", not broken, len(documents))


class GalleryLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.targets = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ("href", "src") and value:
                self.targets.append(value)


gallery_links = GalleryLinks()
gallery_links.feed(page)
gallery_missing = [target for target in gallery_links.targets if not
                   (ROOT / unquote(target.split("#")[0])).exists()]
check("Offline gallery has no missing image or document links", not gallery_missing, len(gallery_links.targets))
audit = dict(date="2026-10-21", role="LIBRARIAN", result="passed" if all(c["passed"] for c in checks) else "failed",
             scope="Saved design artifacts and provenance; not a claim of user approval or application implementation",
             checks=checks, phase_counts=dict(phase_counts), broken_links=broken, gallery_missing_links=gallery_missing, png_inventory=decoded,
             review_items=len(entries), new_images=20, application_code_written=False,
             user_review_required=True, other_role_design_completion="outside this continuation scope")
(ROOT / "final-audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(dict(result=audit["result"], checks=checks, broken_links=broken), ensure_ascii=False, indent=2))
if audit["result"] != "passed":
    raise SystemExit(1)
