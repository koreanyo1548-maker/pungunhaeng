# 풍운행 (Pungunhaeng)

무협 종스크롤 슈팅 프로토타입. 엔진 없이 Canvas 2D + DOM HUD로 만들었고, Vite + TypeScript로 빌드합니다.

## 실행

```bash
npm install
npm run dev            # 개발 서버
npm run build          # dist/ : index.html + JS/CSS/PNG 파일
npm run build:single   # dist-single/index.html : 모든 리소스를 넣은 한 파일 (공유용)
npm run typecheck
```

`index.html#debug` 로 열면 테스트용 `window.__g` 훅이 켜집니다. `#seed=42` (또는 `#debug&seed=42`)로 시드를 고정하면 같은 입력에서 같은 판이 재현됩니다.

## 핵심 구조 원칙

- **고정 시간 간격**: 시뮬레이션은 화면 주사율과 상관없이 1/60초 단위로 진행합니다 (`systems/loop.ts`). 60·90·120Hz에서 같은 판이 나옵니다.
- **시드 난수**: 게임플레이 난수(`random`, `rnd`)와 연출 난수(`fxRandom`, `fxRnd`)를 나눴습니다 (`core/rng.ts`). 파티클·화면 흔들림은 게임 결과에 영향을 주지 않습니다.
- **이벤트 버스**: 전투는 일어난 일만 알리고(`emit`), 화두와 깨달음이 구독합니다 (`core/events.ts`). 화두 리스너가 먼저 등록되어 있어야 합니다 (`main.ts`).
- **데이터 주도**: 수치와 콘텐츠는 `data/`에 있습니다. 밸런스 조정은 먼저 `data/tune.ts`를 봅니다.

## 구조

```
src/
  main.ts       진입점
  assets/       원본 PNG 아틀라스와 manifest
  core/         DOM·캔버스, 공유 상태(G), 수학·문자 유틸, 사운드, 리소스 로더
  data/         기획 데이터: 수치(tune), 코스, 영웅, 인연, 깨달음, 갈래·조건, 적 등급
  entities/     플레이어, 적, 보스, 줍는 물건
  systems/      게임 흐름, 루프, 전투, 깨달음, 화두, 인연, 편대
  scenes/       선택 화면: 길·편대, 갈림길(인연), 돈오, 투학, 객잔, 최종 관문, 결과
  render/       그리기: 배경, 캐릭터, 투사체, 이펙트, 보스 UI, 화두 단서
  ui/           HUD, 입력
  debug/        #debug 훅
tests/
  lib/          공용 하네스 (가상 시계, 시드 고정, 선택 화면 조작)
  e2e/          전체 흐름 검사
  sim/          밸런스 봇
  equivalence/  두 빌드의 동작·화면이 같은지 결정론적으로 비교 (리팩터링 검증용)
```

## 테스트

모든 테스트는 가상 시계로 돌아가서 실제 시간보다 훨씬 빠르고, 시드가 같으면 결과도 같습니다. 처음 한 번 `npx playwright install chromium` 이 필요할 수 있습니다.

```bash
npm test               # 타입 검사 → 한 파일 빌드 → e2e

# e2e: 두 코스 완주(인연 따름·돈오·교대·보스·투학·객잔 구매·최종 관문)와
#      거스름·미달 분기(관계 변화, 같은 인연 재등장)를 검사. 실패하면 종료 코드 1
npm run test:e2e

# 밸런스 봇: 시드별로 생존, 피격, 스테이지 길이, 엽전을 관문마다 보고
npm run test:sim                         # 코스마다 4판
npm run test:sim -- --runs 8 --god       # 무적 봇: 전체 판의 길이와 엽전 흐름
npm run test:sim -- other-build.html     # 다른 빌드와 비교할 때

# 리팩터링 검증: 시드·시간·입력을 고정해 두 빌드의 게임 상태를 비교. 차이가 나면 종료 코드 1
node tests/equivalence/run.mjs <a.html> <b.html> [seed] [steps] [course 0=땅 1=하늘]
FRAME_MS_B=8.333333333333334 node tests/equivalence/run.mjs a.html a.html   # 60Hz와 120Hz 비교

# 화면 검증: UI 상태 13개 × 화면 2종의 계산된 스타일을 덤프해 비교
node tests/equivalence/styles.mjs <build.html> <out.json>
node tests/equivalence/compare-styles.mjs <a.json> <b.json>
```
