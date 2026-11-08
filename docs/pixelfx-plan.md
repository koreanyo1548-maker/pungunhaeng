# pixelfx 이펙트 시스템 교체 계획

상태: **제안 (구현 승인 전)**. `AGENTS.md`에 따라 이 문서는 구현 허가가 아니며, 단계마다 승인 후 진행한다.

## 1. 결론 요약

- pixelfx(MIT)의 이펙트를 **빌드 전에 스프라이트 시트로 구워서(baked)** 게임에서는 그림만 재생하는 방식을 권장한다.
  - 런타임에서 매 프레임 픽셀을 계산하는 방식(시험 GIF에 쓴 방식)은 모바일 가정(CPU 4배 감속)에서 p95 11ms, 최대 20.6ms로 프레임 예산(16.7ms)을 넘는 순간이 있었다.
  - 구운 시트는 이펙트당 20~400KB 수준이고, 현재 단일 빌드가 51MB라 용량 영향이 작다. 라이브러리 코드는 굽는 도구에서만 쓰고 게임 번들에는 들어가지 않는다.
- 교체 대상은 **파티클·섬광·링·접촉 효과**(`burst`, `impact`, `ring`, `contactFX`)와 일부 일러스트 효과(`paintFX`)다. 한글 텍스트(`label`), 보스 등장 화면, 잔상류, 발사체 전용 이미지는 유지한다.
- 4단계로 나누어 진행하고, 각 단계는 URL 플래그로 이전 효과와 즉시 비교·전환할 수 있게 한다. 마지막 단계에서 이전 코드를 정리한다.
- 모든 단계에서 게임 규칙, 충돌, 공격 주기, 시드 시뮬레이션, 전투 배치는 바꾸지 않는다. 이펙트 변형 선택은 효과 전용 난수(`fxRandom`)만 쓴다.

## 2. 라이브러리 조사 결과

### 2.1 정체와 성숙도

| 항목 | 내용 |
|---|---|
| 저장소 | `github.com/patch-gg/pixelfx`, v0.3.0, 커밋 `a841596` (2026-10-31) |
| 라이선스 | MIT. `NOTICE.md`: `sim.js`는 Hugo Duprez(Sprite Fusion) MIT 코드, `act.js`는 Hollow Crown MIT 코드를 각색. **`gallery/fonts`의 Patch Pixel 폰트는 MIT가 아님** (가져오지 않음) |
| 이력 | 전체 8커밋, 2026-10-29~31 사흘간. 그 사이 "전체 재작성", "몸(act) 추가" 같은 큰 변경이 있었다. 태그·릴리스·자동 테스트 없음 |
| 의존성 | 없음. 순수 JS, DOM 미사용(픽셀은 `Uint32Array` 버퍼에 그린다) |
| 결정론 | `Math.random`·`Date`·`performance.now` 사용 없음(전체 grep 확인). 모든 난수는 옵션의 `seed`에서 나온다 |

판단: 품질은 좋지만 **아주 초기 프로젝트**다. npm/GitHub 의존성으로 걸지 말고, 특정 커밋을 복사(vendoring)해서 우리가 소유한다. 업스트림 업데이트는 필요할 때만 수동으로 비교해 반영한다.

### 2.2 구성

- 코어 16개 모듈(원본 160KB, gzip 약 42KB): 프레임(`createFrame`), 이펙트 실행기(`createFx`), 합성(`composite`), 페인터(픽셀·선·원·광원 API), 파티클 시뮬레이터, 팔레트(`PAL`), 픽셀 폰트, 스켈레톤 캐릭터(act), 연쇄(`chain`).
- 이펙트 244개, 21개 분류. 시뮬레이션형 132개(120Hz 고정 스텝), 반복(loop)형 108개.
- 그리기 모델: **색(color) 버퍼 + 빛(light) 버퍼** 두 장. 빛은 가산 합성이라 "뜨거워 보이는" 느낌이 여기서 나온다.
- 옵션: `x, y`(기준점), `flip`, `angle`(회전), `palette`(어두움→밝음 색 배열), `light`(빛 세기), `seed`, 그리고 이펙트별 옵션(`aim`, `height`, `size`, `radius` 등).
- 레이어: `drawBack`(캐릭터 뒤), `draw`(앞). 바닥 링의 먼 쪽 절반 같은 깊이 표현에 쓴다.

### 2.3 그대로 쓸 수 없는 것

| 종류 | 이유 | 해당 |
|---|---|---|
| 몸에 그리는 이펙트(`onBody`) 37개 | 기본 회색 더미 캐릭터의 실루엣·색에 그린다. 우리 일러스트 캐릭터에는 그대로 못 씀 | `hit-flash`, `heal`, `divine-shield`, `blink-in/out`, 상태이상 13종 전부 등 |
| 텍스트 이펙트 | 내장 폰트가 라틴 문자 3×5, 5×7뿐. 한글 불가 | `crit-number`, `combo-counter`, `level-up`, `quest-complete`, `achievement`, `cartoon-pow` 문구 |
| act(역경직·화면 흔들림) | 타격 순간 시간 정지(0.03~0.2초)는 공격 템포를 바꾼다 | 모든 act의 `hits.stop`, `shake`는 쓰지 않는다 |
| 전체 화면 날씨·전환 | 320×180 전체 화면 기준, 프레임당 3~5ms, 일부는 첫 프레임 초기화가 150ms | `weather/*`, `transitions/*` (이번 범위 밖) |

### 2.4 성능 측정

**라이브러리 단독** (Node, 데스크톱, 이펙트 하나를 원래 크기로, 갱신+그리기+합성):

| 지표 | 프레임당 |
|---|---|
| 중앙값 | 0.82ms |
| 상위 10% | 2.47ms |
| 최대 | 6.0ms (`explosions/nuke`) |
| 타격류 | `hit-spark` 0.12ms, `crit-hit` 0.50ms, `blunt-hit` 0.47ms |

**게임 안 시험판** (시드 7, 접촉 타격만 교체, 이펙트마다 168×168 버퍼를 매 프레임 합성, 600프레임):

| 조건 | 현재 avg / p95 / max | pixelfx 런타임 avg / p95 / max |
|---|---|---|
| CPU 1배 | 0.40 / 0.6 / 3.4ms | 0.97 / 2.2 / 4.6ms |
| CPU 4배 감속(모바일 가정) | 2.0 / 3.4 / 7.0ms | 5.0 / **11.0** / **20.6ms** |

타격 하나만 바꿨는데도 피크가 프레임 예산을 넘었다. 처치·피격·내공 해방까지 바꾸면 더 커진다. 런타임 방식을 쓰려면 합성 영역 축소, 동시 개수 제한 같은 최적화가 필수다.

**구운 시트 크기** (30fps, 원래 크기):

| 이펙트 | 프레임 | PNG |
|---|---|---|
| `impacts/hit-spark` | 16 | 21KB |
| `impacts/crit-hit` | 28 | 136KB |
| `spawn/poof` | 49 | 95KB |
| `pickups/collect-burst` | 42 | 89KB |
| `explosions/plasma-explosion` | 52 | 397KB |

현재 `dist-single/index.html`은 51MB, `src/assets/images`는 39MB다. 20종을 3가지 변형씩 구워도 수 MB 이내로 예상한다.

## 3. 현재 이펙트 시스템 목록

| 함수 | 호출 수 | 모양 | 주요 사용처 |
|---|---|---|---|
| `burst` | 17 | 원형 파티클 | 탄 명중, 피격, 처치, 탄 제거, 스침, 걸음 먼지, 엽전, 교대, 보스 잔해 |
| `ring` | 21 | 퍼지는 원 | 교대, 내공 해방, 완전 격파, 화두 성취, 스킬, 보스 등장·격노 |
| `impact` | 6 | 별 모양 섬광 | 피격, 내공 해방, 보스 처치·잔해, 기운 획득 |
| `contactFX` | 2 | 붓 획·불꽃·돌 파편 | 일반 타격, 처치 |
| `paintFX` | 14 | 일러스트 시트 4프레임 | 공격 휘두름, 내공 해방, 교대, 범위기, 보스 공격·격노, 철갑공·회춘단 |
| `label` | 22 | 한글 텍스트 | 근접 ×N, 연속, 교대, 피격 등 → **유지** |
| 기타 | - | - | `drawSkillFX`(검우·천마군림 공격선, 회선 검, 방패), `drawFinisher`, `drawBossIntro`, `drawBossSeal`, 잔상·잔해·발자국, 화면 흔들림 |

그리는 순서(`render/renderer.ts`): 배경 → 발자국·보스 잔상 → 적 → `drawExtraFX`(잔해, 접촉, impact) → `drawPaintedFX` → 아군 탄 → `drawSkillFX` → 위험물 → … 새 이펙트 층도 이 순서 안에 "적 뒤(back)"와 "적 앞(front)" 두 자리로 넣는다.

## 4. 교체 범위와 이벤트별 후보

### 4.1 범위

- **교체**: `burst`, `impact`, `ring`, `contactFX`의 화면 표현. `paintFX` 중 타격·폭발 성격인 것.
- **유지**: `label`(한글), 보스 등장·배너(배치 고정), 잔상·잔해(캐릭터 그림 기반), 발사체·위험물 전용 이미지(승인된 원화), 공격선·경고 표시(판정을 읽는 용도), 화면 흔들림 수치.
- **사용자 결정 필요**: 일러스트 `paintFX`(휘두름, 교대 문양 등)는 무협 일러스트 톤이라, 픽셀 이펙트로 바꿀지 둘을 함께 둘지 정해야 한다(6장).

### 4.2 이벤트 → 이펙트 후보

배율은 화면 캔버스(480×800) 기준이다. 1배면 적 크기(약 50px)와 비율이 맞는다. 팔레트는 기존 색 상수(`BR.*`, 영웅색, 지역색)에서 만든다.

| 이벤트 | 위치 | 현재 | 후보 (배율) | 팔레트 |
|---|---|---|---|---|
| 일반 타격(생존) | `enemies.ts` `hitEnemy` | 붓 획 `contactFX` | `impacts/hit-spark` (1배, 위쪽 조준) | 활성 영웅색 |
| 장갑 적 타격 | 〃 | 불꽃 파편 | `impacts/parry` 또는 `impacts/bullet-impact` (1배) | 금속·금색 |
| 바위 타격 | 〃 | 돌 파편 | `impacts/blunt-hit` (1배, `stone`) | 돌색 |
| 일반 처치 | `enemies.ts` `kill` | `contactFX` + `burst` | `impacts/crit-hit` (1배) | 금색(기본) |
| 탄 명중 | `loop.ts` 탄 충돌 | `burst` 3개 | 타격 이펙트와 겹치므로 **제거 또는 아주 작은 `hit-spark`** | 영웅색 |
| 플레이어 피격 | `player.ts` `damagePlayer` | impact+burst+ring | `impacts/blunt-hit` (1배) | 붉은색 |
| 철갑공 방어 | 〃 | 일러스트+ring+burst | `impacts/shield-block` (1배) | `BR.art` |
| 회춘단·회기 회복 | `player.ts`, `skills.ts` | 일러스트 | `nature/healing-bloom` (1배) | `BR.gi` |
| 엽전 획득 | `pickups.ts` | burst 3개 | `pickups/collect-burst` (작게) | 금색 |
| 기운(파워) 획득 | 〃 | ring+impact | `pickups/collect-burst` (1배) | 청록 |
| 스침 | `combat.ts` `graze` | burst 5개 | `lightning/zap-hit` 또는 작은 `hit-spark` | `BR.yu` |
| 탄 지우기 | `combat.ts` `clearBullets` | burst 4개 | `spawn/poof` (작게) | `BR.art` |
| 내공 해방 | `combat.ts` `blast` | 일러스트 2장+큰 ring 2개+impact+burst | `arcane/mana-burst` (2배) + 기존 큰 ring 유지 | 옥색·금색 |
| 범위기(aoe) | `combat.ts` `aoe` | 일러스트+ring | `impacts/ground-slam` 또는 `arcane/mana-burst` (반경에 맞춰) | 분파색 |
| 완전 격파 | `enemies.ts` `resolveRow` | ring | `arcane/star-fall` 짧게 또는 ring 유지 | `#a3ffe0` |
| 교대 | `formation.ts` `swapHero` | 일러스트 문양+ring+burst | `holy/feather-burst`(운학) 등 영웅별, 또는 `pickups/collect-burst` | 영웅색 |
| 보스 격노 | `enemies.ts` `hitEnemy` | 일러스트+ring | `arcane/mana-burst` (2배, 붉은색) | `#ffa475` |
| 보스 처치 | `enemies.ts` `kill` | 일러스트+impact+burst 65개+ring | `explosions/plasma-explosion` (2배) | 지역색 |
| 보스 잔해 연쇄 | `fx.ts` `effects` | impact+burst 반복 | `impacts/crit-hit` (1~1.5배) | 지역색 |

`explosions/big-explosion`(4.4ms)과 `nuke`(6ms)는 무겁고 연기 기둥이 화풍에 맞지 않아 제외한다.

## 5. 구조 설계

### 5.1 파일 배치

```
tools/pfx/
  vendor/pixelfx/        특정 커밋(a841596)의 src/core + 쓰는 이펙트 파일 + LICENSE + NOTICE.md
  bake.mjs               레지스트리를 읽어 시트를 굽는 Node 도구 (개발 시에만 실행)
src/render/pfx/
  registry.ts            이벤트 키 → { 이펙트 id, 옵션(팔레트·aim·height), 변형 수, 배율, 층, 최대 동시 수 }
  player.ts              구운 시트 재생기: spawn / update / drawBack / drawFront
src/assets/pfx/
  <key>.color.png        색 층 시트
  <key>.light.png        빛 층 시트 (가산 합성으로 그림)
  <key>.json             프레임 위치, fps, 기준점, 프레임 수
```

### 5.2 굽기 (bake)

- 레지스트리의 각 항목을 정해진 옵션으로 실행해 30fps 프레임을 뽑는다. 원본 `render.mjs --sheet`는 빛을 색에 섞어 굽기 때문에 쓰지 않는다. **색과 빛을 따로 굽는 우리 도구**를 쓴다.
  - 게임에서는 색 층을 보통 합성으로, 빛 층을 `lighter`로 그린다. 우리 배경 위에서 실제 가산광이 되어 시험판보다 오히려 원본에 가깝다.
- 개체마다 다른 모양을 내기 위해 시드 2~3개로 변형을 굽는다. 재생할 때는 `fxRandom`으로 하나를 고른다.
- 방향: 위로 쏘는 게임이라 `aim`을 위쪽으로 두고 굽는다. 다른 방향이 필요한 항목만 방향별로 따로 굽는다.
- `drawBack`이 있는 이펙트는 뒤 층 시트를 별도로 만든다.
- 결과 PNG는 커밋한다. 레지스트리나 벤더 코드가 바뀌면 `node tools/pfx/bake.mjs`로 다시 굽는다. 같은 입력이면 같은 PNG가 나와야 하므로 결정론을 검사한다.

### 5.3 재생기

- `spawn(key, x, y, {scale, angle})`: 변형 선택(`fxRandom`), 시작 시각 기록. 게임 로직 상태(`G.state`, `random()`)는 건드리지 않는다.
- `update(dt)`: 경과 시간만 증가시키고 끝난 개체는 제거한다.
- 그리기: `imageSmoothingEnabled = false`, 정수 배율, 정수 좌표로 `drawImage`. 프레임은 경과 시간 × fps로 고른다.
- 동시 개수 제한: 항목별 최대값(예: 타격 12, 처치 10) + 전체 상한 48. 넘치면 가장 오래된 것부터 버린다.
- 동작 줄이기(`reduced`): 짧은 변형을 쓰거나 기존과 같은 방식으로 이동량과 밝기를 줄인다. 큰 섬광은 생략한다.
- 화면 흔들림은 기존 `G.shake` 값을 그대로 둔다. pixelfx의 act·역경직은 쓰지 않는다.

### 5.4 런타임(실시간) 방식을 남겨둘지

보스 처치처럼 드물고 커다란 연출에서 매번 다른 모양이 필요하면, 나중에 그 항목만 실시간으로 돌리는 경로를 추가할 수 있다. 이때는 이펙트 영역만 합성하고 한 번에 1~2개로 제한한다. 처음에는 넣지 않는다.

## 6. 사용자 결정이 필요한 항목

1. **굽기(권장) vs 실시간**: 굽기는 가볍고 안전하지만 변형 수가 고정된다. 실시간은 매번 다르지만 모바일 성능 위험이 있다.
2. **일러스트 효과(`paintFX`)**: 공격 휘두름, 교대 문양, 내공 해방 일러스트를 ① 모두 픽셀로 교체, ② 일러스트를 유지하고 픽셀을 겹침, ③ 일러스트 유지 중 하나를 고른다.
3. **대형 연출 배율**: 내공 해방·보스 처치를 2배로 할지(도트가 보임), 1배로 크게 여러 개 겹칠지.
4. **색 방향**: 타격 색을 활성 영웅색으로 할지, 분파(유·강·기·투학)색으로 할지, 금색·옥색 두 가지로 통일할지.

## 7. 단계별 진행

각 단계는 별도 커밋과 PR로 진행한다. URL 플래그 `#pfx`로 켜고 끄며 비교하고, 승인되면 기본값으로 바꾼다.

| 단계 | 내용 | 산출물 |
|---|---|---|
| **P0 기반** | 벤더 복사(커밋 고정, 라이선스·고지 포함), 굽기 도구, 재생기, 레지스트리, 플래그, 성능·등가 측정 스크립트. 화면 변화 없음 | 도구와 빈 레지스트리, 측정 기준값 |
| **P1 타격·처치** | 일반·장갑·바위 타격, 일반 처치, 탄 명중 정리 | 전후 비교 GIF, 성능표 |
| **P2 플레이어 반응** | 피격, 철갑공, 회복, 엽전·기운 획득, 스침, 탄 지우기 | 전후 비교 GIF, 성능표 |
| **P3 대형 연출** | 내공 해방, 범위기, 완전 격파, 교대, 보스 격노·처치·잔해 | 전후 비교 GIF, 성능표 |
| **P4 정리** | 플래그 제거, 교체된 옛 코드(`burst`/`impact`/`ring`/`contactFX` 그리기)와 안 쓰는 그림 정리, `visual-direction.md` 갱신 | 최종 검증 |
| 보류 | 지역 분위기 날씨(낙엽·벚꽃·안개), 우리 캐릭터 실루엣을 마스크로 넘겨 상태이상 이펙트 쓰기 | 별도 제안 |

## 8. 검증 기준 (매 단계)

- `npm run typecheck`, `npm run build`, `npm run build:single`, `npm test`(두 코스 완주·분기·사망 E2E), `npm run test:ui`.
- 배치 불변: `tests/equivalence/combat-layout.mjs <이전.html> <이후.html>` 통과.
- 시뮬레이션 불변: 같은 시드·같은 입력으로 플래그를 켠 것과 끈 것의 상태(HP, 엽전, 점수, 적 수와 위치, 단계)가 매 시점 같아야 한다. 시험판에서 이 방식으로 일치를 확인했다. 관련 스킬은 `EQUIP_SKILLS`로 장착해 함께 검사한다.
- 성능: CPU 4배 감속에서 현재 대비 p95 증가 1ms 이내, 최대 16.7ms 미만. 보스 처치·내공 해방처럼 이펙트가 몰리는 장면을 따로 측정한다.
- 시각 확인: 단계마다 같은 시드로 전후 비교 GIF와 폰 해상도 확대 이미지를 만든다.
- 굽기 결정론: 같은 레지스트리로 두 번 구운 PNG가 바이트 단위로 같아야 한다.

## 9. 위험과 대응

| 위험 | 대응 |
|---|---|
| 라이브러리가 매우 초기라 바뀔 수 있음 | 커밋 고정 벤더링. 업스트림을 따라가지 않음 |
| 큰 연출에서 화풍 충돌(도트가 두드러짐) | 1배 우선, 2배는 GIF로 확인 후 승인. 안 맞으면 1배 여러 개 조합 |
| 밝은 배경에서 가산광이 하얗게 날아감 | 지역별 배경에서 확인하고, 빛 층 세기(`light`)를 항목별로 조정 |
| 변형이 고정되어 반복이 눈에 띔 | 시드 변형 3개, 좌우 반전, 작은 회전 무작위(효과 난수) |
| 한글 텍스트 불가 | 텍스트는 기존 `label` 유지 |
| 몸에 그리는 이펙트 불가 | 제외. 필요하면 보류 항목(실루엣 마스크)으로 따로 검토 |
| 라이선스 고지 누락 | `LICENSE`·`NOTICE.md`를 벤더 폴더에 함께 두고 문서에 출처 기재. Patch Pixel 폰트는 가져오지 않음 |
| 단일 파일 용량 증가 | 시트를 필요한 프레임만 잘라 굽고, 항목별 크기를 표로 관리 |

## 10. 참고

- pixelfx: https://github.com/patch-gg/pixelfx (MIT)
- 제작 방식: Hugo Duprez, "How to make (good) pixel art effects with Claude" (Sprite Fusion)
- 시험 적용 기록: 접촉 타격만 교체한 런타임 시험판에서 같은 시드의 게임 상태가 일치했고, 1배 크기에서 일러스트와 잘 섞이는 것을 GIF로 확인했다.
