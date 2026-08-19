import type { ReactNode } from "react";

import {
  FaqSection,
  InteriorHero,
  ProcessSection,
  StandardsSection,
} from "@/components/content-blocks";
import { SiteLink } from "@/components/site-link";
import { formatKrw, PROVISIONAL_PRICING } from "@/data/pricing";
import {
  buildRegionServiceFaqs,
  CONSULTATION_ITEMS,
  COURSE_SELECTION_GUIDE,
} from "@/data/service-guide";

export function FixedPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="fixed-page">
      <InteriorHero description={description} eyebrow={eyebrow} title={title} />
      <div className="fixed-page__body content-frame">{children}</div>
    </article>
  );
}

export function PricingPageContent({ cityName }: { cityName: string }) {
  return (
    <>
      <section className="fixed-intro">
        <h2>{cityName} 코스 선택 기준</h2>
        <p>오일 사용 여부와 선호 압, 이용 시간을 비교한 뒤 전화상담에서 방문 가능 여부를 확인하세요.</p>
      </section>
      <div className="full-pricing-list">
        {PROVISIONAL_PRICING.map((course) => (
          <section id={course.id} key={course.id}>
            <div><p>COURSE</p><h2>{course.name}</h2><p>{course.description}</p></div>
            <table>
              <caption>{course.name} 시간별 가격</caption>
              <thead><tr><th scope="col">이용 시간</th><th scope="col">현장 결제 금액</th></tr></thead>
              <tbody>
                {course.options.map((option) => (
                  <tr key={option.minutes}><th scope="row">{option.minutes}분</th><td>{formatKrw(option.priceKrw)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <section className="course-selection">
        <h2>코스별 이용 방식</h2>
        <div>
          {COURSE_SELECTION_GUIDE.map((guide) => (
            <article key={guide.courseId}><small>{guide.courseName}</small><h3>{guide.title}</h3><p>{guide.description}</p></article>
          ))}
        </div>
      </section>
      <StandardsSection heading="결제와 운영 기준" />
    </>
  );
}

export function GuidePageContent({ cityName }: { cityName: string }) {
  return (
    <>
      <section className="consultation-grid">
        <div className="section-heading"><p>BEFORE CALL</p><h2>전화 전에 준비할 항목</h2></div>
        <ol>
          {CONSULTATION_ITEMS.map((item) => (
            <li key={item.index}><span>{item.index}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></li>
          ))}
        </ol>
      </section>
      <ProcessSection heading={`${cityName} 예약 이용 순서`} />
      <StandardsSection />
      <FaqSection faqs={buildRegionServiceFaqs(cityName)} />
    </>
  );
}

export function NoticePageContent({ cityName }: { cityName: string }) {
  const notices = [
    { title: "방문 가능 여부 확인", text: `${cityName} 안에서도 희망 시각과 세부 주소에 따라 방문 가능 여부가 달라질 수 있어 예약 확정 전에 확인합니다.` },
    { title: "코스와 이용 시간 확인", text: "선택한 코스와 이용 시간, 선호 압은 관리 시작 전에 다시 확인합니다." },
    { title: "현장 후불 결제", text: "사전 예약금 없이 관리가 끝난 뒤 현장에서 현금 또는 카드로 결제합니다." },
    { title: "주소 변경 안내", text: "예약 후 주소나 희망 시각이 달라지면 방문 가능 여부를 다시 확인해야 합니다." },
  ];
  return (
    <>
      <section className="notice-list">
        <h2>이용 전 확인 공지</h2>
        {notices.map((notice, index) => (
          <article key={notice.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{notice.title}</h3><p>{notice.text}</p></div></article>
        ))}
      </section>
      <section className="notice-links">
        <h2>필요한 안내 바로가기</h2>
        <div>
          <SiteLink href="/areas/">지역 안내</SiteLink>
          <SiteLink href="/pricing/">코스·가격</SiteLink>
          <SiteLink href="/guide/">이용 방법</SiteLink>
        </div>
      </section>
    </>
  );
}
