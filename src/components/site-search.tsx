"use client";

import { useId, useMemo, useState } from "react";

import { SearchIcon } from "@/components/icons";
import { SiteLink } from "@/components/site-link";

export type SearchItem = {
  href: string;
  label: string;
  context?: string;
};

function normalize(value: string) {
  return value.normalize("NFC").replace(/\s+/g, "").toLocaleLowerCase("ko-KR");
}

export function SiteSearch({
  items,
  cityName,
  compact = false,
}: {
  items: readonly SearchItem[];
  cityName: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const listId = useId();
  const matches = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return [];
    return items
      .filter((item) => normalize(`${item.label}${item.context ?? ""}`).includes(needle))
      .slice(0, 8);
  }, [items, query]);
  const open = focused && query.trim().length > 0;

  return (
    <div className={`site-search${compact ? " site-search--compact" : ""}`}>
      <form
        action="/areas/"
        className="site-search__form"
        role="search"
        onSubmit={(event) => {
          if (!matches[0]) return;
          event.preventDefault();
          window.location.assign(matches[0].href);
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>
          {cityName} 하위 지역 검색
        </label>
        <input
          aria-describedby={`${listId}-status`}
          autoComplete="off"
          id={`${listId}-input`}
          name="q"
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setFocused(false);
              event.currentTarget.blur();
            }
          }}
          placeholder={`${cityName} 지역명 검색`}
          type="search"
          value={query}
        />
        <button aria-label="검색" type="submit">
          <SearchIcon />
        </button>
      </form>
      <p className="sr-only" id={`${listId}-status`} role="status">
        {query.trim() ? (matches.length ? `${matches.length}개 지역 결과` : "검색 결과 없음") : "지역명을 입력하세요"}
      </p>
      {open ? (
        <div aria-label="검색 결과" className="site-search__results" id={listId} role="region">
          {matches.length ? (
            matches.map((item) => (
              <SiteLink
                href={item.href}
                key={item.href}
                onClick={() => setFocused(false)}
              >
                <span>{item.label}</span>
                {item.context ? <small>{item.context}</small> : null}
              </SiteLink>
            ))
          ) : (
            <p role="status">해당 지역을 찾지 못했습니다.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
