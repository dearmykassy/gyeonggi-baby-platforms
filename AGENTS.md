# 경기 베이비 플랫폼 작업 계약

이 저장소는 경기의 한 시·군만 담당하는 27개 독립 정적 플랫폼을 한 공용 엔진에서 생성한다. 오너 운영 환경에 별도로 보관된 `PLATFORM_PERMANENT_RULES.md`가 있으면 먼저 읽고 이 문서와 함께 적용한다.

- 전국 1,291개 지역을 생성하지 않는다. 각 빌드는 `BABY_SITE_KEY`가 지정한 한 시·군의 홈, 구 지역 안내, 동·읍·면 경로만 생성한다.
- 대상은 경기 31개 시·군에서 가평·이천·양평·여주를 제외한 정확히 27곳이며 연천은 포함한다.
- 고객 화면과 meta 3종에서 `수원시출장마사지`, `연천군출장마사지` 같은 공식 접미사를 쓰지 않고 `수원출장마사지`, `연천출장마사지`처럼 짧게 표시한다. 공식 행정명과 코드는 내부 그래프에서 보존한다.
- Template11은 시각 골격만 사용한다. 6개 기본 family 위에 palette·header/nav·hero·card·section rhythm·CTA·type scale·section order를 조합한 27개 lightweight profile을 명시적으로 결속한다. 시각 차이는 검색 고유성의 근거로 계산하지 않는다.
- 전화번호, 가격표, Q&A는 오너가 허용한 MassageBom 정본과 정확히 결속한다. 전체 가격표·전체 이용 절차·전체 FAQ는 고정 안내 경로에만 한 번 두고, 홈·구·동·읍·면 본문에는 실제 링크가 있는 짧은 요약만 둔다.
- 도시 홈은 시청·공식 기관 자료에서 확인한 지형·수계·철도·공원·생활권 사실을 주소 확인 문맥으로만 사용하고, `checkedAt`·공식 HTTPS URL·화면의 실제 출처 링크를 보존한다. 구·동·읍·면 본문은 이 도시 자료 가운데 현재 지역명·상위 구·확인된 법정 지역과 직접 맞는 항목만 결합하며, 맞는 항목이 없으면 도시 전체 설명 한 항목만 사용한다. 인기·도착시간·운영 가능성은 추정하지 않는다.
- 지역 디렉터리는 상세 본문의 마지막 일반 콘텐츠 섹션에 둔다. 말단은 상위 지역·같은 단계 실제 링크·행정동/법정동 연결·원래 표시 이름 등 검증 가능한 사실을 최소 3개, 실제 상위/관련/고정 안내 링크를 가능한 경우 최소 3개 제공한다. 목록 순서를 지리적 인접 관계로 표현하지 않는다.
- 지역 배너 원본은 최대 6개 경로에만 배정하며 부모·자식 동일 이미지와 인접 형제의 불필요한 연속 중복을 허용하지 않는다.
- 모든 마사지사 이미지는 성인 여성이다. 완전 착의, 비선정적 연출, 정상 해부, 문자·로고·워터마크 없음, 미성년자로 보이지 않음을 출시 전에 육안 검수한다.
- 홈·구·동·읍·면으로 이루어진 정확한 455개 regional canonical은 모두 색인 대상으로 삼고 각 도시 sitemap에 해당 도시의 regional canonical 전부를 포함한다. `/areas/`, `/pricing/`, `/guide/`, `/notice/`, `/blog/`와 글은 계속 200·self-canonical·`noindex,follow`이며 sitemap에서 제외한다. RSS는 URL 제출 목록으로 부풀리지 않고 공식 도시 자료를 담은 홈 editorial item 한 건만 유지한다.
- `SiteLink` 외 `next/link` 직접 사용을 금지하고 운영 자동 `_rsc` prefetch는 0이어야 한다. robots와 GA4 계측 경계도 모든 빌드에서 유지한다.
- 검색 공개는 런타임에서도 `deploymentState=public`, `isPublic=true`, `indexingEnabled=true`, 정확한 HTTPS `publicOrigin` 네 조건을 모두 요구한다. 혼합 상태나 `origin` 필드 우회는 preview `.invalid` canonical과 `noindex,nofollow`로 실패해야 하며 direct `pnpm build`도 예외가 아니다.
- 출시 전 Playwright production 게이트로 v1~v6 대표 사이트의 홈·지역 목록·구 지역 안내·말단을 desktop/mobile 새 context에서 무조작 load·scroll한다. 자동 `_rsc` query, HTTP/redirect, canonical·robots·H1, 초기 HTML anchor, 이미지·가로 overflow 중 하나라도 실패하거나 Chromium이 없으면 배포를 중단한다.
- sitemap `lastmod`는 실제 콘텐츠 revision으로 고정하고 빌드 시각을 사용하지 않는다. `changefreq`와 `priority`는 넣지 않는다.
- Google 소유확인 토큰은 공개 인증값으로 hosting provider별 정본 inventory에 고정하고, Naver 소유확인 토큰은 사이트별 정본 inventory에 고정하며 둘 다 각 사이트 홈 `<head>`에만 정확히 한 번 출력한다. 확인 이후에도 의도적으로 회전하기 전에는 제거하지 않고, 지역·고정 경로에는 복제하지 않는다.
- 베이비 27개 사이트의 Naver Search Advisor 외부 등록은 `DEFERRED — different owner account pending`이다. 기존 등록은 오너가 삭제했으므로 현재 메타 토큰이나 로그인 세션을 새 등록 권한으로 간주하지 않는다. 다른 오너 계정이 명시적으로 제공되기 전에는 소유확인, sitemap·RSS 제출, 수집 요청, 수집 주기 변경을 모두 금지한다. 이 상태는 Google Search Console 등록·진단과 별개다.
- 각 무료 호스트는 독립 HTTPS origin을 가져야 하며 실제 배포 origin이 확정되기 전에는 index/follow로 전환하지 않는다.
- 색인 대상 455개 regional document는 authored block scope를 `shared-service | local-substantive | directory`로 명시한다. `<지역> 출장마사지` H1/H2, 코스·가격, 24시간 전화, 여성 마사지사 방문, 위생, 현장후불, 이용 흐름처럼 실제로 같은 운영 사실은 짧은 `shared-service` 문형을 재사용할 수 있고 이를 억지로 다르게 쓰지 않는다. actual-render normalized word-trigram과 반복 block character share는 `local-substantive` 문단만 대상으로 검사하며 교차 사이트와 동일 사이트 안의 전체·페이지 종류별 비교를 모두 p95 0.45 미만·pair max 0.55 미만, 반복 block character share exact 0.25 이하·normalized 0.35 이하로 요구한다. `directory`는 유사도에서 제외하고 실제 링크 truth를 별도 검사한다. 이는 NAVER 공식 기준이나 순위 보장이 아니며, 인공적인 문구 회전·hash/path 기반 변형·route ordinal·기술 통계 filler로 수치를 낮추지 않는다.
- 고객 문구의 동적 지역명 뒤 조사는 종성 유무를 확인하는 공용 helper로 붙이고, 455개 렌더 문서 전체에서 잘못된 `을/를`, `은/는`, `이/가`, `과/와` 결합을 자동 검사한다.
- exact title·description·H1·document signature 충돌은 0을 유지한다. 브랜드·지역명 제거 후 normalized collision은 diagnostic이며, 색인 대상의 실제 렌더 본문 유사도와 repeated-share 게이트가 우선한다.
- 공용 파일을 수정할 때 27개 구성 전수 테스트를 통과시키고, 실행 결과·해시·예외를 `DIARY.md`에 남긴다.
