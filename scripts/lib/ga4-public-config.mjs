const GA4_ACCOUNT_PATTERN = /^accounts\/\d+$/u;

export function resolveGa4Account({ cliAccount, envAccount } = {}) {
  const account = cliAccount ?? envAccount;
  if (account === undefined || account === null || account === "") {
    throw new Error("BABY_GA4_ACCOUNT_REQUIRED");
  }
  if (typeof account !== "string" || !GA4_ACCOUNT_PATTERN.test(account)) {
    throw new Error("BABY_GA4_ACCOUNT_INVALID");
  }
  return account;
}

export function buildGa4DryRunReport({ account, configured }) {
  return {
    status: "DRY_RUN",
    account,
    ready: configured.filter((item) => item.action === "READY").length,
    create: configured.filter((item) => item.action !== "READY").length,
    configured,
  };
}
