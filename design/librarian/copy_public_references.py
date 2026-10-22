"""Copy selected reader references; preserve provenance and pixels."""
from pathlib import Path
import hashlib, json, shutil
root = Path(__file__).resolve().parent
source = Path('C:/Users/en/.codex/worktrees/6241/基于SpringBoot+vue的图书管理系统/design/reader')
selected = {'login': 1, 'catalogue': 1, 'book-detail': 3, 'notices': 2, 'notice-detail': 2, 'forbidden': 2, 'not-found': 1}
entries = []
for page, choice in selected.items():
    src, dst = source/page/'final.png', root/'public'/'references'/f'reader-{page}.png'
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists():
        shutil.copy2(src, dst)
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    assert sha(src) == sha(dst)
    entries.append({'page': page, 'selected_variant': choice, 'source': str(src), 'file': dst.relative_to(root).as_posix(), 'sha256': sha(dst), 'bytes': dst.stat().st_size, 'purpose': 'Selected reader reference, not a confirmed librarian final'})
(root/'public'/'reference-provenance.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(f'Preserved {len(entries)} selected reader references with matching hashes.')
