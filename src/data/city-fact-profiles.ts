import type { BabySiteKey } from "@/data/site-registry";

export type CityFactSection = Readonly<{
  id: string;
  heading: string;
  paragraphs: readonly [string, string];
}>;

export type CityOfficialSource = Readonly<{
  label: string;
  url: `https://${string}`;
}>;

export type CityFactProfile = Readonly<{
  siteKey: BabySiteKey;
  checkedAt: "2026-08-19";
  heading: string;
  paragraphs: readonly [string, string];
  addressAxes: readonly [string, string, string, ...string[]];
  sections: readonly [
    CityFactSection,
    CityFactSection,
    CityFactSection,
    CityFactSection,
  ];
  sources: readonly [CityOfficialSource, ...CityOfficialSource[]];
}>;

function profile(value: CityFactProfile): CityFactProfile {
  return Object.freeze({
    ...value,
    paragraphs: Object.freeze([...value.paragraphs]) as CityFactProfile["paragraphs"],
    addressAxes: Object.freeze([...value.addressAxes]) as CityFactProfile["addressAxes"],
    sections: Object.freeze(
      value.sections.map((section) =>
        Object.freeze({
          ...section,
          paragraphs: Object.freeze([...section.paragraphs]) as CityFactSection["paragraphs"],
        }),
      ),
    ) as CityFactProfile["sections"],
    sources: Object.freeze(value.sources.map((source) => Object.freeze({ ...source }))) as CityFactProfile["sources"],
  });
}

const PROFILES: readonly CityFactProfile[] = [
  profile({
    siteKey: "goyang",
    checkedAt: "2026-08-19",
    heading: "한강과 창릉천을 기준으로 보는 고양 주소",
    paragraphs: [
      "행주산성·창릉천·북한산 쪽과 일산호수공원·킨텍스 쪽을 함께 아우르므로 구와 도로명을 먼저 확인합니다.",
      "덕양구, 일산동구, 일산서구 중 어느 구인지 적고 주소에 해당하는 하천·공원·시설 이름을 보조 기준으로 붙여 주세요.",
    ],
    addressAxes: ["행주산성·한강", "창릉천·북한산", "일산호수공원·킨텍스"],
    sections: [
      { id: "haengju-changneung", heading: "행주산성과 창릉천 쪽 주소", paragraphs: ["덕양구 주소는 행주산성·한강 쪽인지 창릉천·북한산 쪽인지부터 확인합니다.", "도로명과 함께 표시되는 하천 또는 산 이름을 받으면 덕양구 안에서도 기준이 분명해집니다."] },
      { id: "ilsan-lake-kintex", heading: "일산호수공원과 킨텍스 주변", paragraphs: ["일산 주소는 호수공원·장항습지·킨텍스 가운데 주소와 맞는 기준점을 함께 적어 두면 좋습니다.", "일산동구와 일산서구를 먼저 구분한 뒤 동 이름과 건물명을 확인합니다."] },
      { id: "three-districts", heading: "세 구를 먼저 나누는 주소 순서", paragraphs: ["덕양구, 일산동구, 일산서구는 같은 시 안에서도 주소 단계가 따로 이어집니다.", "구 이름을 생략하지 않고 도로명·건물명까지 순서대로 알려 주세요."] },
      { id: "river-mountain-axis", heading: "한강과 북한산 사이의 기준점", paragraphs: ["남쪽 한강 변과 동쪽 북한산 자락은 서로 다른 방향의 주소를 가리키는 기준점입니다.", "행주·창릉·일산 가운데 주소에 맞는 생활권을 먼저 말한 뒤 상세 주소를 확인합니다."] },
    ],
    sources: [
      { label: "고양시 일반현황", url: "https://www.goyang.go.kr/www/www05/www05_1/www05_1_1.jsp" },
      { label: "고양시 하천 지도", url: "https://www.goyang.go.kr/resources/www/pdf/content/pdf-life-rivermap_2020.pdf" },
    ],
  }),
  profile({
    siteKey: "gwacheon", checkedAt: "2026-08-19",
    heading: "관악산과 청계산 사이에서 찾는 과천 주소",
    paragraphs: ["관악산·청계산을 양쪽 기준으로 두고 정부과천청사, 서울대공원, 국립현대미술관 주변 주소를 나눠 봅니다.", "시설 이름만으로 행정동을 정하지 않고 동·도로명·건물명을 함께 확인합니다."],
    addressAxes: ["관악산·정부과천청사", "청계산·과천향교", "서울대공원·국립현대미술관"],
    sections: [
      { id: "government-complex", heading: "정부과천청사 주변 주소", paragraphs: ["청사 주변은 중앙동·별양동과 큰길 이름을 함께 확인하는 도심 주소권입니다.", "청사 건물명만 적지 말고 동과 도로명을 붙여 주세요."] },
      { id: "grand-park-museum", heading: "서울대공원과 국립현대미술관 쪽", paragraphs: ["대공원·미술관 주변은 공원 진입로와 막계동 등 세부 지명이 주소 단서가 됩니다.", "시설 이름에 주차장·도로명·건물명을 더해 위치를 확인합니다."] },
      { id: "gwanaksan", heading: "관악산 자락의 주거 주소", paragraphs: ["관악산 쪽 주거지는 문원·부림·중앙 생활권을 기준으로 주소를 살핍니다.", "산 이름은 방향 설명에만 쓰고 실제 동과 번지 또는 도로명을 먼저 받습니다."] },
      { id: "cheonggyesan-hyanggyo", heading: "청계산과 과천향교 쪽 주소", paragraphs: ["청계산·과천향교는 동쪽과 구도심 주소를 설명할 때 쓰는 기준점입니다.", "주소에 맞는 지하철역과 도로명을 함께 적으면 시설명이 같은 장소를 피할 수 있습니다."] },
    ],
    sources: [{ label: "과천시 공식 안내", url: "https://www.gccity.go.kr/dept/main.do" }],
  }),
  profile({
    siteKey: "gwangmyeong", checkedAt: "2026-08-19",
    heading: "KTX광명역과 안양천으로 나누는 광명 주소",
    paragraphs: ["KTX광명역·소하권, 철산·광명사거리권, 광명동굴·구름산권을 주소 기준점으로 사용합니다.", "역이나 시설 이름 뒤에 동·도로명·건물명을 이어 적어 주세요."],
    addressAxes: ["KTX광명역·소하", "철산·광명사거리·안양천", "광명동굴·구름산"],
    sections: [
      { id: "ktx-soha", heading: "KTX광명역과 소하권 주소", paragraphs: ["KTX광명역 주변은 소하·일직 쪽 동 이름과 역세권 도로명을 함께 확인합니다.", "역 이름만 적지 말고 출입구 주변 건물이나 도로명을 덧붙여 주세요."] },
      { id: "cheolsan-anyangcheon", heading: "철산과 안양천 주변 주소", paragraphs: ["철산 생활권은 안양천과 철산역을 기준으로 동·도로명을 확인합니다.", "하천 쪽인지 상업지구 쪽인지 건물명을 같이 받습니다."] },
      { id: "gwangmyeong-market", heading: "광명사거리와 전통시장 쪽", paragraphs: ["광명사거리·광명전통시장 주변은 광명동의 세부 도로를 먼저 보는 주소권입니다.", "시장 이름보다 도로명과 건물번호를 우선 확인해 주세요."] },
      { id: "cave-gureumsan", heading: "광명동굴과 구름산 방향", paragraphs: ["광명동굴·구름산·가학산은 서남쪽 주소를 설명하는 지형 기준점입니다.", "가학·노온사 등 세부 지명과 진입 도로를 함께 알려 주세요."] },
    ],
    sources: [
      { label: "광명시 KTX광명역 안내", url: "https://www.gm.go.kr/pt/partInfo/tf/gmktx.jsp" },
      { label: "광명시 관광 안내", url: "https://www.gm.go.kr/tour/gmNine/nine01.jsp" },
    ],
  }),
  profile({
    siteKey: "gwangju-gyeonggi",
    checkedAt: "2026-08-19",
    heading: "남한산성과 팔당호 사이의 광주 주소",
    paragraphs: ["남한산성, 경안천, 곤지암, 남종·팔당호 수변처럼 서로 떨어진 기준점으로 주소 범위를 확인합니다.", "읍·면·동과 함께 확인되는 하천·산성·수변 지명을 덧붙이면 같은 이름의 다른 지역과 구분하기 좋습니다."],
    addressAxes: ["남한산성", "경안천", "곤지암", "남종·팔당호"],
    sections: [
      { id: "namhansanseong", heading: "남한산성 생활권의 주소", paragraphs: ["남한산성 주변은 산성 진입로와 면·동 이름을 함께 봐야 하는 주소권입니다.", "산성 쪽이라는 설명에 도로명이나 해당 마을 이름을 더해 주세요."] },
      { id: "gyeongan-stream", heading: "경안천을 따라 확인하는 도심 주소", paragraphs: ["경안천은 광주 도심과 여러 동을 잇는 수변 기준점으로 지도에 표시됩니다.", "하천의 어느 쪽인지 단정하기보다 동 이름과 교량·도로명을 같이 확인합니다."] },
      { id: "paldang-waterfront", heading: "남종과 팔당호 수변 주소", paragraphs: ["남종면 일대는 팔당호 수변 지명이 주소 확인에 직접 도움이 되는 곳입니다.", "면·리 이름과 해당 수변 도로를 적어 도심 주소와 섞이지 않게 합니다."] },
      { id: "gonjiam", heading: "곤지암과 동남쪽 읍면권", paragraphs: ["곤지암을 기준으로 보는 주소는 시내 동 지역과 다른 읍·면 단계로 이어집니다.", "읍·면, 리, 도로명 순서로 알려 주면 정확한 주소를 확인할 수 있습니다."] },
    ],
    sources: [
      { label: "광주시 관광 안내 지도", url: "https://www.gjcity.go.kr/foreign/en/img/2024%2B%EA%B4%91%EC%A3%BC%2B%EB%A7%9B%EC%A7%80%EB%8F%84.pdf" },
      { label: "광주시 공식 안내", url: "https://www.gjcity.go.kr/portal/bbs/view.do?bIdx=342854&mId=0203010000&ptIdx=22" },
    ],
  }),
  profile({
    siteKey: "gimpo",
    checkedAt: "2026-08-19",
    heading: "한강하구와 아라뱃길로 구분하는 김포 주소",
    paragraphs: ["문수산·한강하구 쪽, 대명항 쪽, 아라뱃길·아라마리나 쪽을 각각 주소 기준으로 삼습니다.", "읍·면·동, 도로명과 함께 주소에 적힌 수변·항구·산 이름을 전달해 주세요."],
    addressAxes: ["문수산·한강하구", "대명항", "아라뱃길·아라마리나"],
    sections: [
      { id: "munsu-estuary", heading: "문수산과 한강하구 쪽 주소", paragraphs: ["문수산과 한강하구는 북부 읍·면 주소를 확인할 때 쓰는 지형 기준입니다.", "읍·면과 리 이름 뒤에 해당 산이나 하구 지명을 덧붙여 주세요."] },
      { id: "daemyeong-port", heading: "대명항과 서해 쪽 주소", paragraphs: ["대명항 주변은 항구·해안 도로 이름이 주소 확인에 필요한 단서가 됩니다.", "항구 이름만 적지 말고 대곶·통진 등 해당 읍·면과 도로명을 같이 확인합니다."] },
      { id: "ara-waterway", heading: "아라뱃길과 아라마리나 주변", paragraphs: ["아라뱃길·아라마리나는 남부 도시권에서 수변 방향을 알려 주는 기준점입니다.", "고촌·풍무·사우 등 동네 이름과 해당 교량이나 큰길을 함께 적어 주세요."] },
      { id: "north-south-order", heading: "북부와 남부 주소를 섞지 않는 순서", paragraphs: ["한강하구·문수산권과 아라뱃길권은 같은 시 안에서도 확인할 지명이 다릅니다.", "먼저 읍·면·동을 고르고, 그다음 도로명과 건물명을 확인합니다."] },
    ],
    sources: [
      { label: "김포시 공식 안내 지도", url: "https://m.gimpo.go.kr/site/portal/images/contents/cts7619_file01_202512.pdf" },
      { label: "김포시 문화관광", url: "https://gimpo.go.kr/culture/contents.do?key=6883" },
    ],
  }),
  profile({
    siteKey: "guri", checkedAt: "2026-08-19",
    heading: "아차산에서 왕숙천과 한강으로 이어지는 구리 주소",
    paragraphs: ["아차산·망우산, 왕숙천, 한강을 잇는 축이 갈매·인창·교문·수택 주소를 확인하는 기준이 됩니다.", "동 이름과 도로명을 먼저 적고 산·하천·문화유산 이름은 보조 기준으로 사용합니다."],
    addressAxes: ["아차산·망우산", "왕숙천", "한강시민공원", "동구릉·갈매"],
    sections: [
      { id: "achasan-mangusan", heading: "아차산과 망우산 쪽 주소", paragraphs: ["아차산·망우산 자락은 교문·인창 쪽 주소를 설명하는 산 기준입니다.", "등산로 이름 대신 동과 도로명, 해당 건물을 먼저 확인합니다."] },
      { id: "wangsukcheon", heading: "왕숙천을 따라 보는 주소", paragraphs: ["왕숙천은 갈매·사노에서 도심 생활권으로 이어지는 하천 기준점입니다.", "하천의 어느 구간인지 동 이름과 교량 또는 큰길을 함께 적어 주세요."] },
      { id: "hangang-park", heading: "한강시민공원 주변 주소", paragraphs: ["한강 쪽 주소는 토평·수택과 강변 도로를 함께 봅니다.", "공원 이름만으로 끝내지 말고 동과 도로명을 붙여 주세요."] },
      { id: "donggureung-galmae", heading: "동구릉과 갈매 생활권", paragraphs: ["동구릉과 갈매역은 북동쪽 주소를 확인할 때 서로 다른 기준점입니다.", "문화유산 또는 역 이름에 실제 방문 건물명을 더해 위치를 좁힙니다."] },
    ],
    sources: [
      { label: "구리시 문화관광", url: "https://www.guri.go.kr/culture/contents.do?key=1199" },
      { label: "구리시 일반현황", url: "https://www.guri.go.kr/www/contents.do?key=3452" },
    ],
  }),
  profile({
    siteKey: "gunpo", checkedAt: "2026-08-19",
    heading: "수리산과 금정역을 함께 보는 군포 주소",
    paragraphs: ["산본·금정의 도심 주소와 대야미·부곡 쪽 주소는 수리산과 철도역을 기준으로 확인합니다.", "역 이름 뒤에 행정동·도로명·건물명을 붙여 최종 주소를 확인합니다."],
    addressAxes: ["수리산·산본", "금정역·군포역·당정역", "대야미·부곡"],
    sections: [
      { id: "sanbon-surisan", heading: "산본역과 수리산 사이", paragraphs: ["산본 생활권은 산본역·수리산역과 수리산 자락을 함께 기준으로 봅니다.", "역 출구보다 동과 도로명, 단지명을 먼저 알려 주세요."] },
      { id: "geumjeong-dangjeong", heading: "금정역과 당정 쪽 주소", paragraphs: ["금정·당정 주소는 금정역, 군포역, 당정역 중 주소에 맞는 철도 기준을 확인합니다.", "역 이름 뒤에 동과 도로명을 이어 적어 주세요."] },
      { id: "daeyami-bugok", heading: "대야미와 부곡 생활권", paragraphs: ["대야미·부곡 쪽은 대야미역과 부곡지구를 기준으로 주소를 살핍니다.", "대야동·송부동 같은 행정동과 법정동 이름을 함께 확인합니다."] },
      { id: "admin-legal-names", heading: "행정동과 법정동을 같이 보기", paragraphs: ["군포1동·군포2동처럼 행정동 하나가 여러 법정동을 품는 주소가 있습니다.", "예약 메모에는 행정동만 쓰지 말고 도로명과 건물번호를 함께 남겨 주세요."] },
    ],
    sources: [
      { label: "군포시 수리산 도립공원 지정배경", url: "https://www.gunpo.go.kr/www/contents.do?key=3960" },
      { label: "군포시 행정구역", url: "https://ctm.gunpo.go.kr/www/contents.do?key=1008608" },
      { label: "군포시 철도교통 안내", url: "https://www.gunpo.go.kr/www/contents.do?key=4578" },
    ],
  }),
  profile({
    siteKey: "namyangju", checkedAt: "2026-08-19",
    heading: "왕숙천과 북한강 생활권을 잇는 남양주 주소",
    paragraphs: ["다산·별내, 진접·오남, 화도·와부는 왕숙천·한강·북한강을 따라 서로 다른 주소 축을 이룹니다.", "읍·면·동 이름에 함께 확인되는 하천·철도역·도로명을 붙여 넓은 시역 안의 주소를 좁힙니다."],
    addressAxes: ["다산·한강", "왕숙천·진접", "별내·청학", "화도·와부·북한강"],
    sections: [
      { id: "dasan-hangang", heading: "다산과 한강 쪽 주소", paragraphs: ["다산·수석 쪽은 한강공원과 왕숙천 합류 방향을 기준으로 주소를 확인합니다.", "동 이름과 해당 교량 또는 큰길을 함께 알려 주세요."] },
      { id: "wangsuk-jinjeop", heading: "왕숙천을 따라 이어지는 주소", paragraphs: ["왕숙천은 진접·오남에서 다산 쪽으로 이어지는 긴 하천 기준입니다.", "하천 이름만으로는 범위가 넓으므로 읍·동과 교량 이름을 같이 적습니다."] },
      { id: "byeollae-cheonghak", heading: "별내와 청학 쪽 주소", paragraphs: ["별내·청학 생활권은 불암산·수락산 자락과 역 이름을 보조 기준으로 씁니다.", "별내역인지 청학리인지 먼저 나눈 뒤 도로명을 확인합니다."] },
      { id: "hwado-wabu", heading: "화도와 와부의 북한강·한강 주소", paragraphs: ["화도·조안은 북한강 쪽, 와부는 한강 쪽 지명이 주소 설명에 자주 등장합니다.", "읍·면과 리 이름을 생략하지 말고 수변 도로와 건물명을 함께 받습니다."] },
    ],
    sources: [
      { label: "남양주시 문화관광", url: "https://nyj.go.kr/culture/contents.do?key=247" },
      { label: "남양주시 관광 포털", url: "https://www.nyj.go.kr/culture/index.do" },
    ],
  }),
  profile({
    siteKey: "dongducheon",
    checkedAt: "2026-08-19",
    heading: "소요산과 신천을 따라 확인하는 동두천 주소",
    paragraphs: ["상봉암·소요산 쪽, 보산 관광특구 쪽, 신천과 경원선 주변을 나눠 주소를 봅니다.", "동 이름과 소요산역·보산역·지행역 중 주소에 적힌 역, 신천 쪽이라는 기준을 함께 알려 주세요."],
    addressAxes: ["상봉암·소요산", "보산 관광특구", "신천·경원선"],
    sections: [
      { id: "soyosan-sangbongam", heading: "소요산과 상봉암 쪽 주소", paragraphs: ["소요산 관광지는 상봉암동에 있어 북쪽 주소를 확인할 때 뚜렷한 기준이 됩니다.", "소요산역 주변인지 산 아래 도로 쪽인지 동 이름과 함께 적어 주세요."] },
      { id: "bosan-zone", heading: "보산 관광특구 주변 주소", paragraphs: ["보산동 관광특구는 신천, 평화로, 경원선 철로를 둘러싼 기준으로 안내됩니다.", "보산역인지 중앙로 쪽인지 덧붙이면 도심 주소를 구분하기 쉽습니다."] },
      { id: "sincheon", heading: "신천을 기준으로 보는 생활권", paragraphs: ["신천은 보산·중앙 생활권을 확인할 때 반복해서 만나는 하천 기준점입니다.", "강변도로 쪽인지 역세권 쪽인지 도로명과 건물명을 같이 확인합니다."] },
      { id: "gyeongwon-line", heading: "경원선 역 이름으로 좁히기", paragraphs: ["소요산역, 보산역, 동두천중앙역, 지행역은 남북으로 이어지는 주소 단서입니다.", "역 이름만 남기지 말고 동과 도로명을 붙여 최종 위치를 확인해 주세요."] },
    ],
    sources: [
      { label: "동두천시 주요업무 계획", url: "https://www.ddc.go.kr/site/ddc/download/ddc_2024/ddc_2024_12.pdf" },
      { label: "동두천시 관광 지도", url: "https://www.ddc.go.kr/site/tour/download/tourmap_2021.pdf" },
    ],
  }),
  profile({
    siteKey: "bucheon", checkedAt: "2026-08-19",
    heading: "원미·소사·오정 세 구로 나누는 부천 주소",
    paragraphs: ["원미·소사·오정 세 구를 먼저 고르고 1호선 역세권, 성주산, 북부 생활권 가운데 주소에 맞는 기준을 확인합니다.", "부천역이나 소사역 같은 역 이름만 쓰지 말고 구·동·도로명을 순서대로 적습니다."],
    addressAxes: ["원미·중동", "소사·성주산", "오정·원종", "1호선 역세권"],
    sections: [
      { id: "wonmi-center", heading: "원미구 도심 주소", paragraphs: ["원미구는 부천역·중동역과 원미·상동 생활권을 기준으로 주소를 봅니다.", "부천역과 중동역 가운데 주소에 맞는 철도 기준에 동·도로명·건물명을 더합니다."] },
      { id: "sosa-seongjusan", heading: "소사구와 성주산 쪽 주소", paragraphs: ["소사구는 소사역·부천역 남쪽과 성주산 자락을 기준으로 확인합니다.", "소사라는 이름만 적지 말고 동과 함께 확인되는 역 또는 큰길을 알려 주세요."] },
      { id: "ojeong-north", heading: "오정구의 북부 주소", paragraphs: ["오정구 주소는 오정·원종·고강 생활권의 동 이름을 먼저 구분합니다.", "공항 주변 지명과 섞이지 않도록 오정·원종·고강 중 해당 동과 도로명을 확인합니다."] },
      { id: "three-gu-order", heading: "세 구를 거치는 지역 선택", paragraphs: ["원미구, 소사구, 오정구는 각각 별도 구 단계에서 하위 동으로 이어집니다.", "원미·소사·오정 가운데 구를 먼저 고른 뒤 동과 도로명을 적어 주세요."] },
    ],
    sources: [{ label: "부천시 공식 도시 안내", url: "https://www.bucheon.go.kr/site/homepage/menu/viewMenu?menuid=148006001011008005" }],
  }),
  profile({
    siteKey: "seongnam", checkedAt: "2026-08-19",
    heading: "탄천을 따라 구도심·분당·판교를 나누는 성남 주소",
    paragraphs: ["수정·중원 구도심과 분당·판교 생활권은 탄천, 남한산성, 청계산을 서로 다른 기준으로 사용합니다.", "수정구·중원구·분당구 가운데 구를 먼저 고르고 동·도로명·건물명을 확인합니다."],
    addressAxes: ["수정구·남한산성", "중원구·탄천", "분당구·탄천", "판교·청계산"],
    sections: [
      { id: "sujeong-fortress", heading: "수정구와 남한산성 쪽 주소", paragraphs: ["수정구는 태평·신흥·위례와 남한산성 방향을 함께 살피는 주소권입니다.", "태평·신흥 구도심인지 위례 쪽인지 동과 큰길을 먼저 확인합니다."] },
      { id: "jungwon-tancheon", heading: "중원구와 탄천 동쪽 주소", paragraphs: ["중원구는 성남동·중앙동·은행동과 탄천·검단산 방향을 기준으로 주소를 봅니다.", "성남동·중앙동·은행동 가운데 해당 동과 주소에 적힌 역·도로명을 붙입니다."] },
      { id: "bundang-tancheon", heading: "분당구와 탄천 생활권", paragraphs: ["분당구 주소는 정자·서현·야탑·수내처럼 탄천 주변 생활권 이름이 세분됩니다.", "분당이라는 말만 쓰지 말고 정자·서현·야탑·수내 중 해당 동과 도로명을 확인합니다."] },
      { id: "pangyo-cheonggye", heading: "판교와 청계산 쪽 주소", paragraphs: ["판교·운중·백현 쪽은 판교역과 청계산 방향을 보조 기준으로 사용합니다.", "판교역 주변인지 운중·백현 쪽인지 업무지구 건물명이나 단지명을 더해 주세요."] },
    ],
    sources: [
      { label: "성남시 문화관광", url: "https://www.seongnam.go.kr/tour/main.do" },
      { label: "성남시 비전성남 권역 안내", url: "https://snvision.seongnam.go.kr/5224" },
    ],
  }),
  profile({
    siteKey: "suwon",
    checkedAt: "2026-08-19",
    heading: "수원화성과 광교산을 기준으로 보는 수원 주소",
    paragraphs: ["수원화성·팔달산 중심, 광교산 북부, 칠보산 서부, 광교·영통 동부를 구분해 주소를 확인합니다.", "장안구, 권선구, 팔달구, 영통구 가운데 어느 구인지 먼저 적고 도로명과 건물명을 이어 주세요."],
    addressAxes: ["수원화성·팔달산", "광교산·광교호수공원", "칠보산·서수원", "장안·권선·팔달·영통"],
    sections: [
      { id: "hwaseong-paldal", heading: "수원화성과 팔달산 주변 주소", paragraphs: ["수원화성과 팔달산은 팔달구 구도심 주소를 확인할 때 중심 기준이 됩니다.", "성곽 문이나 시장 이름만 쓰지 말고 동과 도로명을 함께 알려 주세요."] },
      { id: "gwanggyo", heading: "광교산과 광교호수공원 쪽 주소", paragraphs: ["광교산 자락과 광교호수공원은 장안·영통·광교 생활권을 나누어 보는 기준입니다.", "산 쪽인지 호수공원 쪽인지에 구·동·건물명을 붙여 위치를 확인합니다."] },
      { id: "chilbo-west", heading: "칠보산과 서수원 주소", paragraphs: ["칠보산은 권선구 서쪽 주소를 살필 때 쓰기 좋은 지형 기준점입니다.", "호매실·금곡 등 동 이름과 도로명을 먼저 적고 산 이름은 보조 기준으로 사용합니다."] },
      { id: "four-districts", heading: "네 구를 먼저 확인하는 방법", paragraphs: ["장안구, 권선구, 팔달구, 영통구 가운데 어느 구인지가 첫 주소 단계입니다.", "구 다음에 동, 도로명, 건물명을 차례로 확인해 같은 이름의 장소를 구분합니다."] },
    ],
    sources: [
      { label: "수원시 관광 안내", url: "https://www.suwon.go.kr/sw-www/sw-visitsuwon/sw-visitsuwon-01.jsp" },
      { label: "수원시 공식 지도", url: "https://www.suwon.go.kr/webcontent/ckeditor/2025/6/26/7792dd7a-a7dc-495d-95cf-5bac03eea0ff.pdf" },
    ],
  }),
  profile({
    siteKey: "siheung", checkedAt: "2026-08-19",
    heading: "시화호와 시흥갯골을 기준으로 보는 시흥 주소",
    paragraphs: ["오이도·시화호 서해축, 시흥갯골, 소래권, 배곧·정왕을 나눠 주소를 확인합니다.", "수변이나 생활권 이름에 동·도로명·건물명을 붙여 실제 위치를 좁힙니다."],
    addressAxes: ["오이도·시화호", "시흥갯골", "소래·신천", "배곧·정왕"],
    sections: [
      { id: "oido-sihwa", heading: "오이도와 시화호 쪽 주소", paragraphs: ["오이도·정왕 쪽은 시화호와 해안 도로가 주소를 설명하는 기준점입니다.", "오이도역 주변인지 해안 쪽인지 정왕동과 도로명을 함께 확인합니다."] },
      { id: "gaetgol", heading: "시흥갯골 주변 주소", paragraphs: ["시흥갯골은 장곡·월곶·능곡 사이에서 수변 방향을 알려 주는 기준입니다.", "갯골공원 이름만 적지 말고 장곡·월곶·능곡 가운데 해당 동과 도로명을 붙입니다."] },
      { id: "sorae-sincheon", heading: "소래와 신천 도심 주소", paragraphs: ["신천·대야·은행 생활권은 소래 쪽 도심 주소로 이어집니다.", "신천·대야·은행 중 해당 행정동과 주소에 적힌 역을 함께 적습니다."] },
      { id: "baegot-jeongwang", heading: "배곧과 정왕의 세부 위치", paragraphs: ["배곧·정왕은 단지와 상업지구 이름이 많아 도로명 확인이 중요합니다.", "배곧 또는 정왕 생활권 이름 뒤에 도로명과 건물번호를 빠뜨리지 말아 주세요."] },
    ],
    sources: [
      { label: "시흥시 오이도 공식 자료", url: "https://oidomuseum.siheung.go.kr/data/data.hs?publicationType=DP01" },
      { label: "시흥 오이도 유적 안내", url: "https://oidomuseum.siheung.go.kr/ruins/introduce.hs" },
      { label: "시흥도시공사 공원 안내", url: "https://www.shsi.or.kr/mainPage.do" },
      { label: "시흥시 동 지역 안내", url: "https://share.siheung.go.kr/hmpg/main/main.do" },
    ],
  }),
  profile({
    siteKey: "ansan", checkedAt: "2026-08-19",
    heading: "상록·단원 도심과 대부도 해안권을 나누는 안산 주소",
    paragraphs: ["상록구와 단원구 도심, 대부도·시화호·구봉도·탄도 해안권을 서로 다른 주소 기준으로 봅니다.", "먼저 구를 고른 뒤 동·도로명을 적고 섬이나 해안 지명은 보조 기준으로 사용합니다."],
    addressAxes: ["상록구·수암봉", "단원구 도심", "대부도·시화호", "상록·단원"],
    sections: [
      { id: "sangnok-surambong", heading: "상록구와 수암봉 쪽 주소", paragraphs: ["상록구는 본오·사동·일동과 수암봉 방향을 기준으로 주소를 나눠 봅니다.", "본오·사동·일동 중 해당 동과 주소에 적힌 역 또는 큰길을 덧붙여 주세요."] },
      { id: "danwon-center", heading: "단원구 시내권 주소", paragraphs: ["단원구 시내는 중앙·고잔·원곡과 화랑유원지·반월산업권의 주소를 함께 다룹니다.", "대부도권과 섞이지 않도록 중앙·고잔·원곡 중 해당 동과 도로명을 먼저 확인합니다."] },
      { id: "daebudo-sihwa", heading: "대부도와 시화호 쪽 주소", paragraphs: ["대부도·구봉도·탄도·시화호는 단원구 해안 주소를 확인하는 기준점입니다.", "섬이나 관광지 이름만 쓰지 말고 동·리와 진입 도로를 같이 알려 주세요."] },
      { id: "two-gu-order", heading: "상록과 단원부터 구분하기", paragraphs: ["안산 주소는 상록구와 단원구 중 어느 구인지가 첫 단계입니다.", "상록구 또는 단원구를 고르고 동, 도로명, 건물명을 순서대로 확인합니다."] },
    ],
    sources: [
      { label: "안산시 문화관광", url: "https://ansan.go.kr/tourinfo/main/main.do" },
      { label: "안산시 대부도 안내", url: "https://ansan.go.kr/tourinfo/common/cntnts/selectContents.do?cntnts_id=C0002005" },
    ],
  }),
  profile({
    siteKey: "anseong", checkedAt: "2026-08-19",
    heading: "서운산·청룡호수와 고삼권을 나누는 안성 주소",
    paragraphs: ["서운산·청룡호수 동남부, 고삼호수, 안성 도심과 공도, 넓은 읍면권을 주소 기준으로 구분합니다.", "읍·면 주소는 리 단계를 생략하지 않고 도로명과 건물명을 이어 적습니다."],
    addressAxes: ["서운산·청룡호수", "고삼호수", "안성 도심·공도", "동부 읍면권"],
    sections: [
      { id: "seoun-cheongnyong", heading: "서운산과 청룡호수 쪽 주소", paragraphs: ["서운산·청룡호수 주변은 서운면과 동남쪽 마을 주소를 설명하는 기준입니다.", "서운면과 리 이름, 주소에 적힌 호수 또는 산길을 함께 알려 주세요."] },
      { id: "gosam-lake", heading: "고삼호수 주변 읍면 주소", paragraphs: ["고삼 쪽은 호수와 면·리 이름을 함께 봐야 위치를 좁힐 수 있습니다.", "고삼호수 이름만 적지 말고 고삼면 아래 리와 도로명을 같이 확인합니다."] },
      { id: "center-gongdo", heading: "안성 도심과 공도 생활권", paragraphs: ["도심 동 지역과 공도읍은 서로 다른 주소 단계로 이어집니다.", "공도읍인지 안성 도심 동인지 먼저 구분하고 도로명·건물명을 적어 주세요."] },
      { id: "eupmyeon-order", heading: "넓은 읍면권의 주소 순서", paragraphs: ["일죽·죽산·삼죽·미양 등 읍면 주소는 리 단계를 생략하면 위치 확인이 어렵습니다.", "일죽·죽산·삼죽·미양 가운데 읍·면을 고른 뒤 리와 도로명을 잇습니다."] },
    ],
    sources: [
      { label: "안성시 청룡호수 안내", url: "https://www.anseong.go.kr/tour/themeTourist/view.do?idx=209&mId=0104000000" },
      { label: "안성시 서운산 둘레길 안내", url: "https://www.anseong.go.kr/tour/themeTourist/view.do?idx=171&mId=0104000000" },
      { label: "안성시 권역별 관광", url: "https://www.anseong.go.kr/tour/themeTourist/regionList.do?mId=0103000000" },
    ],
  }),
  profile({
    siteKey: "anyang", checkedAt: "2026-08-19",
    heading: "안양천과 평촌으로 만안·동안을 나누는 안양 주소",
    paragraphs: ["만안구·동안구를 먼저 고르고 안양천·학의천, 관악산·수리산, 평촌 가운데 주소에 맞는 기준을 확인합니다.", "구와 동을 적은 뒤 역·하천·산 이름은 상세 도로명을 보완하는 데 사용합니다."],
    addressAxes: ["만안구·안양천", "동안구·평촌·학의천", "관악산·수리산", "만안·동안"],
    sections: [
      { id: "manan-anyangcheon", heading: "만안구와 안양천 쪽 주소", paragraphs: ["만안구는 안양역·명학역과 안양천, 관악산 자락을 기준으로 주소를 봅니다.", "안양역·명학역 가운데 주소에 맞는 역과 구도심 동·도로명을 함께 확인합니다."] },
      { id: "dongan-pyeongchon", heading: "동안구와 평촌 생활권", paragraphs: ["동안구는 평촌·범계·인덕원 생활권과 학의천을 기준으로 세부 주소를 나눕니다.", "평촌·범계·인덕원 중 해당 생활권 뒤에 동과 도로명을 붙여 주세요."] },
      { id: "mountain-axis", heading: "관악산과 수리산 사이 주소", paragraphs: ["관악산·삼성산 쪽과 수리산 쪽은 만안구의 방향을 설명하는 산 기준입니다.", "관악산·삼성산·수리산 이름은 보조로 쓰고 실제 동과 큰길을 먼저 적습니다."] },
      { id: "manan-dongan-order", heading: "만안과 동안을 먼저 나누기", paragraphs: ["안양 주소는 만안구와 동안구 가운데 어느 구인지부터 확인합니다.", "만안·동안을 고른 뒤 동·도로명 순서로 정리하면 평촌과 구도심을 혼동하지 않습니다."] },
    ],
    sources: [
      { label: "안양시 도시계획 자료", url: "https://www.anyang.go.kr/downloadGosiFile.do?regiNo=20540&sfn=73690_1.pdf" },
      { label: "안양시 산림 안내", url: "https://www.anyang.go.kr/forest/contents.do?key=2436" },
    ],
  }),
  profile({
    siteKey: "yangju", checkedAt: "2026-08-19",
    heading: "옥정·회천과 서북부 읍면권을 나누는 양주 주소",
    paragraphs: ["옥정·회천 동부 도시권과 광적·백석·장흥·은현·남면 읍면권은 주소 단계가 다릅니다.", "생활권 이름에 그치지 않고 동 또는 읍·면, 리, 도로명을 차례로 확인합니다."],
    addressAxes: ["옥정·회천", "양주·백석", "장흥·광적", "은현·남면"],
    sections: [
      { id: "okjeong-hoecheon", heading: "옥정과 회천 생활권 주소", paragraphs: ["옥정·회천 쪽은 신도시 동 이름과 큰 도로를 중심으로 주소를 확인합니다.", "옥정 또는 회천 생활권명에 행정동과 도로명을 반드시 붙여 주세요."] },
      { id: "yangju-baekseok", heading: "양주와 백석 쪽 주소", paragraphs: ["양주동·백석읍 쪽은 시청권과 읍 지역 주소가 이어지는 생활권입니다.", "양주동인지 백석읍인지 먼저 나누고 도로명과 건물명을 확인합니다."] },
      { id: "jangheung-gwangjeok", heading: "장흥과 광적의 서부 주소", paragraphs: ["장흥·광적은 면 이름 아래 리와 도로가 이어지는 주소 구조입니다.", "장흥면·광적면 가운데 해당 면을 고르고 리와 주소에 적힌 큰길을 알려 주세요."] },
      { id: "eunhyeon-nammyeon", heading: "은현과 남면의 북부 주소", paragraphs: ["은현면·남면은 북부 읍면권에서 마을 이름이 중요한 주소 단서입니다.", "은현면·남면 다음에 리와 도로명을 이어 적어 위치를 확인합니다."] },
    ],
    sources: [{ label: "양주시 도시 기본 자료", url: "https://www.yangju.go.kr/DATA/download/atc/cts1730_file.pdf" }],
  }),
  profile({
    siteKey: "yeoncheon", checkedAt: "2026-08-19",
    heading: "임진강·한탄강과 북부 읍면으로 보는 연천 주소",
    paragraphs: ["임진강, 한탄강, 고대산, 백학·신서 북부권을 기준으로 읍·면 주소를 확인합니다.", "북부 일부 목적지는 공식 출입 안내가 따로 필요할 수 있어 면·리와 시설명을 먼저 확인합니다."],
    addressAxes: ["임진강", "한탄강·전곡", "신서·고대산", "DMZ·백학"],
    sections: [
      { id: "imjin-river", heading: "임진강을 따라 보는 주소", paragraphs: ["임진강은 군남·왕징·미산·백학 쪽 주소를 설명하는 대표 하천 기준입니다.", "군남·왕징·미산·백학 중 해당 면과 리 이름, 주소에 적힌 교량 또는 강변 도로를 알려 주세요."] },
      { id: "hantan-jeongok", heading: "한탄강과 전곡 생활권", paragraphs: ["한탄강·전곡리유적은 전곡읍 주변 주소를 확인할 때 쓰는 기준점입니다.", "전곡리유적 이름보다 전곡읍 아래 리와 도로명을 먼저 확인합니다."] },
      { id: "sinseo-godaesan", heading: "신서와 고대산 쪽 주소", paragraphs: ["신서면·연천읍 북부는 고대산과 철도역 이름이 방향 단서가 됩니다.", "신서면 또는 연천읍에 역·산 이름을 보조로 붙이고 리와 도로명을 적습니다."] },
      { id: "civilian-control", heading: "민통선 관련 주소 확인", paragraphs: ["일부 북부 지역은 일반 생활권과 출입 확인이 필요한 구역이 함께 있습니다.", "출입 가능 여부를 단정하지 않고 정확한 면·리와 목적지의 공식 안내를 먼저 확인합니다."] },
    ],
    sources: [
      { label: "연천군 임진강 생물권보전지역 일반현황", url: "https://www.yeoncheon.go.kr/mab/contents.do?key=4339" },
      { label: "연천군 한탄강 지질공원 안내", url: "https://www.yeoncheon.go.kr/mab/contents.do?key=4341" },
      { label: "연천군 문화관광", url: "https://www.yeoncheon.go.kr/tour/index.do" },
      { label: "연천군 공식 안내", url: "https://www.yeoncheon.go.kr/www/contents.do?key=4974" },
    ],
  }),
  profile({
    siteKey: "osan", checkedAt: "2026-08-19",
    heading: "오산천과 세교·구도심으로 나누는 오산 주소",
    paragraphs: ["오산천 중심축, 독산성 북부, 물향기수목원·세교, 궐리사 구도심을 서로 다른 주소 기준으로 봅니다.", "시설 이름만 남기지 않고 동·교량·도로명·건물명을 함께 확인합니다."],
    addressAxes: ["오산천", "독산성", "물향기수목원·세교", "궐리사·구도심"],
    sections: [
      { id: "osan-stream", heading: "오산천을 따라 보는 도심 주소", paragraphs: ["오산천은 중앙동·대원동·신장동 주변을 남북으로 확인하는 하천 기준입니다.", "중앙·대원·신장 중 해당 동과 주소에 적힌 교량 또는 큰길을 알려 주세요."] },
      { id: "doksanseong", heading: "독산성 쪽 북부 주소", paragraphs: ["독산성은 세마·외삼미 쪽 주소를 설명할 때 쓰는 북부 기준점입니다.", "독산성 이름만 쓰지 말고 세마·외삼미의 동과 진입 도로를 같이 확인합니다."] },
      { id: "arboretum-segyo", heading: "물향기수목원과 세교 생활권", paragraphs: ["물향기수목원·오산대역은 세교권 주소에서 함께 확인하는 기준점입니다.", "세교라는 이름 뒤에 동과 도로명, 단지명을 붙여 주세요."] },
      { id: "gwollisa-center", heading: "궐리사와 구도심 주소", paragraphs: ["궐리사 주변은 궐동·오산동 구도심 주소를 설명하는 문화 기준점입니다.", "궐동·오산동 중 해당 동에 실제 도로명과 건물번호를 더합니다."] },
    ],
    sources: [
      { label: "오산시 공식 영문 안내", url: "https://www.osan.go.kr/eng/main.do" },
      { label: "오산시 물향기수목원 자료", url: "https://www.osan.go.kr/portal/photo/photoDetail.do?mId=0305060000&photoId=3491" },
    ],
  }),
  profile({
    siteKey: "yongin", checkedAt: "2026-08-19",
    heading: "처인·기흥·수지 세 구의 지형을 따라 보는 용인 주소",
    paragraphs: ["처인구 경안천·읍면권, 기흥구 기흥호수·석성산, 수지구 광교산·죽전·풍덕천을 각각 주소 기준으로 삼습니다.", "세 구 가운데 먼저 하나를 고른 뒤 읍·면·동, 도로명, 건물명을 잇습니다."],
    addressAxes: ["처인구·경안천", "기흥구·기흥호수", "수지구·광교산", "처인·기흥·수지"],
    sections: [
      { id: "cheoin-gyeongan", heading: "처인구와 경안천 쪽 주소", paragraphs: ["처인구는 경안천·금학천과 포곡·모현·양지 등 읍면권을 함께 확인합니다.", "처인구 다음에 포곡·모현·양지 등 해당 읍·면·동과 도로명을 적습니다."] },
      { id: "giheung-lake", heading: "기흥구와 기흥호수공원 주변", paragraphs: ["기흥구는 기흥호수공원·석성산과 신갈·동백·구성 생활권을 기준으로 주소를 봅니다.", "기흥호수나 석성산 이름에 신갈·동백·구성 중 해당 동과 도로명을 붙입니다."] },
      { id: "suji-gwanggyo", heading: "수지구와 광교산 쪽 주소", paragraphs: ["수지구는 광교산 자락과 풍덕천·죽전·동천 생활권을 기준으로 세부 주소를 나눕니다.", "풍덕천·죽전·동천 중 해당 동과 단지 또는 건물명을 같이 확인합니다."] },
      { id: "three-gu-order", heading: "세 구를 먼저 고르는 주소 순서", paragraphs: ["처인구, 기흥구, 수지구는 각각 하위 주소 구조와 생활권 기준이 다릅니다.", "처인·기흥·수지를 고른 뒤 읍·면·동과 도로명을 이어 적어 주세요."] },
    ],
    sources: [
      { label: "용인시 경안천 관광 안내", url: "https://www.yongin.go.kr/home/yitour/ytour02/yttema03/yttemamn07_01.jsp" },
      { label: "용인시 기흥호수 안내", url: "https://www.yongin.go.kr/home/yitour/ytour01/yttour02/yttourmn01_02.jsp" },
      { label: "용인시 석성산 안내", url: "https://www.yongin.go.kr/home/yitour/ytour01/yttour02/yttourmn01.jsp" },
      { label: "용인시 광교산 안내", url: "https://www.yongin.go.kr/home/yitour/ytour01/yttour02/yttourmn01_01.jsp" },
    ],
  }),
  profile({
    siteKey: "uijeongbu", checkedAt: "2026-08-19",
    heading: "중랑천·부용천과 두 산으로 보는 의정부 주소",
    paragraphs: ["중랑천 도심, 부용천·송산 생활권, 수락산 동부, 도봉산 서부를 주소 기준으로 나눕니다.", "역이나 산 이름만 쓰지 않고 동·교량·도로명·건물명을 함께 확인합니다."],
    addressAxes: ["중랑천", "부용천·송산", "수락산", "도봉산·사패산"],
    sections: [
      { id: "jungnangcheon", heading: "중랑천을 따라 보는 도심 주소", paragraphs: ["중랑천은 의정부역·회룡역 주변 도심 주소를 확인하는 하천 기준입니다.", "의정부역·회룡역 가운데 주소에 맞는 역에 동과 교량 또는 도로명을 함께 적습니다."] },
      { id: "buyongcheon-songsan", heading: "부용천과 송산 생활권", paragraphs: ["부용천은 용현·민락·고산 쪽 동부 주소를 설명하는 수변 기준점입니다.", "용현·민락·고산 중 해당 동과 단지 또는 건물명을 붙여 주세요."] },
      { id: "suraksan-east", heading: "수락산 동쪽 주소", paragraphs: ["수락산·도정봉은 장암·고산 쪽 방향을 설명하는 산 기준입니다.", "장암·고산의 실제 도로명과 목적 건물을 먼저 확인합니다."] },
      { id: "dobongsan-west", heading: "도봉산 서쪽 주소", paragraphs: ["도봉산과 사패산 자락은 가능·호원 쪽 주소를 설명할 때 쓰는 기준입니다.", "가능·호원 중 해당 동과 주소에 적힌 역, 도로명을 알려 주세요."] },
    ],
    sources: [
      { label: "의정부시 중랑천 안내", url: "https://www.ui4u.go.kr/tour/contents.do?mId=0102020000" },
      { label: "의정부시 부용천 안내", url: "https://www.ui4u.go.kr/tour/contents.do?mId=0102000000" },
      { label: "의정부시 산·하천 관광 안내", url: "https://www.ui4u.go.kr/tour/main.do" },
    ],
  }),
  profile({
    siteKey: "paju", checkedAt: "2026-08-19",
    heading: "운정·금촌·문산으로 남북을 나누는 파주 주소",
    paragraphs: ["운정·교하 남부, 금촌·월롱 중부, 문산·임진강 북부를 주소 기준으로 구분합니다.", "북부 일부 목적지는 공식 출입 안내가 따로 있을 수 있어 읍·면·동과 시설명을 먼저 확인합니다."],
    addressAxes: ["운정·교하", "금촌·월롱", "문산·임진강", "DMZ 관련 지역"],
    sections: [
      { id: "unjeong-gyoha", heading: "운정과 교하의 남부 주소", paragraphs: ["운정·교하는 신도시 동 이름과 큰 도로, 역세권을 중심으로 주소를 확인합니다.", "운정 또는 교하 생활권명 뒤에 동과 도로명, 단지명을 붙여 주세요."] },
      { id: "geumchon-wollong", heading: "금촌과 월롱의 중부 주소", paragraphs: ["금촌·월롱은 경의중앙선 역과 산업·주거 도로가 함께 나타나는 주소권입니다.", "금촌·월롱의 읍·동과 건물명을 역 이름에 같이 확인합니다."] },
      { id: "munsan-imjin", heading: "문산과 임진강 쪽 주소", paragraphs: ["문산·파평·적성 쪽은 임진강과 읍면 지명이 중요한 북부 주소 단서입니다.", "문산·파평·적성 가운데 읍·면을 먼저 고르고 리와 도로명을 적습니다."] },
      { id: "dmz-destination", heading: "DMZ 관련 지역의 목적지 확인", paragraphs: ["장단·군내 등 북부 일부는 일반 도심과 다른 출입 안내가 적용되는 목적지가 있습니다.", "가능 여부를 미리 단정하지 않고 장단·군내의 정확한 시설명과 공식 출입 안내를 확인합니다."] },
    ],
    sources: [
      { label: "파주시 도시계획 자료 1", url: "https://www.paju.go.kr/webcontent/ckeditor/2025/3/27/9e8bbec7-29c5-4308-a1d2-d820b6276aa1.pdf" },
      { label: "파주시 도시계획 자료 2", url: "https://www.paju.go.kr/webcontent/ckeditor/2025/3/27/88fd3660-4c88-4692-a551-bf01af1d01ae.pdf" },
    ],
  }),
  profile({
    siteKey: "pyeongtaek", checkedAt: "2026-08-19",
    heading: "평택항·진위천과 송탄·고덕으로 보는 평택 주소",
    paragraphs: ["평택항·평택호 서부, 안성천·진위천, 송탄·고덕 북동 도시권, 남평택·팽성을 서로 다른 주소 축으로 봅니다.", "항만이나 하천 이름 뒤에 읍·면·동, 도로명, 건물명을 이어 적습니다."],
    addressAxes: ["평택항·평택호", "진위천", "송탄·고덕", "남평택·팽성"],
    sections: [
      { id: "port-west", heading: "평택항과 황해 쪽 주소", paragraphs: ["평택항이 있는 서부는 포승·현덕·안중 등 읍면 이름이 주소 확인의 첫 단서입니다.", "포승·현덕·안중 가운데 읍·면을 고른 뒤 리와 항만 도로를 적습니다."] },
      { id: "jinwi-stream", heading: "진위천을 기준으로 보는 주소", paragraphs: ["진위천은 시 중앙부를 남북으로 흐르며 여러 생활권을 가르는 하천 기준입니다.", "진위천 이름과 함께 표시되는 읍·동, 교량 또는 큰길을 확인합니다."] },
      { id: "songtan-godeok", heading: "송탄과 고덕의 북부 생활권", paragraphs: ["송탄·고덕 쪽은 서정·지산·이충·고덕 등 세부 주소가 따로 이어집니다.", "서정·지산·이충·고덕 중 해당 동에 도로명과 건물명을 붙입니다."] },
      { id: "south-pyeongtaek", heading: "남평택과 팽성의 주소", paragraphs: ["남평택 도심과 팽성읍은 통복·비전·세교 및 읍·리 주소를 나누어 봅니다.", "통복·비전·세교 동 주소인지 팽성읍·리 주소인지 먼저 확인합니다."] },
    ],
    sources: [
      { label: "평택시사 평택항 자료", url: "https://sisa.pyeongtaek.go.kr/bbs/board.php?bo_table=ca12&wr_id=13" },
      { label: "평택시사 하천 자료", url: "https://sisa.pyeongtaek.go.kr/bbs/board.php?bo_table=ca18&wr_id=29" },
    ],
  }),
  profile({
    siteKey: "pocheon", checkedAt: "2026-08-19",
    heading: "한탄강·산정호수와 광릉 남부로 나누는 포천 주소",
    paragraphs: ["한탄강·산정호수 북부, 소흘·광릉 남부, 포천아트밸리·시내권을 주소 기준으로 나눕니다.", "관광지 이름만 남기지 않고 읍·면·동, 리, 진입 도로를 함께 확인합니다."],
    addressAxes: ["한탄강", "산정호수·영북", "소흘·광릉", "포천아트밸리·시내"],
    sections: [
      { id: "hantan-north", heading: "한탄강 쪽 북부 주소", paragraphs: ["한탄강과 비둘기낭·주상절리 권역은 영북·관인·창수 쪽 주소의 기준입니다.", "영북·관인·창수 가운데 읍·면과 리 이름, 주소에 적힌 강변 도로를 알려 주세요."] },
      { id: "sanjeong-lake", heading: "산정호수와 영북면 주소", paragraphs: ["산정호수 주변은 영북면 아래 리와 진입 도로를 함께 확인합니다.", "산정호수 이름만 적지 말고 영북면의 숙소나 건물 도로명을 알려 주세요."] },
      { id: "soheul-gwangneung", heading: "소흘과 광릉 쪽 남부 주소", paragraphs: ["소흘읍·광릉·고모리 쪽은 포천 남부 생활권의 주소 기준입니다.", "소흘읍과 고모리 등 리, 도로명 순서로 적어 시내 동 지역과 구분합니다."] },
      { id: "art-valley-center", heading: "포천아트밸리와 시내권 주소", paragraphs: ["포천아트밸리 주변과 신읍·군내 쪽은 시내권에서 서로 다른 세부 도로로 이어집니다.", "포천아트밸리 시설명에 신읍·군내의 읍·면·동과 도로명을 붙여 주세요."] },
    ],
    sources: [
      { label: "포천시 한탄강 안내", url: "https://pocheon.go.kr/ktour/contents.do?key=10787" },
      { label: "포천시 문화관광", url: "https://pocheon.go.kr/ktour/index.do" },
    ],
  }),
  profile({
    siteKey: "hanam", checkedAt: "2026-08-19",
    heading: "미사한강·검단산과 남부 생활권으로 보는 하남 주소",
    paragraphs: ["미사한강·미사호수 서부, 검단산 동부, 감일·위례 남부, 덕풍·신장 도심을 주소 기준으로 나눕니다.", "생활권이나 산 이름 뒤에 하남의 동·도로명·건물명을 이어 적습니다."],
    addressAxes: ["미사한강·미사호수", "검단산", "감일·위례", "덕풍·신장"],
    sections: [
      { id: "misa-waterfront", heading: "미사한강과 미사호수 주변", paragraphs: ["미사 생활권은 한강공원·미사호수공원과 미사강변 도로를 기준으로 주소를 봅니다.", "미사 생활권 이름 뒤에 동과 미사강변 도로, 단지명을 붙여 주세요."] },
      { id: "geomdansan-east", heading: "검단산 쪽 동부 주소", paragraphs: ["검단산은 신장·창우·배알미 방향을 설명하는 동부 기준점입니다.", "신장·창우·배알미 중 해당 동의 도로명과 건물명을 먼저 확인합니다."] },
      { id: "gamil-wirye", heading: "감일과 위례의 남부 주소", paragraphs: ["감일·감북·위례 쪽은 남한산성 방향과 주변 도시 지명이 함께 보이는 주소권입니다.", "감일·감북·위례 가운데 하남 안의 동 이름과 도로명을 분명히 적어 주세요."] },
      { id: "deokpung-sinjang", heading: "덕풍과 신장의 도심 주소", paragraphs: ["덕풍·신장은 시청과 주요 상업 도로를 기준으로 세부 위치를 확인합니다.", "덕풍·신장의 시장이나 상가 이름에 도로명과 건물번호를 함께 받습니다."] },
    ],
    sources: [
      { label: "하남시 공식 소식 자료", url: "https://www.hanam.go.kr/DATA/newsletter/3402/20240531051807565_OsOd.pdf" },
      { label: "하남시 미사 안내", url: "https://www.hanam.go.kr/sosik/selectBbsNttView.do?bbsNo=1164&key=10048&nttNo=489524&pageIndex=16&searchCnd=all" },
    ],
  }),
  profile({
    siteKey: "hwaseong", checkedAt: "2026-08-19",
    heading: "동탄·만세·병점·효행 네 구로 나누는 화성 주소",
    paragraphs: ["2026년 2월 설치된 동탄구·만세구·병점구·효행구를 먼저 고르고 각 구의 읍·면·동 주소를 확인합니다.", "동탄 도시권, 만세 서해권, 병점 역세권, 효행 서부 내륙권의 구 이름을 생략하지 않습니다."],
    addressAxes: ["동탄구", "만세구·서해", "병점구", "효행구·봉담"],
    sections: [
      { id: "dongtan-gu", heading: "동탄구의 내륙 도시권 주소", paragraphs: ["동탄구는 동탄 생활권 안에서 동 번호와 큰 도로, 역·호수공원 주변 주소가 세분됩니다.", "동탄구 다음에 정확한 동과 도로명, 건물명을 붙여 주세요."] },
      { id: "manse-gu", heading: "만세구의 서해와 읍면 주소", paragraphs: ["만세구는 남양·송산·서신·우정 등 서해 쪽 읍면 주소와 제부도 방향을 함께 다룹니다.", "남양·송산·서신·우정 가운데 읍·면을 고르고 리와 해안 도로를 잇습니다."] },
      { id: "byeongjeom-gu", heading: "병점구의 역세권과 주거 주소", paragraphs: ["병점구는 병점역과 진안·반월 등 주거 생활권을 기준으로 세부 주소를 봅니다.", "병점역 이름만 적지 말고 진안·반월 등 동과 단지 또는 건물명을 같이 알려 주세요."] },
      { id: "hyohaeng-gu", heading: "효행구의 봉담과 서부 내륙 주소", paragraphs: ["효행구는 봉담을 비롯한 서부 내륙 생활권의 읍·면·동 주소를 확인합니다.", "효행구 다음에 봉담 등 읍·면·동, 도로명, 건물명을 차례로 적어 주세요."] },
    ],
    sources: [
      { label: "화성시 행정구역 연혁", url: "https://www.hscity.go.kr/www/intro/gnrlSttus/ctyhllHist.jsp" },
      { label: "화성시 관광 지도", url: "https://tour.hscity.go.kr/NEW/upload/tourmap_kr.pdf" },
    ],
  }),
  profile({
    siteKey: "uiwang",
    checkedAt: "2026-08-19",
    heading: "왕송호수와 백운호수로 나누는 의왕 주소",
    paragraphs: ["왕송호수 남서권, 백운호수·청계산 동부권, 모락산·철도문화 축을 주소 기준으로 나눠 봅니다.", "호수나 산 이름만으로 행정동을 확정하지 않고 실제 도로명과 건물명을 함께 확인합니다."],
    addressAxes: ["왕송호수·철도문화", "백운호수·청계산", "모락산"],
    sections: [
      { id: "wangsong-lake", heading: "왕송호수 주변 주소", paragraphs: ["왕송호수·철도박물관·자연학습공원은 부곡권 주소를 확인하는 연속된 기준점입니다.", "호수 이름만 남기지 말고 부곡동과 월암·초평 등 세부 지명을 함께 알려 주세요."] },
      { id: "baegun-cheonggye", heading: "백운호수와 청계산 쪽 주소", paragraphs: ["백운호수·청계산·청계사는 동쪽 주소를 확인할 때 서로 이어지는 기준입니다.", "청계·학의·내손 가운데 해당 동과 도로명을 붙여 주세요."] },
      { id: "moraksan", heading: "모락산을 가운데 둔 주소", paragraphs: ["모락산은 오전·내손·고천 주변에서 방향을 설명할 때 쓰는 산 기준점입니다.", "산 이름은 보조로 두고 실제 동과 도로명, 건물명을 먼저 확인합니다."] },
      { id: "lake-rail-order", heading: "호수와 철도 기준을 섞지 않는 법", paragraphs: ["왕송호수·철도문화권과 백운호수·청계산권은 주소를 확인할 때 사용하는 기준점이 다릅니다.", "주소에 맞는 호수나 산 기준을 확인한 뒤 행정동과 도로명을 이어 적어 주세요."] },
    ],
    sources: [
      { label: "의왕시 문화관광", url: "https://www.uiwang.go.kr/culture/index" },
      { label: "의왕시 왕송호수공원 안내", url: "https://www.uiwang.go.kr/UWKORECO0604" },
    ],
  }),
];

const PROFILE_BY_KEY = new Map<BabySiteKey, CityFactProfile>(
  PROFILES.map((item) => [item.siteKey, item]),
);

export function getCityFactProfile(siteKey: BabySiteKey): CityFactProfile {
  const value = PROFILE_BY_KEY.get(siteKey);
  if (!value) throw new Error(`MISSING_CITY_FACT_PROFILE:${siteKey}`);
  return value;
}

export const CITY_FACT_PROFILES = PROFILES;
