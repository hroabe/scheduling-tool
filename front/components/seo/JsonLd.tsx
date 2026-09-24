/**
 * Renders schema.org structured data as a JSON-LD script tag.
 * Safe to use from Server Components.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
    return (
        <script
            type="application/ld+json"
            // Escape "<" so user-controlled strings can never close the script tag
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
    );
}
