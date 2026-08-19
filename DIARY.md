# 작업 일지

## 2026-08-19 — 455개 regional canonical 전체 검색 공개 계약

- 27개 도시 홈 27개, 구 24개, 대표 동·읍·면 404개로 이루어진 455개
  regional canonical을 모두 `indexEligible=true`로 전환했다. reason은
  `city-home`, `regional-district`, `regional-leaf`로 구분하고 redirect target은
  전부 `null`이다.
- 각 도시 sitemap은 해당 도시의 regional canonical 전부를 self-canonical과
  고정 콘텐츠 revision `lastmod`로 내보낸다. 빌드 시각, `changefreq`, `priority`는
  사용하지 않는다. `/areas/`, 가격·가이드·공지·블로그와 글 189개는 기존처럼
  `noindex,follow`이며 sitemap에서 제외한다.
- RSS는 지역 URL 제출 목록으로 쓰지 않고, 공식 도시 자료와 주소 선택 본문을 담은
  홈 editorial item 한 건만 유지한다. RSS 생성 시 regional inventory 전부가
  eligibility contract에 들어왔는지 먼저 검사한다.
- 구·동·읍·면 본문을 committed graph의 상위 지역, 실제 같은 단계 링크,
  원래 표시 이름, 법정 지역 관계와 현재 주소에 직접 맞는 city fact로 다시 썼다.
  목록 앞뒤 링크는 지리적 인접 관계가 아니라 화면 목록 순서라고 명시했다.
  디렉터리는 계속 10–12개 H2 가운데 마지막 일반 콘텐츠 섹션이다.
- 전체 가격표·전체 이용 절차·전체 FAQ는 반복하지 않고 현재 지역의 실제 주소
  확인 문맥과 `/pricing/`, `/guide/`로 이어지는 짧은 안내만 남겼다. 인기·도착시간,
  가짜 landmark, route ordinal/hash/path 기반 문구 선택, 어휘 회전, 기술 통계
  filler는 사용하지 않았다.
- 동적 지역명 뒤 `은/는`, `이/가`, `을/를`, `과/와`는 종성 helper로 붙인다.
  455개 렌더 문서의 지역명·법정명·공식 주소축과 `구/리/동/읍/면/개` 꼬리를
  정규식으로 전수 검사하며 잘못된 조사 결합은 0건이다.
- 같은 단계 지역이 없는 화성 `동탄구/동탄동`은 상위 동탄구·화성 주소와
  도로명·건물명 준비만 설명한다. 존재하지 않는 형제 링크나 `별도 항목 없음`
  placeholder는 455개 작성 본문·실제 렌더에서 0건이며, 실제 상위 경로 링크를
  자동 검사한다.
- 하위 지역이 한 곳뿐인 동탄구는 `A부터 A까지`, `A·A`, `A는 A와 서로 다른`
  식 자기 범위·비교 문장을 만들지 않는다. direct-city 말단의 도시·상위 지역
  중복과 H2의 연속 지역명도 제거했고, 세 패턴을 455개 전수 hard gate로 고정했다.
- actual-render 내부 휴리스틱은 cross-site p95 `0.337229`, max `0.467054`,
  within-site p95 `0.440281`, max `0.518041`, 반복 block exact p95
  `0.105769`/max `0.229885`, normalized p95 `0.156570`/max `0.243105`이다.
  교차·동일 사이트의 home/district/representative 종류별 수치도 모두 p95
  `0.45` 미만·max `0.55` 미만을 통과했다. 이는 NAVER 공식 임계값이나 순위
  보장이 아니며 임계값 완화, 문구 회전, filler는 사용하지 않았다.
- exact title·description·H1·document collision, 공개 suffix leak, 기존 8개
  정본 플랫폼과 substantive exact/normalized collision은 모두 0이다.
  eligible regional inventory SHA-256은
  `1c6e72e9614aae92347983a60fbf359e27aa792f8886c7cc2b02974192bf90f4`다.

최종 검증:

- `pnpm test`: 20 files, 112 tests PASS.
- `pnpm typecheck`: PASS (`next typegen`, `tsc --noEmit`).
- `pnpm lint`: PASS.
- `pnpm audit:copy`: PASS. 정본 8개와 substantive exact/normalized collision 0.
- `node --import tsx scripts/audit-naver-near-duplicates.mjs --copy-audit no`:
  PASS, regional/render/index/sitemap 455, staged ancillary 189, anti-filler·technical
  filler·index·canonical·robots·lastmod failure 0.
- 이 작업에서는 city registry의 `PUBLIC_SITE_KEYS`, Cloudflare 프로젝트,
  public tuple, Git commit·push·배포를 변경하지 않았다.

## 2026-08-19 — 도시 홈 고유성·단계적 색인 계약

- 6개 Template11 기본 family는 유지하면서 27개 사이트마다 고유한 lightweight
  design profile을 결속했다. 시각 profile은 화면 차이만 담당하며 검색 본문
  고유성 점수에는 사용하지 않는다.
- 지역 페이지에서 반복되던 전체 가격표·전체 이용 절차·전체 FAQ를 제거했다.
  지역 본문은 `/pricing/`과 `/guide/`의 짧은 실제 링크 요약만 제공하며 상세
  운영 사실은 고정 경로에만 남겼다.
- 27개 도시 홈에 공식 시청·공공기관 자료로 확인한 지형·수계·철도·공원·생활권
  fact profile을 추가했다. 각 profile은 `checkedAt=2026-08-19`, 4개 실제 렌더
  fact section, 공식 HTTPS source와 화면의 `공식 지역 자료` 링크를 가진다.
  27개 홈에서 source 60개 전체의 label과 href가 실제 컴포넌트 HTML에
  렌더되는지 검사하며, 일부만 잘라 보여 주지 않는다.
- 공개 초기 sitemap과 RSS를 각 사이트 홈 `/` 한 건으로 제한했다. 455개 지역
  경로는 모두 생성·접근 가능하지만 홈 27개만 indexable이며 나머지 428개는
  self-canonical `noindex,follow`다. `/areas/`, 가격·가이드·공지·블로그와 글
  189개도 200·self-canonical·`noindex,follow`이고 sitemap/RSS에서 제외한다.
- 인공 editorial wrapper, path/hash/route ordinal 기반 문구 회전, 고객에게
  불필요한 내부 통계 용어를 제거했다. normalized paragraph 충돌 자체는
  diagnostic으로 두고, exact document/meta 충돌 0과 실제 렌더 유사도·반복
  본문 비율을 출시 조건으로 사용한다.
- 내부 NAVER 근접중복 휴리스틱은 공식 순위 기준이나 노출 보장이 아니다.
  색인 가능한 홈 27개 측정은 cross-site trigram p95 `0.345238`, max
  `0.371595`, repeated exact max `0.137220`, normalized max `0.304020`으로
  각각 `<0.45`, `<0.55`, `<=0.25`, `<=0.35`를 통과했다.
- eligible regional inventory SHA-256은
  `8eda7605fb2c3e5253d4149025a6b20870bcd2429832c17502e0778c4e889f5e`다.
  공식 도시 홈 source provenance SHA-256은
  `bc4f6578b3af7720f8cd4afd98e0fc886915b3fa99fecfa22de90b39cfa321b0`다.
  공식 출처 60개는 dead·4xx·5xx 0건으로 확인했고, Node TLS가 실패한
  의정부시 3개 공식 경로는 curl/browser에서 200과 해당 본문 용어를 확인했다.
- 이 작업에서는 commit·push·Cloudflare 재배포를 수행하지 않았다.

최종 검증:

- `pnpm test`: 20 files, 105 tests PASS.
- `pnpm typecheck`: PASS (`next typegen`, `tsc --noEmit`).
- `pnpm lint`: PASS.
- `node scripts/generate-city-inventory.mjs --check`: PASS,
  inventory digest `sha256:57b8fd77d0a5afbbde88fccbead6cab48367f1798fbd15e72e7329345c22bea5`.
- `pnpm audit:copy`: PASS. 정본 8개와 substantive exact/normalized collision 0.
- `node --import tsx scripts/audit-naver-near-duplicates.mjs`: PASS,
  455개 지역 문서 렌더, 색인 홈 27·단계적 noindex 428, staged ancillary 189.
- `pnpm test:browser:production`: v1~v6 대표 6개 사이트 × 홈·지역 목록·구·말단
  × desktop/mobile = 48 checks PASS, Chromium `151.0.7922.34`, 자동 `_rsc` 0.
  공개 상태에서는 홈만 `index,follow`, 지역 목록·구·말단은 `noindex,follow`,
  preview에서는 전부 `noindex,nofollow`가 되도록 route-aware fixture를 추가했다.
- 수원 대표 production build audit: 47 static pages, sitemap 1(home), regional 34 중
  staged 33, ancillary 7 staged, RSS 1(home), image refs 225/files 21 PASS.

## 2026-08-19 — 경기 베이비 플랫폼 시작

- 대상 범위를 경기 31개 시·군 중 가평·이천·양평·여주 제외 27개로 확정했다.
- 한 플랫폼은 해당 시·군 홈과 실제 구·대표 동·읍·면만 생성한다. 전체 지역 canonical은 홈 27, 구 24, 대표 하위 404로 합계 455개다.
- Template11의 시각 골격과 MassageDay의 Next 정적-export 계약을 결합하는 공용 엔진 구조를 선택했다.
- 무료 호스팅은 27개 상업용 정적 사이트 한도와 약관을 비교해 Cloudflare Pages Direct Upload를 1순위로 선정했다. 실제 계정 인증·프로젝트 생성은 전체 빌드 검증 뒤 진행한다.
- 도시별 유사 사이트가 doorway로 평가되지 않도록 시별 브랜드·구성·본문·이미지·편집 글을 실질적으로 분리하고 교차 중복 감사를 출시 차단 조건으로 둔다.

## 2026-08-19 — Cloudflare Pages 배포 파이프라인 독립 감사

- 실제 Cloudflare 로그인, 프로젝트 생성, 배포는 수행하지 않았다. 공용 앱·이미지·출시 파일도 수정하지 않았다.
- 인벤토리는 매 실행마다 `COMMITTED` schema v1, 정확히 27개, 고유 key/project/origin, `projectName`과 `https://<projectName>.pages.dev`의 완전 일치를 검증한다.
- 공개 상태는 `public + isPublic=true + indexingEnabled=true + 유효한 HTTPS publicOrigin`만 허용한다. `planned/preview`는 세 플래그가 모두 비공개 상태여야 하며 `--allow-nonpublic yes`를 명시해야 한다. 혼합 상태는 옵션으로 우회할 수 없다.
- 실제 배포와 dry-run 모두 40자리 Git HEAD와 깨끗한 작업 트리를 요구한다. Wrangler에는 분리된 두 인자가 아니라 단일 boolean 인자 `--commit-dirty=false`를 전달한다.
- 빌드 영수증을 schema v2로 올려 사이트·projectName·인벤토리 파일 SHA-256·공개 상태·Git SHA·정적 산출물 트리 SHA-256/파일 수/바이트 수를 결속했다. 영수증 자체는 산출물 해시에서 제외하며, 이전 schema와 빌드 후 변조된 파일은 배포 전에 차단한다.
- Wrangler 4.124.0의 실제 JSON 표시 키(`Project Name`, `Project Domains`)와 raw API형 키를 모두 정규화한다. 기존 원격 프로젝트의 `*.pages.dev` 도메인이 인벤토리와 다르면 배포하지 않고, 프로젝트 생성은 `--create-projects yes`일 때만 실행한 뒤 목록을 다시 조회해 검증한다.
- dry-run은 Cloudflare CLI와 영수증 파일 쓰기를 모두 0회로 유지하고 메모리 내 계획 영수증만 반환한다. 실제 성공 영수증은 `artifacts/deployments/cloudflare-pages.latest.json`에 원자적으로 기록한다.
- 정적 산출물 감사는 모든 sitemap HTML의 베이비 이미지 `src`와 `srcset` 후보 전부를 파싱한다. 사이트 scope, root-relative URL, path escape, 실제 non-empty regular file 존재, symlink 금지, 이미지 0개, 타 도시 디렉터리 혼입을 차단한다.

검증 결과:

- `pnpm test`: 12 files, 58 tests PASS.
- `pnpm typecheck`: PASS (`next typegen`, `tsc --noEmit`).
- `pnpm lint`: PASS.
- `node scripts/audit-built-output.mjs --site suwon --output dist/suwon`: 예상대로 `BABY_AUDIT_IMAGE_FILE_MISSING`에서 FAIL. 기존 산출물에 참조된 `gbt11-suwon-01/mobile.webp`가 실제로 없는데도 구 감사기가 통과하던 회귀를 재현하고 차단했다.
- `node scripts/deploy-cloudflare-pages.mjs --site suwon --allow-nonpublic yes --dry-run yes`: 예상대로 `BABY_DEPLOY_GIT_HEAD_REQUIRED`에서 FAIL. 저장소가 최초 커밋 전인 상태에서 Cloudflare 호출 없이 차단됐다.

관련 파일 SHA-256:

- `scripts/deploy-cloudflare-pages.mjs`: `6d9fa5d87c71a9edc2657352bbe2fdf68a0d9530fdbf7a3f45d3582ec805be2d`
- `scripts/build-site.mjs`: `205e7639537229159506663b13a6ab482c63af814c615dbf68add6d6036d8484`
- `scripts/audit-built-output.mjs`: `86ee34fdd4cad6d3cc3b9add13081e49f4e384bb18d4c8c328da885cfc5b684d`
- `scripts/lib/cloudflare-pages-contract.mjs`: `5c871f0d4114df3b9bfb02d8f61e9d5f8cea6872cdc73eaaae65ac4615749126`
- `scripts/lib/built-output-images.mjs`: `331a665caa1af48a5e995746df2026fdbccad0a15cc5a2dd367d9fa6d4d2b1d7`
- `tests/cloudflare-deploy-pipeline.test.mjs`: `30c1b19395202d338b333f8f76decb2b9a8b9af5292c61b5e9b3b8628e94844f`
- `tests/built-output-images.test.mjs`: `d9f1798a75afb6cf553ee7fa04b68bd5959732fbb4e7161ca7162e00073e927c`
- `README.md`: `abbcd95d0d66827fb8a59ad8f36960e60f7dd3c155afef083c5981d82ffef23c`

예외 및 handoff:

- 현재 저장소에는 유효한 `HEAD`가 없고 전체 파일이 untracked다. 이는 의도대로 배포 차단 상태다. 최초 커밋 후 깨끗한 작업 트리에서 각 사이트를 다시 빌드해야 schema v2 영수증이 배포 가능 상태가 된다.
- 기존 `dist/suwon/.baby-build.json`은 schema v1이고 이미지 파일도 누락되어 있으므로 재사용할 수 없다.

## 2026-08-19 — GA4 공개 저장소 하드닝

- GA4 계정 리소스의 하드코딩 기본값을 제거했다. `--account` 또는
  `BABY_GA4_ACCOUNT`가 반드시 필요하고, 값은 정확히 `accounts/<숫자 ID>`
  형식이어야 한다.
- 계정 누락·오형식은 자격 증명 파일 읽기와 외부 API 요청 전에 fail-closed로
  중단한다.
- dry-run JSON에서 서비스 계정 이메일 필드를 제거했다. 실제 적용 영수증은
  계속 ignored `artifacts/ga4/` 아래에만 기록한다.
- 실행 방법과 공개 저장소 제외 대상을 `docs/GA4.md`와 `.env.example`에
  기록했다.

검증 결과:

- `pnpm exec vitest run tests/ga4-public-config.test.mjs`: 1 file, 4 tests PASS.
- `pnpm exec eslint scripts/provision-ga4-properties.mjs scripts/lib/ga4-public-config.mjs tests/ga4-public-config.test.mjs`: PASS.
- 계정 미지정 실행: 예상대로 `BABY_GA4_ACCOUNT_REQUIRED`에서 종료 코드 1.
- `BABY_GA4_ACCOUNT=accounts/not-digits` 실행: 예상대로
  `BABY_GA4_ACCOUNT_INVALID`에서 종료 코드 1.

관련 파일 SHA-256:

- `scripts/provision-ga4-properties.mjs`: `0f5091013c625ff229f5ec1886bbf58376c7f8e19ed4e061c4f9b778b512d9bf`
- `scripts/lib/ga4-public-config.mjs`: `e468b92b300cf0a7dd1286ce8e7fea37d78e87fc3fab150ae2e9a36738d14a27`
- `tests/ga4-public-config.test.mjs`: `47860d39d072a1cd946c722883f25d8e9701f0eeb45bf01afb5568f59dcca9a2`
- `docs/GA4.md`: `c7df3a85bbd597b2e7df01cddc102b3212fc01b57ccdb1ed593221359b53bc2c`
- `.env.example`: `fb09a80d29268201e7d30d134017217041fb5c0230d7b97d312904ea0f6c43d7`

## 2026-08-19 — 공개 GitHub authority 및 clean-clone 하드닝

- 167개 생성 receipt의 workstation 절대 `sourceOutputPath`를 각 receipt의
  repo-relative `outputFile`로 deterministic 정규화했다. 원본 출력 SHA,
  prompt SHA, built-in 호출 참조, 검수 판정은 유지했다.
- replacement 24개의 job·receipt·manifest `sourceReceiptSha256`을 v1부터
  v5까지 계보 순서로 다시 결속했다. 167개 receipt, 24개 replacement job,
  replacement manifest를 합쳐 192개 파일이 바뀌었고, 즉시 재실행은
  `filesChanged: 0`이었다.
- 이후 selection 143개와 root review hash, 공개 파생 파일, release manifest를
  새 receipt SHA 기준으로 다시 만들었다. 기존 1차 release authority는 재사용하지
  않았다.
- 공개 테스트는 raw PNG/contact sheet를 읽지 않고 prompt·job·receipt·selection·
  root review·공개 WebP·provenance·release manifest를 검증한다. 공개 WebP에서
  canonical provenance와 release manifest를 다시 구성해 byte-identical임을
  확인한다.
- 오너 환경의 raw 테스트는 167개 PNG의 SHA·형식·치수와 contact sheet를 사용한
  release 재실행을 계속 검증한다. `BABY_IMAGE_REQUIRE_AUTHORING_RAW=1`이면 원본이
  없을 때 skip하지 않고 fail-closed한다.
- 신규 record 스크립트도 처음부터 외부 절대경로를 receipt에 쓰지 않는다.
- `.gitignore`는 `.env*` 전체(단 `.env.example` 허용), `.dev.vars*`, `.wrangler/`,
  `coverage/`, `*.log`를 추가 차단한다. 정확한 505개 authority force-add와
  194개 raw/contact PNG 제외 계약은 `docs/PUBLIC_REPOSITORY.md`에 기록했다.

검증 결과:

- `pnpm test:baby-images:portable`: 2 files, 5 PASS / 2 authoring-only SKIP.
- `pnpm test:baby-images:raw`: 2 files, 7 PASS.
- `pnpm test`: 15 files, 69 tests PASS.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- 공개 clone 모사(일반 670 + authority 505, raw/contact 0): test, typecheck,
  lint 모두 PASS.
- 공개 예정 1,175개/22.40 MiB 검사: 개인 절대경로, 이메일, 알려진 secret/token,
  과거 GA 계정 ID, 주민번호 패턴, symlink, world-writable, 10 MiB 초과,
  invalid JSON, 금지 파일 모두 0건.
- 공개 예정 최대 파일은 `src/data/city-regions.generated.json` 620,277 bytes다.
- 공개 고객 연락처 `0508-202-3906`은 제품 화면용 정본이며 개인 모바일 번호로
  분류하지 않았다.

관련 파일 SHA-256:

- `scripts/sanitize-baby-public-authority.mjs`: `f3b25ca8c99fc4c30d94b76763c249120ab8d7b3ac902cedf83de71d6fc84b9c`
- `scripts/record-baby-generated-image.mjs`: `609786e60136841a03865d8120fa539cbd1bbbe2a7ed785e30f5a108956d0090`
- `scripts/record-baby-replacement-image.mjs`: `0af8eca7f902194a0333833ab2e190a99c3ac3e8afa41e64ead26acc1aa8d355`
- `tests/baby-image-campaign.test.mjs`: `bdb55373d5939a831843d181d384e76b770461727a044468612026d4fca43771`
- `tests/baby-image-release-gate.test.mjs`: `e5639c84b5a71ca90be8ab6c063f22b1f8fd49c288b6bc07303eb9cde588c9e4`
- `docs/PUBLIC_REPOSITORY.md`: `7f8e5c5227548f8e001e7975043e4efebd7bb9d4fd5697fe1eaab97f86e170ea`
- `package.json`: `64291245bf2843dffcb656b1a6850d254926d8d59ae94d0bd686f565e78d78ce`
- `.gitignore`: `ae93d6ad18bf2c86a0cce8dea7b329dc3decd3e25f11b52ca6c0a374eebc437b`

## 2026-08-19 — 공개 전환 fail-closed 및 production browser 게이트

- 런타임 publication helper가 더 이상 파생 `origin`을 신뢰하지 않는다. 정확히
  `deploymentState=public`, `isPublic=true`, `indexingEnabled=true`, 유효한
  exact HTTPS `publicOrigin` 네 조건을 모두 만족할 때만 index/follow와 공개
  canonical을 반환한다. 나머지는 blocker 목록과 함께 사이트별 preview
  `.invalid`, `noindex,nofollow,nocache`로 고정된다.
- 3개 deployment state × 두 boolean flag × `null|valid publicOrigin`의 24개
  조합을 전수 검사했고 허용 조합은 정확히 1개다. HTTP, trailing slash, path,
  query, fragment, credentials, `.invalid`, 비 URL origin도 별도로 차단한다.
- Playwright 1.62.0과 대응 Chromium을 사용하는 production browser 게이트를
  추가했다. v1 고양, v2 안산, v3 화성, v4 부천, v5 성남, v6 수원의 홈,
  `/areas/`, 첫 구 지역 안내, 첫 말단을 desktop 1440×1000과 mobile 390×844의
  새 context에서 검사한다.
- 각 context는 Service Worker와 cache를 끄고 클릭·입력·hover 없이 load,
  font 준비, 단계별 scroll만 수행한다. Playwright request와 CDP initiator
  양쪽에서 `_rsc` query를 검사하며 HTTP/redirect, same-origin 실패,
  canonical·robots·H1·사이트/변형 식별자, 초기 HTML anchor와 각 대상의
  HEAD 200, 이미지 load, 가로 overflow를 fail-closed로 묶었다.
- `pnpm verify` 마지막 단계에 실제 browser gate를 포함했다. clean clone/CI는
  `pnpm install --frozen-lockfile`, `pnpm test:browser:install`, `pnpm verify`
  순서로 재현한다. Chromium 미설치 모사는 build 전에
  `BABY_BROWSER_CHROMIUM_MISSING`으로 예상 실패했다.

검증 결과:

- `pnpm install --frozen-lockfile`: PASS, lockfile 변경 없음.
- `CI=1 pnpm test`: 17 files, 82 tests PASS.
- `pnpm exec tsc --noEmit --incremental false`: PASS.
- `pnpm exec eslint .`: PASS.
- `pnpm test:browser:production`: 6 production exports, 48 browser checks PASS,
  Chromium `151.0.7922.34`, 자동 `_rsc` 0건, 문서·anchor·이미지 실패 0건.
- 첫 개발 실행은 raw `v1`과 DOM semantic `v1-center-chronicle` 비교 차이로
  즉시 중단됐다. 6개 semantic의 exact mapping을 계약에 추가한 뒤 최종 실행을
  처음부터 다시 수행해 전부 통과했다.
- public 이미지·이미지 authority·GA 운영 값·Cloudflare project·Git HEAD와
  index·commit·push·deploy는 변경하지 않았다. `.next/`와 `out/`만 검사용으로
  재생성됐으며 둘 다 ignored다.

관련 파일 SHA-256:

- `src/lib/metadata.ts`: `fd31c7e80226493fe9b985a16b71a7c9d7d1671355aa16e354c0897ad11acab3`
- `tests/publication-contract.test.ts`: `93769fd207ca2b4673d03d6f0f34b45097a31781819eee3d129dbdb47ab560c9`
- `scripts/lib/production-browser-contract.mjs`: `9b6e9bc1dfdc064083d95862bcff8b6071545dd51bc2bca971d805fd918354a2`
- `scripts/test-production-browser.mjs`: `16977d5241bd0d9d4cdc17ff090d0e63aa22daeac2c6595a7c445d0f0cb869f8`
- `tests/production-browser-contract.test.mjs`: `d2ea072284d56d0b0fbc73b224649cc43a66ff119c941c80cfab73662a62b714`
- `package.json`: `d358875c01d2268ef3dacb751e2e63074529f5ec3276f05c0aaf908295266238`
- `pnpm-lock.yaml`: `e34209ed678531d21826dd8aa03809058376a2939b9acbf7731efdf03c4d928a`
- `README.md`: `27479b167b853917e9f4e6fa750132ac29d1ab912d39864b86c60461d7ac0faa`
- `AGENTS.md`: `3222a74de03044c7fdfcb4a6fe1513f5c2ac591d1e5d8abe95faaed465e237e3`
