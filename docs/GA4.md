# GA4 속성 프로비저닝

GA4 Admin API 작업은 계정 리소스를 코드에 저장하지 않습니다. 실행할 때
`BABY_GA4_ACCOUNT` 또는 `--account`로 `accounts/<숫자 ID>` 형식을 반드시
지정해야 하며, 누락되거나 형식이 다르면 외부 요청 전에 중단됩니다.

```bash
export BABY_GA4_ACCOUNT=accounts/123456789
export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json

# 읽기 전용 계획 확인. 서비스 계정 이메일은 출력하지 않습니다.
pnpm provision:ga4

# 검토한 계정에 실제 속성·스트림 생성
pnpm provision:ga4 -- --apply yes

# 환경 변수 대신 명령행에서 계정 지정
pnpm provision:ga4 -- --account accounts/123456789
```

예시의 숫자와 자격 증명 경로는 운영 값으로 교체합니다. 자격 증명 JSON,
`.env.local`, `artifacts/ga4/` 영수증은 저장소에 추가하지 않습니다.

## Workers 기본 URI 마이그레이션

Cloudflare Pages 대신 Workers Static Assets로 공개된 7개 사이트는 기존
속성·웹 스트림을 그대로 유지하면서 웹 스트림의 기본 URI만 실제
`workers.dev` 공개 원본으로 바꿉니다. 이 명령은 새 속성이나 스트림을
만들지 않으며, 실행 전에 27개 속성의 스트림 수·측정 ID·기존 URI와
향상된 측정의 히스토리 페이지뷰 상태가 모두 기대값인지 검사합니다.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json

# 읽기 전용 감사와 변경 계획 확인
pnpm migrate:ga4-worker-uris

# 감사에 통과한 Worker 스트림만 기본 URI 갱신 후 27개 전체 재조회
pnpm migrate:ga4-worker-uris -- --apply yes
```

쓰기 권한은 실행 시간에만 부여하고, 완료 직후 계정 액세스 관리에서
서비스 계정을 `뷰어`로 되돌린 뒤 다시 확인합니다.
