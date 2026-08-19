"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const GA_ID_PATTERN = /^G-[A-Z0-9]{4,15}$/;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    __babyLastGaPath?: string;
  }
}

function normalizedPathname(pathname: string) {
  const clean = `/${pathname.split("?")[0].split("#")[0]}`.replace(/\/{2,}/g, "/");
  return clean === "/" ? clean : clean.replace(/\/$/, "");
}

function sendEvent(...args: unknown[]) {
  if (typeof window.gtag === "function") {
    window.gtag(...args);
    return;
  }
  window.dataLayer ??= [];
  window.dataLayer.push(args);
}

export function Analytics({ siteKey }: { siteKey: string }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
  const enabled = GA_ID_PATTERN.test(measurementId);

  useEffect(() => {
    if (!enabled || !ready) return;
    const path = normalizedPathname(pathname);
    if (window.__babyLastGaPath === path) return;
    window.__babyLastGaPath = path;
    sendEvent("event", "page_view", {
      page_location: `${window.location.origin}${path}`,
      page_path: path,
      page_title: document.title,
      site_key: siteKey,
    });
  }, [enabled, pathname, ready, siteKey]);

  useEffect(() => {
    if (!enabled || !ready) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>("[data-phone-cta]")
        : null;
      if (!target) return;
      sendEvent("event", "phone_cta_clicked", {
        placement: target.dataset.phoneCta ?? "unknown",
        site_key: siteKey,
      });
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [enabled, ready, siteKey]);

  if (!enabled) return null;

  const boot = `window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,ads_data_redaction:true});`;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="baby-ga4" onReady={() => setReady(true)} strategy="afterInteractive">
        {boot}
      </Script>
    </>
  );
}
