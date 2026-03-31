# 사다리

순수 HTML/CSS/JavaScript로 만든 정적 웹 프로젝트입니다.

## 로컬 실행

브라우저에서 `index.html`을 열면 바로 실행됩니다.

## GitHub Pages 배포

이 프로젝트는 빌드 단계가 없어서 저장소 루트를 그대로 GitHub Pages에 배포하면 됩니다.

### 1. GitHub 저장소 생성

GitHub에서 새 저장소를 만든 뒤 원격 주소를 복사합니다.

예시:

```bash
git remote add origin https://github.com/<github-id>/<repo-name>.git
```

### 2. 코드 푸시

```bash
git push -u origin main
```

### 3. GitHub Pages 활성화

GitHub 저장소에서 아래 순서로 설정합니다.

1. `Settings`
2. `Pages`
3. `Build and deployment` 항목에서 `Source`를 `Deploy from a branch`로 선택
4. Branch를 `main`, Folder를 `/ (root)`로 선택
5. `Save`

배포 주소 예시:

`https://<github-id>.github.io/<repo-name>/`

사용자/조직 사이트 저장소 이름을 `<github-id>.github.io`로 만들면 루트 주소로 배포됩니다.
