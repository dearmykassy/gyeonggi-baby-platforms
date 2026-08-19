export const WORKER_HOSTING_PROVIDER = "cloudflare-workers-static-assets";
export const PAGE_HOSTING_PROVIDER = "cloudflare-pages";

export function parseEnvFile(text) {
  return new Map(
    text
      .split(/\r?\n/u)
      .filter((line) => line && !line.trimStart().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return separator === -1
          ? [line, ""]
          : [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

export function buildExpectedGa4Sites({ inventory, env }) {
  if (inventory?.sites?.length !== 27) {
    throw new Error(`BABY_GA4_MIGRATION_SITE_COUNT:${inventory?.sites?.length ?? 0}`);
  }

  const sites = inventory.sites.map((site) => {
    const propertyId = env.get(site.gaPropertyIdEnv);
    const measurementId = env.get(site.gaMeasurementIdEnv);
    if (!/^\d+$/u.test(propertyId ?? "")) {
      throw new Error(`BABY_GA4_MIGRATION_PROPERTY_ID_INVALID:${site.key}`);
    }
    if (!/^G-[A-Z0-9]{4,15}$/u.test(measurementId ?? "")) {
      throw new Error(`BABY_GA4_MIGRATION_MEASUREMENT_ID_INVALID:${site.key}`);
    }
    if (
      site.hostingProvider !== PAGE_HOSTING_PROVIDER &&
      site.hostingProvider !== WORKER_HOSTING_PROVIDER
    ) {
      throw new Error(`BABY_GA4_MIGRATION_PROVIDER_INVALID:${site.key}`);
    }

    return {
      key: site.key,
      provider: site.hostingProvider,
      propertyName: `properties/${propertyId}`,
      measurementId,
      plannedOrigin: site.plannedOrigin,
      targetOrigin: site.hostingOrigin,
    };
  });

  const workerCount = sites.filter(
    (site) => site.provider === WORKER_HOSTING_PROVIDER,
  ).length;
  const pageCount = sites.filter(
    (site) => site.provider === PAGE_HOSTING_PROVIDER,
  ).length;
  if (workerCount !== 7 || pageCount !== 20) {
    throw new Error(`BABY_GA4_MIGRATION_PROVIDER_COUNTS:${pageCount}:${workerCount}`);
  }
  if (new Set(sites.map((site) => site.propertyName)).size !== 27) {
    throw new Error("BABY_GA4_MIGRATION_DUPLICATE_PROPERTY");
  }
  if (new Set(sites.map((site) => site.measurementId)).size !== 27) {
    throw new Error("BABY_GA4_MIGRATION_DUPLICATE_MEASUREMENT_ID");
  }
  return sites;
}

export function assessGa4State({ expectedSites, states }) {
  if (states.length !== expectedSites.length) {
    throw new Error(`BABY_GA4_MIGRATION_READBACK_COUNT:${states.length}`);
  }
  const byKey = new Map(states.map((state) => [state.key, state]));
  const assessed = expectedSites.map((site) => {
    const state = byKey.get(site.key);
    if (!state || state.propertyName !== site.propertyName) {
      throw new Error(`BABY_GA4_MIGRATION_PROPERTY_MISMATCH:${site.key}`);
    }
    if (state.streamCount !== 1 || state.webStreamCount !== 1) {
      throw new Error(
        `BABY_GA4_MIGRATION_STREAM_COUNT:${site.key}:${state.streamCount}:${state.webStreamCount}`,
      );
    }
    if (state.measurementId !== site.measurementId) {
      throw new Error(`BABY_GA4_MIGRATION_MEASUREMENT_MISMATCH:${site.key}`);
    }
    if (state.enhancedPageHistoryEffective !== false) {
      throw new Error(`BABY_GA4_MIGRATION_PAGE_HISTORY_ENABLED:${site.key}`);
    }
    if (
      site.provider === PAGE_HOSTING_PROVIDER &&
      state.defaultUri !== site.targetOrigin
    ) {
      throw new Error(`BABY_GA4_MIGRATION_PAGE_URI_DRIFT:${site.key}`);
    }
    if (
      site.provider === WORKER_HOSTING_PROVIDER &&
      state.defaultUri !== site.plannedOrigin &&
      state.defaultUri !== site.targetOrigin
    ) {
      throw new Error(`BABY_GA4_MIGRATION_WORKER_URI_UNEXPECTED:${site.key}`);
    }

    return {
      ...site,
      ...state,
      needsMigration:
        site.provider === WORKER_HOSTING_PROVIDER &&
        state.defaultUri !== site.targetOrigin,
    };
  });

  return {
    sites: assessed,
    migrationPlan: assessed.filter((site) => site.needsMigration),
    pageCount: assessed.filter((site) => site.provider === PAGE_HOSTING_PROVIDER)
      .length,
    workerCount: assessed.filter(
      (site) => site.provider === WORKER_HOSTING_PROVIDER,
    ).length,
    enhancedPageHistoryEnabledCount: assessed.filter(
      (site) => site.enhancedPageHistoryEffective,
    ).length,
  };
}

export function buildSafeReport({ phase, assessment }) {
  return {
    status: "PASS",
    phase,
    siteCount: assessment.sites.length,
    pageSiteCount: assessment.pageCount,
    workerSiteCount: assessment.workerCount,
    oneStreamPerProperty:
      assessment.sites.every(
        (site) => site.streamCount === 1 && site.webStreamCount === 1,
      ),
    measurementIdsMatch: true,
    enhancedPageHistoryEnabledCount:
      assessment.enhancedPageHistoryEnabledCount,
    pendingWorkerUriMigrations: assessment.migrationPlan.map((site) => site.key),
    workerUrisMatchTarget: assessment.sites
      .filter((site) => site.provider === WORKER_HOSTING_PROVIDER)
      .every((site) => site.defaultUri === site.targetOrigin),
    pageUrisUnchanged: assessment.sites
      .filter((site) => site.provider === PAGE_HOSTING_PROVIDER)
      .every((site) => site.defaultUri === site.targetOrigin),
  };
}
