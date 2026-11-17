# 작업 규칙 (Codex · Claude 공통)

이 저장소는 Codex와 Claude가 번갈아 작업한다. 두 도구의 기본 습관은 다르므로 아래 규칙을 공통 기준으로 삼는다. 짧은 요약은 `AGENTS.md`에 있고, 두 도구 모두 그 파일을 읽는다(Claude는 `CLAUDE.md`를 거쳐서 읽는다).

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

## 3. 완료 기준

두 도구가 같은 기준으로 확인하고, PR 본문 "검증"에 실제로 돌린 명령과 결과를 적는다. 못 돌린 항목은 체크하지 않고 이유를 적는다.

**항상**

- `npm run typecheck`
- `npm run format:check`
- `npm run build`, `npm run build:single`
- `npm test` (e2e 시나리오 A~G)
- `npm run test:ui` (360·390·1280 화면)

**바뀐 곳에 따라** (Vite 개발 서버로 도는 검사)

| 바뀐 곳 | 검사 |
|---|---|
| 영웅 특성·등장 기술·편대 | `node tests/e2e/hero-kit.mjs`, `node tests/e2e/hero-lives.mjs` |
| 인연 기술·기술 그림 | `node tests/e2e/skill-art.mjs` |
| 행인·뽑기 그림 | `node tests/e2e/ambient-art.mjs` |
| 저장·재시작·상태 구조 | `node tests/e2e/refactor-regressions.mjs` |
| 이미지 리소스 | `npm run build` 후 `node tests/e2e/webp-assets.mjs` (PR #18이 머지된 뒤) |

**게임 규칙을 바꾸지 않는 작업** (그림, 연출, 리팩터링, 리소스)

- 시드 비교: main 빌드와 이 빌드가 같은 판을 낸다. `node tests/equivalence/run.mjs <main.html> <이번.html> 12345 2400 0` → `IDENTICAL`
- 전투 화면 배치: `node tests/equivalence/combat-layout.mjs <main.html> <이번.html>` → 3해상도 `IDENTICAL`

**게임 규칙을 바꾸는 작업**

- 같은 빌드를 두 번 돌린 시드 비교가 `IDENTICAL`(재현성)
- 바뀐 규칙을 확인하는 e2e 항목을 더한다
- 설계 문서(`docs/`)의 해당 장에 바뀐 점과 이유를 적는다

**점검 대상이 아닌 것**

- Cloudflare 빌드·배포 상태(사용자가 관리한다)

## 4. 빌드 공유

- 확인용 단일 HTML은 각 도구가 대화로 전달한다(Claude는 파일로 보내고, Codex는 자기 방식대로).
- 저장소에 빌드 결과물(`dist`, `dist-single`, 빌드용 HTML)을 커밋하지 않는다. 빌드만 담는 `build/…` 브랜치도 새로 만들지 않는다.

## 5. 문서

- 설계와 결정: `docs/`의 계획 문서. 구현한 뒤에는 그 문서의 "구현 기록" 절에 바뀐 점을 적는다.
- 화면 용어: `docs/terms.md`
- 수치는 데이터 파일(`src/data/`)에 두고, 문서에는 기준과 이유를 적는다.

## 6. 다른 도구의 작업을 이어받을 때

1. PR 본문의 "남은 것"과 "검증"을 먼저 읽는다.
2. 3장의 완료 기준을 그대로 다시 돌려 본다. 자기 도구의 습관으로 판단하지 않는다.
3. 다른 점이나 빠진 것은 사용자에게 먼저 보고하고, 고치는 것은 사용자가 요청할 때만 한다.
