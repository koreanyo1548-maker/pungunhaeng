# 작업 규칙 (Codex · Claude 공통)

이 저장소는 Codex와 Claude가 번갈아 작업한다. 두 도구의 기본 습관은 다르므로 아래 규칙을 공통 기준으로 삼는다. 작업 범위는 7장에 있다. 짧은 요약은 `AGENTS.md`에 있고, 두 도구 모두 그 파일을 읽는다(Claude는 `CLAUDE.md`를 거쳐서 읽는다).

## 1. 누구 작업인지 표시

PR 작성자는 늘 사용자 계정이라 PR 목록만으로는 구분되지 않는다. 그래서 아래 네 곳에 표시한다.

| 위치 | Codex | Claude | 사용자 직접 |
|---|---|---|---|
| 브랜치 | `codex/<주제>` | `claude/<주제>`. 클라우드 세션이 `ccr-…`를 정해 주면 그대로 쓴다 | 자유 |
| PR 제목 앞 | `[Codex]` | `[Claude]` | 없음 |
| 커밋 끝줄 | `Agent: Codex` | `Agent: Claude` (기존 `Co-Authored-By`·`Claude-Session` 줄도 유지) | 없음 |
| PR 본문 끝 | `작업: Codex` | `작업: Claude` + 세션 링크 | 없음 |

- 주제는 영어 소문자와 `-`로 짧게 쓴다. 예: `codex/webp-resources`, `claude/stage-encounters`.
- 다른 도구가 연 PR에는 사용자가 요청할 때만 커밋을 더한다. 더한 커밋에는 자기 `Agent:` 끝줄을 붙인다.
- 커밋 작성자 이름은 도구마다 달라서(Codex는 사용자 git 이름, Claude는 `Claude`) 구분 기준으로 쓰지 않는다. `Agent:` 끝줄로 찾는다: `git log --grep '^Agent: Codex'`.

## 2. 브랜치와 PR

- main에 직접 푸시하지 않는다. 자동화(GitHub Actions 등)도 main에 커밋하지 않는다.
- 작업 하나에 PR 하나. 처음에는 초안(draft)으로 열고, 3장의 완료 기준을 채우면 초안을 푼다. 머지는 사용자가 정한다.
- PR 본문은 `.github/pull_request_template.md`의 순서를 따른다: 요약, 바뀐 것, 게임 규칙 영향, 검증, 남은 것.
- 머지된 브랜치는 지운다.
- 작업 브랜치에서만 쓰는 자동화(일회용 워크플로, 생성 스크립트의 자동 커밋)는 PR 본문에 적고, 머지 전에 지우거나 main에서도 쓸 수 있는 형태로 바꾼다.
- 표시 규칙(1장)은 이 문서가 main에 들어간 뒤의 작업부터 적용한다. 이전 커밋은 고치지 않는다.

## 3. 완료 기준

두 도구가 같은 기준으로 확인한다. **모든 PR에서 GitHub Actions의 `PR checks`(`.github/workflows/pr-checks.yml`)가 빠른 코드 점검을 돌린다(1~2분).** 이 검사가 통과해야 완료다. 커밋은 하지 않는다. (2026-11 변경: 브라우저로 게임을 켜는 테스트를 PR마다 돌리던 것을 뺐다. 7분쯤 걸리고, 대부분 규칙을 바꿀 때 옛 기대값을 고치는 일이었다.)

**PR checks가 돌리는 것**

| 묶음 | 명령 |
|---|---|
| 타입·형식 | `npm run typecheck`, `npm run format:check` |
| 빌드·이미지 | `npm run build`, `python tools/convert-webp.py --check`, `npm run build:single` |

- 실패하면 고치고 다시 올린다. 검사를 끄거나 건너뛰지 않는다.
- 실행 결과의 artifact에 이 PR의 단일 HTML 빌드가 14일 동안 남는다.

**PR을 올리기 전에 각자 돌리는 것**

- 늘: `npm run typecheck`, `npm run format:check`
- **게임을 켜는 테스트**(`npm test`의 e2e, `npm run test:ui`, `tests/e2e/`의 `hero-kit`·`hero-lives`·`skill-art`·`ambient-art`·`refactor-regressions`·`webp-assets`, `tests/equivalence/`)는 큰 구조 변경(여러 시스템에 걸친 리팩터링, 판 흐름·저장 형식 변경)이나 사용자가 요청할 때만 직접 돌린다. 돌렸으면 PR 본문 "검증"에 적는다.
- 전투 화면 배치를 지켜야 하는 작업(AGENTS.md)에서 배치를 건드렸을 수 있으면 `node tests/equivalence/combat-layout.mjs <기준 빌드> dist-single/index.html`로 확인한다.

**게임 규칙을 바꾸는 작업**

- 설계 문서(`docs/`)의 해당 장에 바뀐 점과 이유를 적는다
- 테스트(`tests/e2e/`)는 지우지 않는다. 다음에 게임 테스트를 돌릴 때 옛 기대값이 걸리면 그때 새 규칙에 맞춘다

**점검 대상이 아닌 것**

- Cloudflare 빌드·배포 상태(사용자가 관리한다)

## 4. 빌드 공유

- 확인용 단일 HTML은 각 도구가 대화로 전달한다(Claude는 파일로 보내고, Codex는 자기 방식대로). PR checks의 artifact에도 같은 빌드가 남는다.
- 저장소에 빌드 결과물(`dist`, `dist-single`, 빌드용 HTML)을 커밋하지 않는다. 빌드만 담는 `build/…` 브랜치도 새로 만들지 않는다.

## 5. 문서와 그림

- 설계와 결정: `docs/`의 계획 문서. 구현한 뒤에는 그 문서의 "구현 기록" 절에 바뀐 점을 적는다.
- 화면 용어: `docs/terms.md`
- 수치는 데이터 파일(`src/data/`)에 두고, 문서에는 기준과 이유를 적는다.
- 그림: 원본 PNG는 `art/originals/`에 두고, `python tools/convert-webp.py`로 만든 WebP(`src/assets/images/`)와 함께 커밋한다. 새 그림은 `tools/mobile-image-profile.json`에 축소 여부를 적는다. 자세한 순서는 README의 "이미지 원본과 모바일 배포 리소스".
- 생성 파일(`src/assets/image-dimensions.json`, `docs/webp-report.json` 등)은 손으로 고치지 않고 스크립트로 다시 만든다.

## 6. 다른 도구의 작업을 이어받을 때

1. PR 본문의 "남은 것"과 "검증"을 먼저 읽는다.
2. 3장의 완료 기준을 그대로 다시 돌려 본다. 자기 도구의 습관으로 판단하지 않는다.
3. 다른 점이나 빠진 것은 사용자에게 먼저 보고하고, 고치는 것은 사용자가 요청할 때만 한다.

## 7. 작업 범위

두 도구는 맡는 영역을 나눈다. 범위는 기본값이고, 사용자가 다른 쪽에 맡기면 그대로 따른다. (2026-11 변경: 연출·이펙트 연결·화면 표시를 Codex에서 Claude로 옮겼다. Codex는 그림을 그리는 그래픽 디자이너다.)

| | Codex (그래픽 디자이너) | Claude (그 밖의 모든 것) |
|---|---|---|
| 맡는 일 | 그림 그리기: 원화, 스프라이트, 애니메이션 프레임, 이펙트 그림(시트), 아이콘. 그림의 WebP 변환 | 전투·성장 규칙, 스테이지·인연·메타 진행, 밸런스 수치, **연출과 이펙트, 그림을 게임에 연결해 보여 주기, 화면·HUD**, 기획 문서·화면 용어, 테스트 체계 |
| 주로 고치는 곳 | `art/`, `src/assets/`의 그림 파일, `tools/convert-webp.py`·`tools/mobile-image-profile.json` | `src/` 전체(`src/render/`, `src/styles/` 포함), `docs/`, `tests/`, `index.html`, 설정 파일 |

- 그림이 필요하면 Claude가 [Codex 전달: 필요한 그림](codex-art-handoff.md)에 요청을 적는다(무엇을, 크기, 프레임, 지금 대신 쓰는 것). Codex는 그림을 그려 `art/originals/`와 WebP로 넣고, 연결과 연출은 Claude가 한다.
- 일을 시작할 때 자기 범위인지 먼저 확인한다. 범위 밖이면 사용자에게 그 사실을 말하고, 그래도 맡기면 진행한다.
- 상대 영역은 필요한 만큼만 최소로 고치고, PR 본문 "남은 것"에 상대에게 넘길 일을 적는다.
- 상대 영역의 결정(그림 방향, 게임 규칙)을 바꾸는 제안은 구현하지 않고 사용자에게 먼저 보고한다.

## 8. 밸런스 조정

밸런스와 체감은 사용자가 직접 플레이해서 판단한다. 봇 측정은 실제 플레이 체감과 크게 달라(2026-11, S1 기준 개편) 판단 근거로 쓰지 않는다.

- 조정은 이 순서로 반복한다: 사용자가 조정안을 정한다 → 에이전트가 적용하고 PR을 연다 → 사용자가 머지하고 플레이한다 → 다음 조정안.
- 에이전트는 밸런스 봇(`tests/sim/balance.mjs`, `npm run test:sim`)으로 밸런스를 판단하거나 수치를 맞추지 않는다. 봇 수치로 "이 정도면 맞다"고 말하지 않는다.
- 3장의 완료 기준(타입·형식·빌드, PR checks)은 그대로 돌린다. 이것은 코드가 깨지지 않았는지만 본다. 게임 테스트를 돌릴 때 옛 수치를 기대하는 항목은 새 값에 맞춰 고친다.
- 수치를 바꾸면 데이터 파일(`src/data/`)과 설계 문서의 해당 장을 함께 고치고, PR 본문에 바뀐 값(이전 → 이후)을 적어 사용자가 플레이할 때 무엇을 볼지 알 수 있게 한다.
