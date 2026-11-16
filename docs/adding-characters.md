# 캐릭터 추가하는 법

영웅이나 인연을 하나 더할 때의 순서다. ID 목록은 `data/roster.ts` 한 곳에만 있고, 나머지는 타입 검사(`npm run typecheck`)가 빠진 곳을 알려 준다. 영웅과 인연은 모두 뽑기에서 조각으로 얻는다. 격자 화면, 상세 팝업, 편대 편성, 저장(프로필)은 목록을 따라 자동으로 늘어난다.

## 영웅

1. `data/roster.ts`의 `HERO_IDS`에 ID를 더한다. 화면에 보이는 순서가 이 순서다.
2. 그림을 넣는다.
   - 따로 그린 그림: `assets/images/characters/`에 PNG를 넣으면 자동 등록된다. 달리기·비행 프레임은 가로 4칸 한 장, 초상은 한 장.
   - 여러 명이 모인 시트: `core/assets.ts`의 `SHEET_GRIDS`에 칸 수를 적는다.
3. `data/heroes.ts`에 항목을 더한다. 빠지면 타입 오류가 난다.
   - `art`: `frames`(달리기·비행 4프레임), `portrait`(초상), `swapPose`(등장 자세 줄, 없으면 생략)
   - 이름, 몸 그림 종류(`terrain`: 달리기·비행, 적성 아님), 색, 발사체 이름
   - `trait`: 이름, 적용 범위(`self` 싸우는 동안 / `party` 편대 전체), 문구 `desc(L)`, 수치 `value(L)`
   - `entry`: 등장 기술 이름, 문구 `desc(L)`, 지속 시간 `seconds(L)`
4. 새 영웅은 뽑기 목록에 자동으로 들어간다. 처음부터 주려면 `data/meta.ts`의 `STARTERS`에 넣는다.
5. 특성과 등장 기술의 동작을 `systems/hero-effects.ts`에 연결한다. 수치는 데이터에서 읽지만, 무엇을 하는지는 코드다. 등장 기술 표시가 필요하면 `render/hero-effects.ts`에 더한다.
6. 선택: 등장 연출(`render/skill-animation.ts`의 `aliases`, `flightRows`). 없으면 연출 없이 효과만 나간다.

## 인연

1. `data/roster.ts`의 `NPC_IDS`에 ID를 더한다.
2. 초상 그림을 넣는다(영웅과 같은 방식).
3. `data/npcs.ts`에 항목을 더한다. 빠지면 타입 오류가 난다.
   - `art`(초상), 이름, 계열, 맞수(`rival`), 의뢰 두 개, 고유 기술(`unique`), 인연 카드 강화 문구(`card`)
   - `NPC_LINK`: 따랐을 때 다음에 만나는 인연. 고리가 끊기지 않게 한다.
4. 고유 기술을 `data/skills.ts`에 더하고, 카드 단계 강화(`cardRank`)를 연결한다.

## 확인

- `npm run typecheck`, `npm test`, `node tests/e2e/hero-kit.mjs`(영웅 특성·등장 기술)
- 새 캐릭터가 없는 저장 파일을 불러와도 새 캐릭터는 기본값(잠김, 카드 없음)으로 채워진다(`core/profile.ts`의 `sanitize`).
- 새 인연은 뽑기 목록에 자동으로 들어가고, 카드가 생기기 전까지 판에서는 행인으로 바뀌어 나온다.
