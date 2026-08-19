import { ArrowIcon } from "@/components/icons";
import {
  ResponsivePicture,
  type ResponsiveImageSources,
} from "@/components/responsive-picture";
import { SiteLink } from "@/components/site-link";
import { formatKrw, PROVISIONAL_PRICING } from "@/data/pricing";
import {
  SERVICE_PROCESS_STEPS,
  SERVICE_STANDARDS,
  type RegionServiceFaq,
} from "@/data/service-guide";

export type DirectoryItem = {
  href: string;
  label: string;
  context?: string;
};

export type NarrativeSection = {
  id: string;
  heading: string;
  paragraphs: readonly string[];
  auditScope: "shared-service" | "local-substantive" | "directory";
  factRefs: readonly string[];
};

type AuthoredDirectoryTrace = Pick<
  NarrativeSection,
  "id" | "auditScope" | "factRefs"
>;

function serializeFactRefs(factRefs: readonly string[]): string {
  return JSON.stringify(
    [...factRefs]
      .map((reference) => reference.normalize("NFC").trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, "ko")),
  );
}

export type BreadcrumbItem = {
  href: string;
  label: string;
};

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="현재 위치" className="breadcrumbs">
      <ol>
        <li><SiteLink href="/">홈</SiteLink></li>
        {items.map((item, index) => (
          <li key={item.href}>
            <span aria-hidden="true">/</span>
            {index === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <SiteLink href={item.href}>{item.label}</SiteLink>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function InteriorHero({
  eyebrow,
  title,
  description,
  breadcrumbs = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs?: readonly BreadcrumbItem[];
}) {
  return (
    <header className="interior-hero">
      <div className="content-frame">
        {breadcrumbs.length ? <Breadcrumbs items={breadcrumbs} /> : null}
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="interior-hero__description">{description}</p>
      </div>
    </header>
  );
}

export function Narrative({
  sections,
  className = "",
}: {
  sections: readonly NarrativeSection[];
  className?: string;
}) {
  return (
    <div className={`narrative ${className}`.trim()}>
      {sections.map((section, index) => (
        <section
          className="narrative__section"
          data-authored-audit-scope={section.auditScope}
          data-authored-fact-refs={serializeFactRefs(section.factRefs)}
          data-authored-section-id={section.id}
          id={section.id}
          key={section.id}
        >
          <span aria-hidden="true" className="section-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p
                data-authored-paragraph-index={paragraphIndex}
                key={`${paragraphIndex}:${paragraph}`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PhotoSection({
  sources,
  alt,
  caption,
  reverse = false,
}: {
  sources: ResponsiveImageSources;
  alt: string;
  caption: string;
  reverse?: boolean;
}) {
  return (
    <figure className={`photo-section${reverse ? " photo-section--reverse" : ""}`}>
      <ResponsivePicture
        alt={alt}
        className="photo-section__picture"
        intrinsicHeight={800}
        intrinsicWidth={1200}
        sources={sources}
        sizes="(max-width: 767px) 94vw, 612px"
      />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function PricingPreview({ heading = "코스와 시간별 가격" }: { heading?: string }) {
  return (
    <section className="pricing-preview" id="courses">
      <div className="section-heading">
        <p>COURSE</p>
        <h2>{heading}</h2>
        <SiteLink href="/pricing/">전체 가격표 <ArrowIcon /></SiteLink>
      </div>
      <div className="pricing-grid">
        {PROVISIONAL_PRICING.map((course) => (
          <article className="pricing-card" key={course.id}>
            <h3>{course.name}</h3>
            <p>{course.description}</p>
            <dl>
              {course.options.map((option) => (
                <div key={option.minutes}>
                  <dt>{option.minutes}분</dt>
                  <dd>{formatKrw(option.priceKrw)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProcessSection({ heading = "예약부터 현장 결제까지" }: { heading?: string }) {
  return (
    <section className="process-section">
      <div className="section-heading"><p>PROCESS</p><h2>{heading}</h2></div>
      <ol>
        {SERVICE_PROCESS_STEPS.map((step, index) => (
          <li key={step.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{step.title}</h3><p>{step.description}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function StandardsSection({ heading = "확인할 운영 기준" }: { heading?: string }) {
  return (
    <section className="standards-section">
      <div className="section-heading"><p>STANDARD</p><h2>{heading}</h2></div>
      <div className="standards-grid">
        {SERVICE_STANDARDS.map((standard) => (
          <article key={standard.label}>
            <small>{standard.label}</small>
            <h3>{standard.title}</h3>
            <p>{standard.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FaqSection({
  faqs,
  heading = "예약 전 자주 확인하는 내용",
}: {
  faqs: readonly RegionServiceFaq[];
  heading?: string;
}) {
  return (
    <section className="faq-section">
      <div className="section-heading"><p>Q&amp;A</p><h2>{heading}</h2></div>
      <div className="faq-list">
        {faqs.map((faq) => (
          <details key={faq.question}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function RegionDirectory({
  heading,
  intro,
  items,
  auditTrace,
}: {
  heading: string;
  intro: string;
  items: readonly DirectoryItem[];
  auditTrace?: AuthoredDirectoryTrace;
}) {
  return (
    <section
      className="region-directory"
      data-authored-audit-scope={auditTrace?.auditScope}
      data-authored-fact-refs={
        auditTrace ? serializeFactRefs(auditTrace.factRefs) : undefined
      }
      data-authored-section-id={auditTrace?.id}
      id="region-directory"
    >
      <div className="section-heading">
        <p>AREA DIRECTORY</p>
        <h2>{heading}</h2>
        <p data-authored-paragraph-index={auditTrace ? 0 : undefined}>{intro}</p>
      </div>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={item.href}>
              <SiteLink href={item.href}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.label}</strong>
                {item.context ? <small>{item.context}</small> : null}
                <ArrowIcon />
              </SiteLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-directory">이 페이지와 같은 상위 지역의 안내를 확인하세요.</p>
      )}
    </section>
  );
}
