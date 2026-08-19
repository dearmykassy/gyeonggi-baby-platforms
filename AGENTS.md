# 경기 베이비 플랫폼 작업 계약

이 저장소는 경기의 한 시·군만 담당하는 27개 독립 정적 플랫폼을 한 공용 엔진에서 생성한다. 오너 운영 환경에 별도로 보관된 `PLATFORM_PERMANENT_RULES.md`가 있으면 먼저 읽고 이 문서와 함께 적용한다.

- 전국 1,291개 지역을 생성하지 않는다. 각 빌드는 `BABY_SITE_KEY`가 지정한 한 시·군의 홈, 구 허브, 대표 동·읍·면 경로만 생성한다.
- 대상은 경기 31개 시·군에서 가평·이천·양평·여주를 제외한 정확히 27곳이며 연천은 포함한다.
- 고객 화면과 meta 3종에서 `수원시출장마사지`, `연천군출장마사지` 같은 공식 접미사를 쓰지 않고 `수원출장마사지`, `연천출장마사지`처럼 짧게 표시한다. 공식 행정명과 코드는 내부 그래프에서 보존한다.
- Template11은 시각 골격만 사용한다. 6개 실질 변형을 결정적으로 배정하고, 단일 H1·접근성 드로어·정지 가능한 캐러셀·safe-area·반응형 이미지·실제 링크를 제공한다.
- 전화번호, 가격표, Q&A는 오너가 허용한 MassageBom 정본과 정확히 결속한다. 그 외 고객 문구는 신규 작성하고 전체 기존 플랫폼 및 다른 베이비 플랫폼과 교차 중복 감사를 통과한다.
- 지역 디렉터리는 상세 본문의 마지막 일반 콘텐츠 섹션에 둔다. 페이지마다 고유 meta title·keywords·description, H1, 실제 내부 링크, 충분한 지역별 본문을 제공한다.
- 지역 배너 원본은 최대 6개 경로에만 배정하며 부모·자식 동일 이미지와 인접 형제의 불필요한 연속 중복을 허용하지 않는다.
- 모든 마사지사 이미지는 성인 여성이다. 완전 착의, 비선정적 연출, 정상 해부, 문자·로고·워터마크 없음, 미성년자로 보이지 않음을 출시 전에 육안 검수한다.
- 모든 빌드는 canonical 전체를 담은 sitemap과 실제 편집 글만 담은 full-body RSS, robots, GA4 계측 경계를 포함한다. `SiteLink` 외 `next/link` 직접 사용을 금지하고 운영 자동 `_rsc` prefetch는 0이어야 한다.
- 검색 공개는 런타임에서도 `deploymentState=public`, `isPublic=true`, `indexingEnabled=true`, 정확한 HTTPS `publicOrigin` 네 조건을 모두 요구한다. 혼합 상태나 `origin` 필드 우회는 preview `.invalid` canonical과 `noindex,nofollow`로 실패해야 하며 direct `pnpm build`도 예외가 아니다.
- 출시 전 Playwright production 게이트로 v1~v6 대표 사이트의 홈·지역 목록·구 허브·말단을 desktop/mobile 새 context에서 무조작 load·scroll한다. 자동 `_rsc` query, HTTP/redirect, canonical·robots·H1, 초기 HTML anchor, 이미지·가로 overflow 중 하나라도 실패하거나 Chromium이 없으면 배포를 중단한다.
- sitemap `lastmod`는 실제 콘텐츠 revision으로 고정하고 빌드 시각을 사용하지 않는다. `changefreq`와 `priority`는 넣지 않는다.
- 각 무료 호스트는 독립 HTTPS origin을 가져야 하며 실제 배포 origin이 확정되기 전에는 index/follow로 전환하지 않는다.
- 공용 파일을 수정할 때 27개 구성 전수 테스트를 통과시키고, 실행 결과·해시·예외를 `DIARY.md`에 남긴다.
