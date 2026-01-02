export function toSlug(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Replace spaces with -
        .replace(/[^\w-]+/g, "") // Remove all non-word chars
        .replace(/--+/g, "-") // Replace multiple - with single -
        .replace(/^-+/, "") // Trim - from start
        .replace(/-+$/, ""); // Trim - from end
}

export function createSlugId(slug: string, publicId: string): string {
    const cleanSlug = toSlug(slug);
    // If slug is empty (e.g. from unnamed entity), just return publicId?
    // Or dash? Let's assume we want slug--id if slug exists, or just id if not.
    if (!cleanSlug) return publicId;
    return `${cleanSlug}--${publicId}`;
}

export function parseSlugId(param: string): { slug: string | null; publicId: string } {
    // Check if format is slug--id
    // We split by '--' looking from the right to ensure we get the ID correctly
    // even if the slug contains '--' (though toSlug prevents that).
    // Actually, toSlug prevents double dashes, so we can split by '--'.

    const parts = param.split("--");

    if (parts.length < 2) {
        // Assume it's just the ID (canonical ID lookups or legacy URLs)
        return { slug: null, publicId: param };
    }

    // ID is the last part
    const publicId = parts.pop()!;
    // Slug is the rest joined back (just in case, though we don't expect extra dashes)
    const slug = parts.join("--");

    return { slug, publicId };
}
