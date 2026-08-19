# 경기 베이비 플랫폼

Template11의 시각 구조를 기반으로 경기 27개 시·군별 독립 플랫폼을 생성하는 공용 Next.js 정적-export 엔진입니다.

각 빌드는 한 도시의 홈과 실제 구·동·읍·면 경로만 포함합니다. 전국 1,291개 지역을 각 사이트에 복제하지 않습니다. 운영 origin이 확정되기 전에는 프리뷰 canonical과 검색 차단을 유지합니다.

Template11의 6개 기본 family 위에는 도시별 27개 lightweight design profile이
있습니다. palette·header/nav·hero·card·section rhythm·CTA·type scale·section
order 조합은 도시마다 다르지만, 이 시각 차이를 SEO 고유성으로 간주하지 않습니다.
검색 대상 홈 본문은 공식 도시 자료에서 확인한 지형·수계·철도·공원·생활권
사실을 주소 확인 문맥으로 작성하고 화면에 실제 출처 링크를 제공합니다.

검색 인벤토리는 27개 도시의 홈 27개, 구 24개, 대표 동·읍·면 404개로 합계
455개 regional canonical입니다. 공개 tuple을 충족한 사이트에서는 해당 도시의
regional canonical 전부가 `index,follow`와 self-canonical을 받고 sitemap에도
모두 들어갑니다. `/areas/`, 가격·이용 방법·공지·블로그 경로는 200과
self-canonical을 유지하되 `noindex,follow`이며 sitemap에서 제외합니다. RSS는
지역 URL을 455건 복제하지 않고 공식 도시 자료가 담긴 홈 editorial item 한 건만
유지합니다. 전체 가격표·절차·FAQ는 고정 안내 경로에만 두고 지역 본문에서는 해당
경로로 연결하는 짧은 요약만 제공합니다.

구·동·읍·면 본문은 committed 지역 graph의 상위·같은 단계 실제 링크,
원래 표시 이름, 법정 지역 관계와 현재 지역에 직접 맞는 공식 도시 fact만 사용합니다.
지역 목록의 앞뒤 표시는 화면 목록 순서이며 지리적 인접 관계로 표현하지 않습니다.
모든 동적 지역명 뒤 한국어 조사는 종성 helper와 455개 전수 렌더 테스트로 확인합니다.

중복 감사는 교차 사이트와 동일 사이트 안의 전체·페이지 종류별 비교를 모두
p95 0.45 미만·pair max 0.55 미만으로 봅니다. 반복 본문은 exact 0.25 이하,
normalized 0.35 이하입니다. 모두 내부 출시 휴리스틱이며 NAVER의 공식 임계값이나
상위 노출 보장이 아닙니다. 경로 hash, route ordinal, 문장 순서 섞기, 어휘 회전,
의미 없는 표현으로 수치를 맞추거나 임계값을 완화하지 않습니다.

```bash
pnpm install
BABY_SITE_KEY=suwon pnpm dev
BABY_SITE_KEY=suwon pnpm build
pnpm build:all
```

`pnpm build`를 직접 실행해도 검색 공개 여부는 런타임의 네 조건을 모두
통과해야 합니다. `deploymentState=public`, `isPublic=true`,
`indexingEnabled=true`, 경로·query·인증정보가 없는 정확한 HTTPS
`publicOrigin` 중 하나라도 어긋나면 `origin` 필드 값과 관계없이
`*.preview.gyeonggi-baby.invalid` canonical과 `noindex,nofollow`로
내보냅니다. 배포 영수증이 필요한 공식 빌드는 계속 `pnpm build:site`를
사용합니다.

무료 배포는 Cloudflare Pages Direct Upload를 사용하며, 도시별 정적 결과물을 별도 `*.pages.dev` 프로젝트로 배포합니다. 현재 실제 생성·검증된 20개 Pages 프로젝트만 public canonical과 `index,follow`로 승격했고, Cloudflare 신규 계정 프로젝트 생성 제한에 걸린 나머지 7개는 실제 HTTPS origin이 생길 때까지 preview canonical과 `noindex,nofollow`를 유지합니다.

## Cloudflare Pages 배포 안전 절차

배포 스크립트는 인벤토리의 정확히 27개 `projectName`과
`https://<projectName>.pages.dev` 매핑을 먼저 검증합니다. `planned` 또는
`preview` 사이트는 `--allow-nonpublic yes`를 명시하지 않으면 배포하지 않으며,
공개 상태 플래그가 서로 어긋난 사이트는 이 옵션으로도 우회할 수 없습니다.

배포할 소스는 먼저 커밋되어 있어야 하고 작업 트리가 깨끗해야 합니다. 그 상태에서
사이트를 다시 빌드해야 현재 Git SHA, 인벤토리 해시, 정적 파일 해시를 결속한
schema v2 `.baby-build.json`이 생성됩니다. 이전 schema v1 영수증이나 빌드 후
변경된 정적 파일은 거부됩니다.

```bash
node scripts/build-site.mjs --site suwon

# Cloudflare 호출·프로젝트 생성·파일 기록 없이 전체 27개 사전 검사
node scripts/deploy-cloudflare-pages.mjs \
  --site all \
  --allow-nonpublic yes \
  --dry-run yes

# 이미 생성된 단일 프로젝트에 실제 배포
node scripts/deploy-cloudflare-pages.mjs \
  --site suwon \
  --allow-nonpublic yes
```

프로젝트 생성은 외부 상태를 바꾸므로 검토 후에만
`--create-projects yes`를 추가합니다. 실제 배포에는 Wrangler의 boolean 인자를
정확히 `--commit-dirty=false`로 전달합니다. 성공 영수증은
`artifacts/deployments/cloudflare-pages.latest.json`에 원자적으로 기록되고,
dry-run은 파일을 쓰지 않습니다.

정적 산출물 감사는 각 sitemap 페이지의 모든 베이비 이미지 `src`와 `srcset`
후보를 검사합니다. 다른 도시 이미지, 누락·빈 파일, symlink, 이미지가 0개인
빌드는 배포용 빌드 영수증을 만들기 전에 차단됩니다.

## Production 브라우저 출시 게이트

Playwright와 Chromium은 고정된 Node 패키지 버전으로 실행합니다. 새 clone이나
CI에서는 의존성 설치 뒤 브라우저를 명시적으로 준비합니다.

```bash
pnpm install --frozen-lockfile
pnpm test:browser:install
pnpm test:browser:production
```

게이트는 Template11 v1~v6에서 구 지역 안내가 있는 대표 사이트를 한 곳씩 골라
각 사이트의 홈, `/areas/`, 구 지역 안내, 대표 말단을 1440px desktop과 390px
mobile의 새 브라우저 context로 검사합니다. 캐시와 Service Worker를 끄고,
클릭·입력·hover 없이 최초 load와 단계별 scroll만 수행합니다.

다음 중 하나라도 발생하면 종료 코드 1로 실패합니다.

- request URL query에 `_rsc`가 한 건이라도 있음
- 문서 또는 same-origin 자원의 실패·4xx·5xx
- redirect, canonical·robots·단일 H1·사이트/변형 식별자 불일치
- 초기 HTML의 필수 내부 `<a href>` 누락, 빈 링크, query 링크, 200이 아닌 대상
- 깨진 이미지 또는 대표 viewport의 가로 overflow
- Playwright가 요구하는 Chromium이 설치되지 않음

`pnpm verify`는 빠른 테스트·typecheck·lint 뒤 이 production 브라우저 게이트까지
실행하므로, CI에서도 먼저 `pnpm test:browser:install`을 수행해야 합니다.
