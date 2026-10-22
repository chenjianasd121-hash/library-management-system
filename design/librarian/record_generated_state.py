"""Archive generated design images without altering pixels, and checkpoint each result."""
import argparse, hashlib, json, shutil, struct
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('source')
p.add_argument('relative')
p.add_argument('phase')
p.add_argument('next_item')
p.add_argument('--note', default='Visual check passed; pending user review.')
a = p.parse_args()
root = Path(__file__).resolve().parent
src, dst = Path(a.source), root / a.relative
dst.parent.mkdir(parents=True, exist_ok=True)
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
if dst.exists() and digest(dst) != digest(src):
    raise SystemExit('Refusing to overwrite a different image: ' + str(dst))
if not dst.exists():
    shutil.copy2(src, dst)
assert digest(src) == digest(dst)
data = dst.read_bytes()
assert data[:8] == b'\x89PNG\r\n\x1a\n'
width, height = struct.unpack('>II', data[16:24])
manifest_path = root / 'continuation-2026-10-21.manifest.json'
m = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {
    'date': '2026-10-21', 'role': 'LIBRARIAN', 'mode': 'built-in imagegen',
    'recovered_from': 'C:/Users/en/.codex/worktrees/9acd/基于SpringBoot+vue的图书管理系统/design/librarian',
    'recovered_png_count': 95, 'phase_image_limit': 3, 'images': [],
    'application_code_written': False, 'all_remaining_designs_complete': False,
    'review_status': 'ready_for_user_review', 'user_confirmation': False
}
entry = {'file': a.relative.replace('\\', '/'), 'source': str(src), 'sha256': digest(dst),
         'bytes': len(data), 'width': width, 'height': height, 'phase': a.phase,
         'visual_check': a.note, 'review_status': 'ready_for_user_review', 'user_confirmation': False}
m['images'] = [x for x in m['images'] if x['file'] != entry['file']] + [entry]
m['current_phase'] = a.phase
m['next_unfinished'] = a.next_item
manifest_path.write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(entry, ensure_ascii=False))
