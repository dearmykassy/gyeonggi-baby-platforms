"use client";

import { useEffect, useId, useRef, useState } from "react";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { SiteLink } from "@/components/site-link";
import { SiteSearch, type SearchItem } from "@/components/site-search";

export type NavigationItem = {
  href: string;
  label: string;
};

export const DRAWER_A11Y_CONTRACT = Object.freeze({
  modal: true,
  focusTrap: true,
  escapeClose: true,
  restoreFocus: true,
  bodyLock: true,
  inertBackground: true,
});

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileDrawer({
  brandName,
  cityName,
  navigation,
  searchItems,
}: {
  brandName: string;
  cityName: string;
  navigation: readonly NavigationItem[];
  searchItems: readonly SearchItem[];
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const drawerId = useId();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = openButtonRef.current;
    const inertTargets = [
      ...Array.from(document.querySelectorAll<HTMLElement>("[data-drawer-inert]")),
      ...(trigger ? [trigger] : []),
    ];
    const previousOverflow = document.body.style.overflow;
    inertTargets.forEach((element) => element.setAttribute("inert", ""));
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = document.getElementById(drawerId);
      const focusable = drawer
        ? Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE))
        : [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1) ?? first;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      inertTargets.forEach((element) => element.removeAttribute("inert"));
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [drawerId, open]);

  return (
    <>
      <button
        aria-controls={drawerId}
        aria-expanded={open}
        aria-label="메뉴 열기"
        className="menu-toggle"
        onClick={() => setOpen(true)}
        ref={openButtonRef}
        type="button"
      >
        <MenuIcon />
      </button>
      {open ? (
        <>
          <button
            aria-label="메뉴 닫기"
            className="drawer-backdrop"
            onClick={() => setOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <aside
            aria-labelledby={titleId}
            aria-modal="true"
            className="mobile-drawer"
            id={drawerId}
            role="dialog"
          >
            <div className="drawer-head">
              <span id={titleId}>{brandName} 메뉴</span>
              <button
                aria-label="메뉴 닫기"
                className="drawer-close"
                onClick={() => setOpen(false)}
                ref={closeButtonRef}
                type="button"
              >
                <CloseIcon />
              </button>
            </div>
            <SiteSearch compact cityName={cityName} items={searchItems} />
            <nav aria-label="모바일 주요 메뉴">
              {navigation.map((item) => (
                <SiteLink href={item.href} key={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </SiteLink>
              ))}
            </nav>
          </aside>
        </>
      ) : null}
    </>
  );
}
