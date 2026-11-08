# 풍운행 화면 구성

전투 화면은 요청에 따라 직전 버전(기존 배경, 붉은 도형 적탄, 오른쪽 세로 버튼, 기존 HUD)으로 복원했다. 아래 전투 관련 항목은 제안 기록이며 현재 적용 상태가 아니다. 편대·돈오·투학 개선과 터치 입력 보정은 유지한다.

## 현재 확정 상태

- 전투 HUD, 버튼, 플레이 영역의 배치는 고정한다. 명시적인 요청 없이 옮기거나 크기를 바꾸지 않는다.
- 기존 배경, 붉은 도형 적탄, 오른쪽 세로 버튼, 기존 HUD를 사용한다.
- 선택 화면은 짙은 먹색/청록 패널, 비급 종이색, 주홍 인장, 금색 확정 버튼을 공유한다.
- 편대는 초상화를 눌러 미리본 후 별도 버튼으로 확정한다. 돈오/투학은 카드 선택 즉시 확정한다.
- 터치 전투 버튼은 pointerdown에 반응하고 합성 click은 무시한다. 마우스와 키보드 click은 유지한다.

## 참고한 공개 스크린샷

레퍼런스는 화면 구조를 비교하는 용도로만 사용했다. 게임 이미지 파일을 가져오지 않았다.

- Archero 전투·선택: https://www.pocketgamer.biz/weq-studios-sven-lubek-localization-mobile-games/
- Survivor.io 선택: https://mturbogamer.com/2022/10/survivor-io-devourer-rogue-skill/
- Survivor.io 전투: https://www.taptap.io/vn/post/1740382
- Sky Force Reloaded 공식: https://www.idreams.pl/pl/our-products/show/product/77-Sky-Force-Reloaded

## 새 그림

이미지 생성 도구로 이 프로젝트를 위해 제작했다.

- `src/assets/images/sky-enemies.png`: 비행 적 3종.
- `src/assets/images/title-journey.png`: 타이틀 배경.

기존 캐릭터 초상·전신·무공 아이콘은 재사용한다. 배경은 기존 루프 방식(교차 반전)으로 스크롤한다.

## 검사

`npm test`: 타입 검사, 단일 파일 빌드, 두 코스 완주/분기/사망 E2E.

`npm run test:ui`: 빌드된 단일 파일에서 360×640, 390×844, 1280×900 화면의 미리보기/확정, 터치 드래그, 교대, 내공 단일 사용, 돈오 선택을 검사한다. 먼저 `npm run build:single`을 실행한다.

`SCREENSHOT_DIR=/tmp/pungunhaeng-ui npm run test:ui`로 화면 캡처를 저장할 수 있다.
