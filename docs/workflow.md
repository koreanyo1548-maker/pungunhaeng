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

두 도구가 같은 기준으로 확인한다. **모든 PR에서 GitHub Actions의 `PR checks`(`.github/workflows/pr-checks.yml`)가 아래 검사를 같은 환경에서 돌린다.** 이 검사가 통과해야 완료다. 커밋은 하지 않는다.

**PR checks가 돌리는 것**

| 묶음 | 명령 |
|---|---|
| 타입·형식 | `npm run typecheck`, `npm run format:check` |
| 빌드·이미지 | `npm run build`, `python tools/convert-webp.py --check`, `node tests/e2e/webp-assets.mjs`(Chromium·WebKit), `npm run build:single` |
| 흐름·모바일 화면 | `npm test`의 e2e(시나리오 A~G), `npm run test:ui`(360·390·1280) |
| 영웅·기술·그림·회귀 (Vite 개발 서버) | `hero-kit`, `hero-lives`, `skill-art`, `ambient-art`, `refactor-regressions` (`tests/e2e/`) |
| 재현성 | 같은 빌드를 두 번 돌린 시드 비교 `IDENTICAL` |
| 기준 브랜치와 비교 | 전투 화면 배치(`combat-layout.mjs`)와 이미지 기하(`mobile-image-geometry.mjs`)가 같아야 한다. 시드 비교는 결과만 요약에 적는다 |

- 실패하면 고치고 다시 올린다. 검사를 끄거나 건너뛰지 않는다.
- 결과 화면(요약)에 기준 브랜치와의 시드 비교가 `IDENTICAL`인지 `DIVERGED`인지 나온다. 게임 규칙을 바꾸지 않는 작업(그림, 연출, 리팩터링, 리소스)은 `IDENTICAL`이어야 한다.
- 실행 결과의 artifact에 이 PR의 단일 HTML 빌드와 검사 스크린숏이 14일 동안 남는다.

**PR을 올리기 전에 각자 돌리는 것**

- 최소: `npm run typecheck`, `npm run format:check`, `npm test`
- 손댄 곳의 검사(위 표). 자기 환경에서 못 돌리는 검사(예: Claude 클라우드 환경의 WebKit)는 PR checks에 맡기고, PR 본문에 그렇게 적는다.
- 기준 브랜치 비교를 직접 할 때: 기준 브랜치를 먼저 빌드해 `test-results/base.html`로 복사한 뒤 `node tests/equivalence/run.mjs test-results/base.html dist-single/index.html 12345 2400 0`, `node tests/equivalence/combat-layout.mjs …`, `node tests/e2e/mobile-image-geometry.mjs …`

**게임 규칙을 바꾸는 작업**

- 바뀐 규칙을 확인하는 e2e 항목을 더한다
- 설계 문서(`docs/`)의 해당 장에 바뀐 점과 이유를 적는다

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

두 도구는 맡는 영역을 나눈다. 범위는 기본값이고, 사용자가 다른 쪽에 맡기면 그대로 따른다.

| | Codex (그림·연출) | Claude (규칙·시스템) |
|---|---|---|
| 맡는 일 | 원화·스프라이트·애니메이션·이펙트 제작과 게임 연결, 이미지 파이프라인, 화면 연출, 빌드·성능 | 전투·성장 규칙, 스테이지·인연·메타 진행, 밸런스 수치, 기획 문서·화면 용어, 테스트 체계 |
| 주로 고치는 곳 | `art/`, `src/assets/`, `src/render/`, `src/styles/`, `tools/` | `src/systems/`, `src/data/`, `src/scenes/`, `src/entities/`, `docs/` |
| 함께 쓰는 곳 | `src/core/`, `src/ui/`, `tests/`, `index.html`, 설정 파일: 고칠 때 PR 본문에 적는다 | 같음 |

- 일을 시작할 때 자기 범위인지 먼저 확인한다. 범위 밖이면 사용자에게 그 사실을 말하고, 그래도 맡기면 진행한다.
- 한 일이 양쪽에 걸치면 그 일의 주된 쪽이 맡는다. 예: 새 기술의 이펙트는 Codex, 새 기술의 규칙은 Claude.
- 상대 영역은 필요한 만큼만 최소로 고치고, PR 본문 "남은 것"에 상대에게 넘길 일을 적는다.
- 상대 영역의 결정(그림 방향, 게임 규칙)을 바꾸는 제안은 구현하지 않고 사용자에게 먼저 보고한다.
