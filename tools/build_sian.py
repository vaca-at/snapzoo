#!/usr/bin/env python3
"""시안 페이지 만들기: docs/시안/_*_tpl.html 틀에 그림 도구(_cel_engine.js)와 언즈체 글꼴을 넣어 완성본을 만들어요.

  python3 tools/build_sian.py          # 셋 다
  python3 tools/build_sian.py herd     # 초원식구들.html 만

글꼴(온글잎 언즈체)은 파일을 저장소에 두지 않아요(재배포 금지). 처음 실행할 때 jsDelivr 에서 받아
~/.cache/snapzoo/unz.woff2 에 두고 써요.
"""
import base64, pathlib, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SIAN = ROOT / 'docs' / '시안'
FONT_URL = 'https://cdn.jsdelivr.net/gh/projectnoonnu/2406-1@1.0/Ownglyph_UNZ-Rg.woff2'
CACHE = pathlib.Path.home() / '.cache' / 'snapzoo' / 'unz.woff2'
PAGES = {
    'styles': ('_styles_tpl.html', '그림방식시안.html'),
    'char': ('_char_tpl.html', '캐릭터그림체시안.html'),
    'herd': ('_herd_tpl.html', '초원식구들.html'),
    'meta': ('_meta_tpl.html', '메타버스3D시안.html'),
    'brand3d': ('_brand3d_tpl.html', '아이콘미리보기로딩시안.html'),   # __ZOO__ = world/zoo3d.js (게임과 같은 그림 도구)
}

def font_b64():
    if not CACHE.exists():
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        print('글꼴 받는 중…', FONT_URL)
        CACHE.write_bytes(urllib.request.urlopen(FONT_URL, timeout=60).read())
    return base64.b64encode(CACHE.read_bytes()).decode()

def main():
    names = sys.argv[1:] or list(PAGES)
    font, engine = font_b64(), (SIAN / '_cel_engine.js').read_text()
    for n in names:
        src, out = PAGES[n]
        html = (SIAN / src).read_text().replace('__ENGINE__', engine).replace('__ZOO__', (ROOT / 'world' / 'zoo3d.js').read_text()).replace('__FONT__', font)
        (SIAN / out).write_text(html)
        print('만듦:', out, f'{len(html) // 1024} KB')

if __name__ == '__main__':
    main()
