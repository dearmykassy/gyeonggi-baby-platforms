"use client";

import { useEffect, useState } from "react";

import { ArrowIcon, PauseIcon, PlayIcon } from "@/components/icons";
import {
  ResponsivePicture,
  type ResponsiveImageSources,
} from "@/components/responsive-picture";

export type HeroSlide = {
  sources: ResponsiveImageSources;
  alt: string;
  kicker: string;
  text: string;
};

export function HeroCarousel({
  title,
  slides,
}: {
  title: string;
  slides: readonly [HeroSlide, HeroSlide];
}) {
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const paused = userPaused || hoverPaused || focusPaused || reducedMotion;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const select = (index: number) => setActive((index + slides.length) % slides.length);

  return (
    <section
      aria-label={`${title} 주요 안내`}
      aria-roledescription="carousel"
      className="hero"
      data-carousel-paused={paused}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusPaused(false);
      }}
      onFocus={() => setFocusPaused(true)}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className="hero__slides">
        {slides.map((slide, index) => (
          <article
            aria-hidden={active !== index}
            className={`hero__slide${active === index ? " is-active" : ""}`}
            data-slide={index}
            key={slide.sources.desktop}
          >
            <ResponsivePicture
              alt={slide.alt}
              className="hero__picture"
              eager={index === 0}
              sources={slide.sources}
              sizes="100vw"
            />
            <div className="hero__shade" />
            <div className="hero__slide-note">
              <strong>{slide.kicker}</strong>
              <span>{slide.text}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="hero__copy">
        <p>LOCAL VISIT CARE</p>
        <h1>{title}</h1>
      </div>
      <p aria-atomic="true" aria-live={paused ? "polite" : "off"} className="sr-only">
        {slides.length}개 중 {active + 1}번 이미지
      </p>
      <button
        aria-label="이전 이미지"
        className="slide-arrow slide-prev"
        onClick={() => select(active - 1)}
        type="button"
      >
        <ArrowIcon />
      </button>
      <button
        aria-label="다음 이미지"
        className="slide-arrow slide-next"
        onClick={() => select(active + 1)}
        type="button"
      >
        <ArrowIcon />
      </button>
      <div aria-label="이미지 선택" className="slide-controls">
        {slides.map((slide, index) => (
          <button
            aria-current={active === index ? "true" : undefined}
            aria-label={`${index + 1}번 이미지 보기`}
            className={active === index ? "is-active" : undefined}
            key={slide.sources.desktop}
            onClick={() => select(index)}
            type="button"
          />
        ))}
        <button
          aria-label={reducedMotion
            ? "동작 줄이기 설정으로 자동 전환 꺼짐"
            : userPaused
              ? "자동 전환 재생"
              : "자동 전환 일시정지"}
          aria-pressed={userPaused}
          className="slide-pause"
          disabled={reducedMotion}
          onClick={() => setUserPaused((value) => !value)}
          type="button"
        >
          {userPaused || reducedMotion ? <PlayIcon /> : <PauseIcon />}
        </button>
      </div>
    </section>
  );
}
