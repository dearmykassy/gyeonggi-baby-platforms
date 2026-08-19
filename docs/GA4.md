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
