# 작업 일지

## 2026-08-19 — Workers 7개 GA4 웹 스트림 URI 교정

- 기존 27개 GA4 속성과 웹 스트림을 재사용했다. 새 속성·스트림 생성 없이
  Workers Static Assets로 공개된 7개 웹 스트림의 기본 URI만 실제
  `workers.dev` 공개 origin으로 PATCH했다. Pages 20개 URI는 변경하지 않았다.
- 적용 전후 27개를 재조회해 속성당 웹 스트림 1개, 로컬 측정 ID와의 일치,
  Workers 7개·Pages 20개 origin 정합성, 자동 히스토리 페이지뷰 0개를 확인했다.
- `migrate:ga4-worker-uris`는 감사 우선, exact-one-stream, provider별 URI,
  측정 ID, 향상된 측정을 모두 확인하고 일시 오류만 bounded retry한다.
  운영 자격 증명과 GA 식별자는 계속 ignored 파일에만 둔다.
- 검증: `pnpm test` 22 files / 138 tests, `pnpm typecheck`, `pnpm lint`,
  `git diff --check` 모두 PASS. 작업 후 서비스 계정은 `뷰어`로 확인했다.

## 2026-08-19 — Pages 20 + Workers 7 전체 공개 레지스트리

- 기존 20개 Pages 사이트는 정확한 `*.pages.dev` origin을 유지하고, Pages 생성
  제한을 받은 의왕·의정부·파주·평택·포천·하남·화성은 고정된
  `*.guncraft2000.workers.dev` origin으로 승격했다.
- 27개 모두 `public + isPublic=true + indexingEnabled=true`이며 `publicOrigin`은
  provider별 `hostingOrigin`과 정확히 같다. 따라서 각 사이트의 홈·구·대표
  동·읍·면 regional canonical은 모두 sitemap과 `index,follow` 대상이고,
  `/areas/`·가격·가이드·공지·블로그는 계속 `noindex,follow`다.
- registry와 build receipt가 provider와 origin을 함께 결속한다. Pages 배포기의
  `--site pages`는 20개만, Workers 배포기의 `--site workers|all`은 7개만 선택하며,
  다른 provider 사이트는 원격 호출 전에 거부한다.
- 인벤토리 digest는
  `sha256:0829a32bba7e9421e317cac402d588ae7806ee55837ae135f6d6c13cf1f893c8`로
  갱신했다. 이 단계에서는 commit·push·build·실배포를 수행하지 않았다.

## 2026-08-19 — Cloudflare Workers Static Assets 대체 호스팅 검증

- Pages 21번째 프로젝트 생성은 Cloudflare API `8000027` 제한으로 다시 실패했다.
- 나머지 7개는 별도 Worker 이름과 `*.guncraft2000.workers.dev` origin을 고정한
  fail-closed 배포 계약으로 분리했다. 산출물 receipt·Git SHA·파일 수/크기·실제
  canonical/robots/sitemap을 검증하지 않으면 배포가 실패한다.
- 임시 noindex 정적 Worker를 실제 생성해 홈 200, 미존재 경로 404를 확인한 뒤
  삭제했고, 재조회에서 `10007` 부재 응답을 확인해 orphan을 남기지 않았다.
- 최종 7개 이름은 nonpublic staging 배포로 먼저 생성·검증하고, 이후 실제 Worker
  origin을 registry에 승격한 clean commit을 다시 빌드·재배포한다.

## 2026-08-19 — 확인된 Cloudflare Pages 20개 공개 승격

- Wrangler 프로젝트 목록에서 실제 존재와 `*.pages.dev` hostname을 확인한 20개
  사이트만 `public + isPublic=true + indexingEnabled=true + publicOrigin`의 정확한
  공개 tuple로 승격한다.
- Cloudflare 신규 계정의 Pages 생성 제한으로 아직 프로젝트가 없는 의왕·의정부·
  파주·평택·포천·하남·화성 7개는 존재하지 않는 origin을 canonical로 주장하지 않고
  `planned + noindex,nofollow`를 유지한다.
- 한 인벤토리 안의 mixed 상태는 사이트별 네 조건을 독립 검증한다. 공개 20개는 각
  도시의 455 전체 인벤토리 중 자기 지역 canonical 전부를 sitemap에 넣고, 대기 7개는
  같은 콘텐츠가 준비돼 있어도 실제 HTTPS origin이 생기기 전까지 검색 공개하지 않는다.
- 이 기록 시점에는 생성 스크립트와 registry 계약만 변경하며, clean commit build와
  Cloudflare 재배포·라이브 robots/canonical/sitemap 검증은 다음 release 단계에서 한다.

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

## 2026-08-19 — Google Search Console 홈 메타 소유확인

- 로그인된 동일 Google 계정으로 고양·과천·광명 URL-prefix 속성을 생성해
  HTML 태그 방법을 직접 확인했고, 세 속성 모두 같은 공개 계정 토큰
  `3zM7…bfag`를 발급했다. 인증 토큰은 OAuth·쿠키·API 자격 증명이 아니며
  Google이 공개 HTML에서 읽어야 하는 값이다.
- 토큰을 deterministic city inventory의 각 사이트 정본 필드로 결속하고
  `Metadata.verification.google`을 통해 각 사이트 홈에만 출력한다. 지역·고정
  경로에는 복제하지 않는다.
- built-output audit는 홈 `<head>`의 exact 1개 토큰과 나머지 문서의 0개를
  attribute order와 무관하게 검사한다. 홈 sitemap `lastmod`만 실제 변경
  revision으로 갱신한다.
- inventory digest는
  `sha256:549bea2fa9653359110a811fba678e5ac7bd700d287a0b78b3abd3a1f6dc82cd`로
  변경됐다. 이전 build receipt는 의도적으로 무효이며 27개 전부 clean HEAD
  재빌드·재배포 후 Search Console 소유확인과 sitemap 제출을 수행한다.

## 2026-08-19 — Google 소유확인 토큰 provider 분리

- Cloudflare Pages URL-prefix 20개는 기존 Google 공개 토큰 `3zM7…bfag`로
  소유확인을 마쳤다. Workers Static Assets origin 가운데 의왕·의정부·파주에서
  별도 토큰 `7sch…EEtU`가 반복 발급된 사실을 직접 확인해, 정본을 사이트별
  추측값이 아니라 hosting provider별 두 값으로 분리했다.
- 생성기는 정확히 서로 다른 두 토큰의 형식을 먼저 검사하고, 20개 Pages에는
  Pages 토큰, 7개 Workers에는 Workers 토큰을 결속한다. `page.tsx`의 홈 전용
  `Metadata.verification.google`과 built-output의 홈 exact 1개·나머지 0개
  감사 계약은 그대로 유지했다.
- 홈 메타 revision은 `2026-08-19T18:38:55+09:00`, 새 inventory digest는
  `sha256:1733cde94bfcc0fb18652758cd07f6c75deeded0eaa1395c895d717097492eae`다.
  canonical, robots, 455개 regional sitemap, RSS, GA4, 콘텐츠·이미지 계약은
  변경하지 않았다.

검증 결과:

- 집중 테스트: 3 files, 16 tests PASS.
- 전체 테스트: 22 files, 139 tests PASS.
- `pnpm typecheck`, `pnpm lint`: PASS.
- `pnpm audit:copy`: PASS. 정본 8개와 exact/normalized 외부 충돌 0,
  공식 접미사 누출 0.
- `node --import tsx scripts/audit-naver-near-duplicates.mjs`: PASS.
  455개 실제 렌더, exact document/render/meta/H1 충돌 0, hard-gate 실패 0.
- loader 없이 실행한 첫 near-duplicate 명령은 TypeScript 경로 해석 오류로
  즉시 종료됐다. 저장소에 기록된 `--import tsx` 명령으로 다시 실행해
  제품 코드 변경 없이 통과했다.

관련 파일 SHA-256:

- `scripts/generate-city-inventory.mjs`:
  `c994e21c94c33d84508ff0c70f0a580beaaa02788fefad217ddef3992169cc81`
- `src/data/city-regions.generated.json`:
  `1a5dbc82ba545af3f2e4aa6c47e3e0e4a7b29cc579b8ccd397f31e439f3a7d89`
- `tests/site-registry.test.ts`:
  `ee02b7030b1502fb440b13043b747f8cb317cf7e5989e7a7fcab419a17676b1a`
- `src/lib/site-revisions.ts`:
  `1c62c1320f3de9e6517ef2189a5ff72d21deb023bda932d5d1d40ad2dd2ccdc6`
- `AGENTS.md`:
  `11ef1c7fb0d097339b73279765b99430cac56591533776b17277cec4edb60cc2`

## 2026-08-19 — Naver 사이트별 홈 소유확인 메타

- Search Advisor가 27개 개별 origin에 발급한 공개 토큰을 사이트별 정본
  inventory 필드로 추가했다. 27개 값은 모두 40자리 소문자 hex이고 서로
  달라야 하며, 생성기와 registry가 형식·누락·중복을 fail-closed로 검사한다.
- Next metadata는 기존 provider별 Google 토큰과 사이트별 Naver 토큰을 홈
  `<head>`에 각각 정확히 한 번만 출력한다. 지역 페이지와 noindex ancillary
  경로에는 어느 소유확인 태그도 복제하지 않는다.
- built-output audit는 두 태그를 attribute order와 무관하게 읽어 홈 exact
  1개·정본 content 일치·`<head>` 내부 존재와 모든 비홈 문서 0개를 검사한다.
  canonical, robots, 455개 regional sitemap, RSS, GA4, 콘텐츠·이미지 계약은
  변경하지 않았다.
- 홈 메타 revision은 `2026-08-19T18:49:10+09:00`, 새 inventory digest는
  `sha256:2d6a1d94f3f06519d568df4dd31252df2e7d1f8cb45deff04648b0ef7a6345b6`다.
  이전 build receipt는 의도적으로 무효이며 이 변경 HEAD로 27개 전부 다시
  빌드·배포한다.

검증 결과:

- 집중 테스트: 3 files, 16 tests PASS.
- 전체 테스트: 22 files, 139 tests PASS.
- `pnpm typecheck`, `pnpm lint`: PASS.
- `pnpm audit:copy`: PASS. 정본 8개와 exact/normalized 외부 충돌 0,
  공식 접미사 누출 0.
- `node --import tsx scripts/audit-naver-near-duplicates.mjs`: PASS.
  455개 실제 렌더, exact document/render/meta/H1 충돌 0, hard-gate 실패 0.
- 수원 clean-output 사전 빌드 감사에서 홈 Google/Naver 태그가 각각 `<head>`
  exact 1개이고 `/areas/`에는 둘 다 0개임을 확인했다.

관련 파일 SHA-256:

- `scripts/generate-city-inventory.mjs`:
  `f15a4a31e6a329d9f45ed6b151c7890c6b8eea3c8caaa233a9cf5d6cc88333f6`
- `src/data/city-regions.generated.json`:
  `a2c0dcfb69c7dd38842200afd3039c085f22e9b774fcdb673981be6fc82b7668`
- `src/data/site-registry.ts`:
  `b53bbe60f0bfce8174f61fa9f4bcb806cc575461fea2ccce0e1a4df3b9896ab2`
- `src/app/page.tsx`:
  `f9ca2c6133215ddb0d84e34086aeeb9af13596216ef17d88954acb4970bc7054`
- `scripts/audit-built-output.mjs`:
  `626dc5d0d8a898c65d82be61878e59d3c97ccaf71f654e1cffedbb142d74693a`
- `tests/site-registry.test.ts`:
  `fc594321500223515a31cfb79cb9fea8dec58c4c72a8ae7d9ba4bb73582872a9`
- `tests/discovery-files.test.ts`:
  `54a1a7aee945a3d490ebbacd24100c925fff445c3fa656ffa336783cf6f742ce`
- `src/lib/regions.ts`:
  `d2db0be47b956a435eaab2bcf8805f0597264ee02710ba6462d2bd2093c2a96c`
- `tests/region-inventory.test.ts`:
  `c254847240dbd2478dfac58eefd50850f0daff00792b19fc64a924f41508a53d`
- `src/lib/site-revisions.ts`:
  `6639883409e9b10f2d0692a81afc9a50f4b3b446a5ca1a024b85300a585ef4b7`
- `AGENTS.md`:
  `c7cc7eb74dbc6978e956443df6636ca110c29d2eaa5db96e7791c89466d911a2`

## 2026-08-19 — 455개 지역문서 서비스 의도 교정 및 등록 보류

- 마사지봄·마사지러브·건마에반하다 대표 지역문서와 콜미토닥이·랑테라피·
  필링홈타이 운영 정본을 비교했다. 채택한 흐름은 지역 출장마사지 의도, 고객
  지정 장소 방문, 코스·가격 정본 링크, 24시간 전화 준비, 현장 후불·카드,
  이용 흐름, 실제 관련 지역 링크다. 다중 H1, 주소 중심 첫 화면, 전체 가격표·
  FAQ 복제와 단순 문장 치환은 제외했다. 정본 문장 복사는 하지 않았다.
- 455개 regional 문서의 title 앞부분·H1·첫 100단어·H2 두 개에
  `<표시 지역명> 출장마사지`를 actual-render 기준으로 검사하고, description·
  hooks·FAQ와 화면 본문에 여성 마사지사 방문, 코스, 24시간 전화, 관리 후 현장
  결제 설명이 있는지 fail-closed로 검사한다.
- 행정안전부/한국지역정보개발원 주소DB `2026-07-31` 검증 표본과 공식
  `2026-07` 도로명 월전체 자료를 결합했다. 주소 표본 archive SHA-256은
  `da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9`,
  도로명 archive SHA-256은
  `9234d8ed1c2fa8bd13e18e5a4a5f66e9b5dea409421845ec77dd01a33e3f365f`다.
  404개 말단 모두 sourceCode·법정지역·시군구 join을 검증하고, 각 페이지의
  전화 예약 주소 준비 문단 한 곳에서 도로명 표기 세 개를 건물번호 작성 예시로만
  사용한다. 서비스 거점·인기·인접 주장과 정확한 건물번호·사적 주거 주소는 없다.
- 455개 actual-render 구조, keyword/service intent, 404개 도로 provenance,
  빈 링크·목록순서 filler·고객 비노출 기술문구는 실패 0이다. 반복 block share는
  exact `0.216296`, normalized `0.349520`으로 내부 한도를 통과했다. 교차 사이트
  전체 유사도는 p95 `0.418155`, max `0.524116`으로 통과했다.
- 동일 사이트 말단 중 검증 사실이 같은 쌍은 공식 도로명 세 개를 더해도 p95
  `0.559406`, max `0.832061`로 strict `0.45/0.55`를 통과하지 못했다. 구 페이지
  교차 p95도 `0.493750`이다. 임의 어휘 회전·path/hash·목록 순서 문구로 수치를
  낮추지 않았다. full Juso의 추가 독립 사실을 더 검증하거나 사실 등가 말단을
  noindex/통합하기 전에는 출시 게이트가 계속 FAIL이며 배포하면 안 된다.
- Naver 외부 작업 상태는 `DEFERRED — different owner account pending`이다.
  오너가 기존 등록을 삭제했으므로 소유확인·sitemap·RSS·수집 요청·수집 주기
  변경은 0건이며 다른 오너 계정 제공 전까지 금지한다.
- Google Search Console은 별도 상태다. 읽기 전용 확인에서 27개 속성과 sitemap
  제출이 존재했고 Workers 7개는 성공, Pages 20개는 `가져올 수 없음`으로 보였다.
  같은 Pages sitemap의 Googlebot 직접 요청은 HTTP 200 `application/xml`이었다.
  이번 콘텐츠 작업에서 Google 외부 상태 변경도 0건이다.

## 2026-08-20 — 공통 운영문과 지역 고유 본문의 감사 범위 분리

- 오너가 `<지역> 출장마사지`, 코스·가격, 예약, 여성 마사지사 방문, 위생,
  현장후불, 이용 흐름 같은 H1·H2와 운영 안내는 플랫폼 수가 늘어도 어느 정도
  같은 문형을 유지해야 한다고 명시했다. 공통 운영 사실까지 억지로 다르게 쓰는
  방식은 문장 품질을 해치므로 영구 금지했다.
- 지역 섹션은 `shared-service | local-substantive | directory` scope로 구분한다.
  공통 운영 블록은 실제 서비스 계약을 별도로 검사하고, 엄격한 p95 `0.45`·pair
  max `0.55`·반복 exact `0.25`·normalized `0.35` 검사는 검증된 지역 고유
  문단에만 적용한다. 전체 문서·title·description·H1 exact 충돌 0과 455개
  canonical·index·sitemap 계약은 그대로 유지한다.
- 경기 베이비 플랫폼 Naver 외부 작업은 계속
  `DEFERRED — different owner account pending`이며, 새 오너 계정이 제공되기
  전까지 소유확인·sitemap·RSS·수집 요청은 수행하지 않는다.

최종 구현 및 검증:

- 위 범위 분리는 직전의 공통 운영문 포함 전체 문서 유사도 실패 판정을 대체한다.
  455개 문서는 공통 `출장마사지 서비스 안내`, `코스별 가격`, 24시간 전화,
  여성 마사지사 방문·위생, 현장후불, 이용 흐름을 일관된 짧은 문형으로 제공하고,
  지역별 3개 `local-substantive` 섹션과 실제 지역 링크 `directory`를 별도로 둔다.
- 행정안전부/한국지역정보개발원 주소DB 전국 전체분 2026-07-31 정본에서
  404개 말단에 공공시설-행정동-도로명-법정지역 관계 2,325건을 결속했다.
  route별 3~6건이며 하남 초이동만 검증된 시설 2건과 별도 도로·법정지역 사실로
  보완한다. 원본 archive SHA-256은
  `da5c4007d696bf98f066b3832b53dc1f95d85b32fe1c479b7be79c42b3c6c1d9`,
  공개 데이터 digest는
  `sha256:cfee0fa7239df1d1422af491b46e7f44130818117986c98edc9c72bc0888afa2`다.
  주거·민간업체·종교·의료·숙박·소매·개인정보 명칭은 생성 단계와 테스트에서
  차단하며 시설은 서비스 장소가 아니라 주소 확인용 공개 기준점으로만 설명한다.
- 최종 actual-render 전수 감사 결과 regional/indexable/sitemap은 모두 455개다.
  authored DOM trace는 455/455, 지역 고유 문단은 3,098개이며 source와 DOM의
  scope·문단 순서·fact reference가 정확히 일치한다. 지역 고유 문단
  word-trigram은 교차 사이트 p95 `0.295181`, max `0.467456`, 동일 사이트 p95
  `0.318182`, max `0.447059`이다. 구 페이지도 교차 p95/max
  `0.350993/0.373494`, 동일 사이트 `0.360000/0.362500`으로 strict 기준을
  통과했다. 지역 고유 문단 반복 비중은 exact/normalized max 모두 `0`이다.
  404개 말단의 시설명-정확 도로명 동일 문단 결속과 명시 도로 reference
  1,870/1,870이 통과했고 scope escape·정확 주소 노출·canonical·robots·sitemap·
  외부 8개 정본 중복 실패는 모두 0이다.
- 홈·구·말단 regional route group의 sitemap `lastmod`를 최종 안정 편집시각
  `2026-08-20T02:14:17+09:00`로 함께 갱신하고 테스트에 exact pin했다. build
  시각이나 요청 시각으로 매번 바뀌지 않는다.
- `pnpm test` 25 files / 155 tests, `pnpm typecheck`, warning 0 full lint,
  `audit:copy`, full near-duplicate audit, portable image 5 PASS/2 SKIP,
  raw image 7 PASS, generator `--check`, `git diff --check`를 모두 통과했다.
- 이 단계에서는 build·commit·push·deploy 및 Naver 외부 작업을 수행하지 않았다.

## 2026-08-20 — 마사지봄 정본 기준 지역 meta 8종 복구

- 오너 지적에 따라 마사지봄 매탄동 운영 HTML과 베이비 수원 매탄동 운영 HTML의
  `<title>`, description, keywords를 직접 대조했다. 마사지봄은 지역별
  `출장마사지`, `출장안마`, `출장타이마사지`, `출장스웨디시`, `출장홈타이`,
  `토닥이`, `남성전용마사지`, `여성전용마사지` 8종과 첫 두 핵심어 title을
  사용하지만, 베이비는 `지역 안내`, route kind, `현장후불`이 섞인 임의 5종과
  `동 지역 안내` title을 사용하고 있었다.
- 베이비 regional meta를 마사지봄의 오너 승인 구조로 복구했다. title은
  `<표시지역>출장마사지 <표시지역>출장안마 | <브랜드>`, keywords는 위 8종 exact
  order, description은 두 핵심어·코스별 이용시간·24시간 전화·선입금 없는
  현장결제를 포함한다. H1·본문의 공백 포함 `<표시지역> 출장마사지` 계약과
  지역 고유 본문 scope는 변경하지 않는다.
- 사용자 요청에 따라 공용 소스를 먼저 고정한 뒤 수원·오산·용인 세 플랫폼을
  우선 빌드·배포·라이브 검사하고, 나머지 24개를 이어서 배포한다. Naver 외부
  작업은 계속 `DEFERRED — different owner account pending`으로 둔다.
