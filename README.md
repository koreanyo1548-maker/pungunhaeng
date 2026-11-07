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

`index.html#debug` 로 열면 테스트용 `window.__g` 훅이 켜집니다.

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
  equivalence/  두 빌드의 동작이 같은지 결정론적으로 비교
```

## 테스트

Playwright가 필요합니다 (전역 설치 또는 `npm i -D playwright`).

```bash
# 시드·시간·입력을 고정해 두 빌드의 게임 상태를 비교. 차이가 나면 종료 코드 1
node tests/equivalence/run.mjs <a.html> <b.html> [seed] [steps] [course 0=땅 1=하늘]
```
