# 캐릭터 추가하는 법

영웅이나 인연을 하나 더할 때의 순서다. ID 목록은 `data/roster.ts` 한 곳에만 있고, 나머지는 타입 검사(`npm run typecheck`)가 빠진 곳을 알려 준다. 격자 화면, 상세 팝업, 편대 편성, 저장(프로필)은 목록을 따라 자동으로 늘어난다.

## 영웅

1. `data/roster.ts`의 `HERO_IDS`에 ID를 더한다. 화면에 보이는 순서가 이 순서다.
2. 그림을 넣는다.
   - 따로 그린 그림: `assets/images/characters/`에 PNG를 넣으면 자동 등록된다. 달리기·비행 프레임은 가로 4칸 한 장, 초상은 한 장.
   - 여러 명이 모인 시트: `core/assets.ts`의 `SHEET_GRIDS`에 칸 수를 적는다.
3. `data/heroes.ts`에 항목을 더한다. 빠지면 타입 오류가 난다.
   - `art`: `frames`(달리기·비행 4프레임), `portrait`(초상), `swapPose`(교체 자세 줄, 없으면 생략)
   - 이름, 지형, 색, 특성 문구, 교체 기술
4. `data/meta.ts`의 `UNLOCKS`에 합류 조건을 더한다. 시작 영웅이면 `STARTERS`에 넣는다. 둘 다 아니면 타입 오류가 난다.
5. 특성 효과를 `systems/formation.ts`에 연결한다. 특성은 아직 데이터가 아니라 코드다.
6. 선택: 교체 기술 연출(`render/skill-animation.ts`의 `aliases`, `flightRows`). 없으면 연출 없이 효과만 나간다.

## 인연

1. `data/roster.ts`의 `NPC_IDS`에 ID를 더한다.
2. 초상 그림을 넣는다(영웅과 같은 방식).
3. `data/npcs.ts`에 항목을 더한다. 빠지면 타입 오류가 난다.
   - `art`(초상), 이름, 계열, 맞수(`rival`), 의뢰 두 개, 고유 기술(`unique`), 인연 카드 강화 문구(`card`)
   - `NPC_LINK`: 따랐을 때 다음에 만나는 인연. 고리가 끊기지 않게 한다.
4. 고유 기술을 `data/skills.ts`에 더하고, 카드 단계 강화(`cardRank`)를 연결한다.

## 확인

- `npm run typecheck`, `npm test`
- 새 캐릭터가 없는 저장 파일을 불러와도 새 캐릭터는 기본값(잠김, 카드 없음)으로 채워진다(`core/profile.ts`의 `sanitize`).
