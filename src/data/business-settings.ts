export type BusinessContactPhone = {
  domestic: string;
  display: string;
  e164: string;
  telHref: `tel:${string}`;
};

export const BUSINESS_CONTACT_PHONES = {
  primary: {
    domestic: "05082023906",
    display: "0508-202-3906",
    e164: "+825082023906",
    telHref: "tel:05082023906",
  },
} as const satisfies Record<string, BusinessContactPhone>;

export type BusinessContactPhoneId = keyof typeof BUSINESS_CONTACT_PHONES;

export const DEFAULT_BUSINESS_CONTACT_PHONE_ID: BusinessContactPhoneId =
  "primary";

/*
 * Region-specific numbers can be added here without changing the shared
 * landing template. Unassigned regions always use the verified primary number.
 */
export const REGION_CONTACT_PHONE_IDS: Readonly<
  Record<string, BusinessContactPhoneId>
> = {};

export function getRegionContactPhone(
  regionPath: string,
): BusinessContactPhone {
  const phoneId =
    REGION_CONTACT_PHONE_IDS[regionPath] ?? DEFAULT_BUSINESS_CONTACT_PHONE_ID;

  return BUSINESS_CONTACT_PHONES[phoneId];
}

export const DEFAULT_BUSINESS_CONTACT_PHONE =
  BUSINESS_CONTACT_PHONES[DEFAULT_BUSINESS_CONTACT_PHONE_ID];
