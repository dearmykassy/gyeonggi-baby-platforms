type JsonLdProps = {
  data: unknown;
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: safeJson(data) }}
      type="application/ld+json"
    />
  );
}
