# 원본 리소스

`originals/`는 기존 `src/assets/images/`의 원본 PNG 및 제작 문서 백업입니다.
최초 분리 시 Git blob을 그대로 재사용하여 이미지 바이트를 변경하지 않았습니다.

- 수정·재작업: 이 폴더의 PNG 사용
- 게임 로딩: `src/assets/images/**/*.webp` 사용
- 변환: `python -m pip install -r tools/requirements-assets.txt` 후 `npm run build`, `python tools/convert-webp.py`
- 검증: 변환 후 `npm run build`, `python tools/convert-webp.py --check`
- 원본과 변환 파일을 함께 커밋합니다. 변환기는 원본 파일을 덮어쓰지 않습니다.
- 개발/배포 명령은 기존 `npm run dev`, `npm run build`, `npm run build:single` 그대로입니다.
