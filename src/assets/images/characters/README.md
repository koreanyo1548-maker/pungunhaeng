# 캐릭터 그림

캐릭터 한 명의 그림을 여기에 PNG로 넣으면 자동으로 등록된다(`assets/manifest.ts`). 이름은 `characters/<파일 이름>`이 된다.

- 달리기·비행 프레임: 가로로 4칸이 이어진 그림 한 장. 예: `ilgeom-run.png` → `frames: { sheet: 'characters/ilgeom-run' }`
- 초상: 그림 한 장. 예: `ilgeom.png` → `portrait: { sheet: 'characters/ilgeom' }`

여러 캐릭터가 한 장에 모인 그림(기존 `hero-run.png` 같은 것)을 쓰려면 `core/assets.ts`의 `SHEET_GRIDS`에 칸 수를 적고, 캐릭터 데이터에 `col`, `row`를 적는다. 자세한 순서는 `docs/adding-characters.md`.
