# 공개 GitHub 게시 계약

이 저장소는 실행 소스, 공개 WebP, 그리고 이미지 생성·검수의 텍스트 authority만
게시한다. 원본 PNG, 검수 contact sheet, 계정 영수증, 배포 영수증은 게시하지 않는다.

## 게시 전 순서

1. 원본이 있는 오너 환경에서 authority를 정규화한다.

   ```bash
   pnpm sanitize:public-authority -- --apply yes
   pnpm sanitize:public-authority
   ```

   두 번째 명령은 `filesChanged: 0`이어야 한다. 모든 receipt의
   `sourceOutputPath`는 해당 receipt의 repo-relative `outputFile`과 같아야 한다.

2. 정규화로 receipt SHA가 바뀌었으므로 기존 `selection.v1.json`,
   `root-review.v1.json`, `src/data/baby-image-release.v1.json`,
   `public/images/baby-template11`은 재사용하지 않는다. selection과 contact sheet를
   다시 만들고, 루트가 시각 검수한 새 hash로 승인한 뒤 공개 파생 파일을 다시
   release한다.

3. 두 테스트 모드를 모두 실행한다.

   ```bash
   # 원본 PNG/contact sheet를 의도적으로 배제한 일반 공개 clone 계약
   pnpm test:baby-images:portable

   # ignored 원본이 있는 오너 환경의 원본 SHA·메타데이터·release 재현 계약
   pnpm test:baby-images:raw
   ```

## 정확한 add 허용 목록

일반 파일과 공개 런타임 이미지는 강제 추가하지 않는다.

```bash
git add -- \
  .env.example .gitignore .nvmrc \
  AGENTS.md DIARY.md README.md docs \
  eslint.config.mjs next-env.d.ts next.config.ts \
  package.json pnpm-lock.yaml tsconfig.json vitest.config.ts \
  scripts src tests public/images/baby-template11
```

`artifacts/`는 기본적으로 전부 ignored다. 아래 텍스트 authority만 정확히
force-add한다.

```bash
campaign_root=artifacts/image-campaign/gyeonggi-baby-template11-v1

git add -f -- \
  "$campaign_root/campaign.v1.json" \
  "$campaign_root/replacements/replacements.v1.json" \
  "$campaign_root/root-review/selection.v1.json" \
  "$campaign_root/root-review/root-review.v1.json"

{
  find "$campaign_root/prompts" -type f -name '*.txt' -print0
  find "$campaign_root/jobs" -type f -name '*.json' -print0
  find "$campaign_root/receipts" -type f -name '*.json' -print0
  for version in v2 v3 v4 v5; do
    find "$campaign_root/replacements/$version/prompts" -type f -name '*.txt' -print0
    find "$campaign_root/replacements/$version/jobs" -type f -name '*.json' -print0
    find "$campaign_root/replacements/$version/receipts" -type f -name '*.json' -print0
  done
} | xargs -0 git add -f --
```

최종 authority 구성은 다음과 같다.

- campaign manifest 1개
- replacement manifest 1개
- prompt 167개
- job 167개
- receipt 167개
- selection 1개
- root review 1개

합계 505개다.

## 정확한 제외 목록

- `artifacts/image-campaign/gyeonggi-baby-template11-v1/generated/**/*.png`
  (v1 원본 143개)
- `artifacts/image-campaign/gyeonggi-baby-template11-v1/replacements/v*/generated/**/*.png`
  (replacement 원본 24개)
- `artifacts/image-campaign/gyeonggi-baby-template11-v1/root-review/sheets/*.png`
  (contact sheet 27개)
- `artifacts/ga4/**`, `artifacts/deployments/**`, 그 밖의 비허용 `artifacts/**`
- `.env*` 중 `.env.example` 이외 파일, `.dev.vars*`, `.wrangler/**`
- `node_modules/**`, `.next/**`, `out/**`, `dist/**`, `coverage/**`, `qa/**`
- `*.tsbuildinfo`, `*.log`, `.DS_Store`

공개에 포함하는 이미지는
`public/images/baby-template11/<site>/<asset>/{desktop,tablet,mobile}.webp`
429개뿐이다. 같은 디렉터리의 `provenance.v1.json` 143개도 함께 포함한다.

## staged index 차단 검사

```bash
git diff --cached --check
git diff --cached --name-only | \
  rg '(^|/)generated/|root-review/sheets/|\.png$|^artifacts/(ga4|deployments)/|^qa/|^dist/|^\.next/|^node_modules/'
git grep --cached -n -E '/[U]sers/[^/]+/|/h[o]me/[^/]+/|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|A[K]IA[0-9A-Z]{16}|github_[p]at_|g[h][pousr]_' --
```

두 `rg`/`git grep` 검사는 결과가 없어야 한다. 최초 커밋 전에는 저장소 범위
Git author email도 GitHub `noreply` 주소인지 별도로 확인한다.
