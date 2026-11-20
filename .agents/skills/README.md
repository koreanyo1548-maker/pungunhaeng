# 풍운행 프로젝트 스킬

이 폴더는 Codex의 프로젝트 스킬을 보관합니다. 풍운행 저장소를 체크아웃하고 저장소 루트에서 Codex를 열면 같은 커밋의 스킬 파일을 사용할 수 있습니다. 같은 이름의 사용자 스킬이 있거나 스킬 목록에 나타나지 않는 환경에서는 이 폴더의 `SKILL.md`를 직접 열어 프로젝트 버전을 사용합니다.

| 스킬 | 용도 |
| --- | --- |
| `generate2dsprite` | 캐릭터 기준 원화, 아이콘, 아이템, 이펙트 시트 |
| `video2dsprite` | 승인한 기준 원화 또는 제공된 영상으로 동작 프레임 제작 |
| `generate2dmap` | 배경, 타일, 소품과 맵 자료 |
| `generate2dmedia` | 이미지·영상 생성 경로 선택과 실행 환경 확인 |
| `codeart2d` | 코드로 그리는 2D 에셋 |
| `transparent-visual-assets` | 아이콘·아이템·단일 스프라이트용 투명 PNG 작업 |

## 원본 버전

- Agent Sprite Forge의 5개 폴더는 스크립트가 서로를 참조하므로 함께 관리합니다. [고정 커밋 25203d0](https://github.com/0x0funky/agent-sprite-forge/tree/25203d03900b46b444bdd72a75768c33d1895ad6) · [MIT 라이선스](licenses/agent-sprite-forge.txt)
- Transparent Visual Assets는 요청한 폴더를 가져와 사용 예시의 스크립트 경로를 프로젝트 루트 기준으로 바꿨습니다. [고정 커밋 6c446ea](https://github.com/DwDestiny/codex-visual-asset-skills/tree/6c446ea06b777fab51578966789a706278d7482c) · [MIT 라이선스](licenses/codex-visual-asset-skills.txt)

## 실행 조건

Python 패키지는 NumPy 1.26 이상, Pillow 10.1 이상, SciPy 1.11 이상입니다. 풍운행의 이미지 변환 도구도 쓰는 환경에서는 Pillow 12.0.0을 사용합니다. 영상 처리에는 FFmpeg 5.1 이상이 필요합니다. 이 환경에서는 Python 3.12, NumPy 2.3.5, Pillow 12.0.0, SciPy 1.17.0, FFmpeg 7.1.5로 스크립트 실행을 확인했습니다.

이미지 편집은 세션에서 제공되는 `imagegen`을 사용할 수 있습니다. 영상 생성은 지원되는 생성 서비스나 CLI가 연결된 환경에서 사용할 수 있고, 기존 영상은 로컬 스크립트로 처리할 수 있습니다. 서비스 인증 키는 환경별로 관리합니다. 생성 결과물과 실제 게임 연결은 저장소의 아트 작업 절차를 따릅니다.
