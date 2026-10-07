import { isMovie, MAX_RESULTS } from "./movies.js";

const SEARCH_TIMEOUT = 10000;

export async function searchTitles(query, mediaType, signal) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    const timer = setTimeout(cancel, SEARCH_TIMEOUT);

    try {
        const response = await fetch("/query", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query, media_type: mediaType }),
            signal: controller.signal,
        });
        if (!response.ok) throw new Error("Title search request failed");

        const results = await response.json();
        if (!Array.isArray(results) || results.length > MAX_RESULTS || !results.every(isMovie)) {
            throw new Error("Unexpected title search response");
        }
        return results;
    } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
    }
}
