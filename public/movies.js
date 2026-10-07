// Shared rules and response contract for the browser and Worker.
export const MAX_QUERY_LENGTH = 100;
export const MAX_RESULTS = 20;
export const MIN_VOTE_COUNT = 50;
export const RECOMMENDATION_THRESHOLD = 6;

export function isPosterPath(value) {
    return typeof value === "string" && /^\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(value);
}

export function isMovie(value) {
    return value !== null && typeof value === "object"
        && (value.media_type === "movie" || value.media_type === "tv")
        && typeof value.title === "string" && value.title.trim().length > 0
        && typeof value.release_date === "string"
        && typeof value.overview === "string"
        && (value.poster_path === null || isPosterPath(value.poster_path))
        && Number.isFinite(value.vote_average) && value.vote_average >= 0 && value.vote_average <= 10
        && Number.isSafeInteger(value.vote_count) && value.vote_count >= 0;
}

export function recommendationFor(movie) {
    if (movie.vote_count < MIN_VOTE_COUNT) {
        return { answer: "Not enough data.", estimatedVotes: null };
    }
    const worthWatching = movie.vote_average >= RECOMMENDATION_THRESHOLD;
    return {
        answer: worthWatching ? "Yes." : "No.",
        estimatedVotes: Math.round(movie.vote_count * (worthWatching ? 0.4 : 0.6)),
    };
}
