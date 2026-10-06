const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 20;
const MIN_VOTE_COUNT = 20;
const RECOMMENDATION_THRESHOLD = 6;
const SEARCH_DELAY = 300;

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const titleHeading = document.querySelector("#page-title");
const titlePrefix = titleHeading.querySelector(".question-prefix");
const titleEnding = titleHeading.querySelector(".question-ending");
const loadingIndicator = document.querySelector("#loading-indicator");
const optionsList = document.querySelector("#options");
const resultsPanel = document.querySelector("#results-panel");
const filterEmptyMessage = document.querySelector("#filter-empty");
const filterButtons = document.querySelectorAll("[data-filter]");
const aboutDialog = document.querySelector("#about-dialog");
const aboutOpenButton = document.querySelector("#about-open");
const statusMessage = document.querySelector("#search-status");
const verdictMessage = document.querySelector("#verdict");
const inputMeasureCanvas = document.createElement("canvas");
const inputMeasureContext = inputMeasureCanvas.getContext("2d");

let searchTimer;
let verdictHideTimer;
let requestController;
let requestSequence = 0;
let movies = [];
let activeFilter = "all";
let hasSearchRun = false;
let activeOption = -1;
let measuredInputFont = "";
let inputResizeFrame = 0;

aboutOpenButton.addEventListener("click", () => aboutDialog.showModal());

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (activeOption >= 0 && movies[activeOption]) {
        selectMovie(movies[activeOption]);
        return;
    }
    if (!optionsList.hidden && movies[0]) {
        selectMovie(movies[0]);
        return;
    }

    clearTimeout(searchTimer);
    fadeVerdict();
    searchMovies(queryInput.value.trim());
});

queryInput.addEventListener("input", () => {
    titleHeading.classList.remove("has-selection");
    titleHeading.style.fontSize = "";
    resizeQueryInput();
    clearTimeout(searchTimer);
    cancelPendingRequest();
    closeOptions();

    const query = queryInput.value.trim();
    if (!query) {
        setStatus("Search for a movie or TV show.");
        searchTimer = setTimeout(fadeVerdict, SEARCH_DELAY);
        return;
    }
    if (query.length < MIN_QUERY_LENGTH) {
        setStatus("Keep typing for movie suggestions.");
        searchTimer = setTimeout(fadeVerdict, SEARCH_DELAY);
        return;
    }

    setStatus("Finding matches…");
    searchTimer = setTimeout(() => {
        fadeVerdict();
        searchMovies(query);
    }, SEARCH_DELAY);
});

queryInput.addEventListener("focus", () => {
    if (queryInput.value) queryInput.select();
});

queryInput.addEventListener("click", () => {
    if (queryInput.value) queryInput.select();
});

queryInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && !optionsList.hidden) {
        event.preventDefault();
        setActiveOption(Math.min(activeOption + 1, movies.length - 1));
    } else if (event.key === "ArrowUp" && !optionsList.hidden) {
        event.preventDefault();
        setActiveOption(Math.max(activeOption - 1, 0));
    } else if (event.key === "Enter" && activeOption >= 0 && movies[activeOption]) {
        event.preventDefault();
        selectMovie(movies[activeOption]);
    } else if (event.key === "Escape" && !optionsList.hidden) {
        closeOptions();
        setStatus("Search results closed. Keep typing to search again.");
    }
});

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        filterButtons.forEach((filterButton) => {
            filterButton.setAttribute("aria-pressed", String(filterButton === button));
        });
        movies = [];
        optionsList.replaceChildren();
        optionsList.hidden = true;
        filterEmptyMessage.hidden = true;
        resultsPanel.hidden = false;
        activeOption = -1;
        queryInput.setAttribute("aria-expanded", "false");
        queryInput.removeAttribute("aria-activedescendant");
        searchMovies(queryInput.value.trim());
    });
});

function cancelPendingRequest() {
    requestSequence += 1;
    requestController?.abort();
    requestController = null;
    setLoading(false);
}

async function searchMovies(query) {
    if (query.length < MIN_QUERY_LENGTH) {
        setStatus("Keep typing for movie suggestions.");
        return;
    }

    cancelPendingRequest();
    const sequence = requestSequence;
    requestController = new AbortController();
    setLoading(true);
    setStatus("Looking through the movies…");

    try {
        const response = await fetch("/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, media_type: activeFilter }),
            signal: requestController.signal,
        });

        const data = await response.json();
        if (!response.ok) {
            const error = new Error(data?.error || "Title search request failed");
            error.code = data?.code;
            throw error;
        }
        if (sequence !== requestSequence) return;
        if (!Array.isArray(data)) throw new Error("Unexpected title search response");

        hasSearchRun = true;
        movies = data.slice(0, MAX_RESULTS);
        renderOptions();
        setLoading(false);

        if (movies.length) {
            setStatus("Choose the title you mean.");
        } else {
            setStatus(activeFilter === "all"
                ? "No matches found. Try a different title."
                : `No ${activeFilter === "tv" ? "TV shows" : "movies"} found. Try a different title.`);
        }
    } catch (error) {
        if (error.name === "AbortError" || sequence !== requestSequence) return;
        setLoading(false);
        closeOptions();
        setStatus("Ah fuck, something broke.", "error");
    }
}

function renderOptions() {
    optionsList.replaceChildren();
    activeOption = -1;

    movies.forEach((movie, index) => {
        const option = document.createElement("li");
        option.id = `movie-option-${index}`;
        option.className = "movie-option";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");

        const posterFrame = document.createElement("span");
        posterFrame.className = "movie-option-poster-frame";
        posterFrame.setAttribute("aria-hidden", "true");
        if (movie.poster_path) {
            const poster = document.createElement("img");
            poster.className = "movie-option-poster";
            poster.src = `/poster${movie.poster_path}`;
            poster.alt = "";
            poster.loading = "lazy";
            poster.decoding = "async";
            poster.addEventListener("error", () => poster.hidden = true, { once: true });
            posterFrame.append(poster);
        }

        const details = document.createElement("div");
        details.className = "movie-option-info";
        const titleRow = document.createElement("div");
        titleRow.className = "movie-option-title-row";
        const title = document.createElement("span");
        title.className = "movie-option-title";
        title.textContent = movie.title || "Untitled movie";

        const year = releaseYear(movie);
        const metadata = document.createElement("span");
        metadata.className = "movie-option-year";
        metadata.textContent = [movie.media_type === "tv" ? "TV" : "Movie", year].filter(Boolean).join(" · ");
        titleRow.append(title, metadata);

        details.append(titleRow);
        const overview = document.createElement("span");
        overview.className = "movie-option-overview";
        overview.textContent = movie.overview?.trim() || "No summary available.";
        details.append(overview);

        option.append(posterFrame, details);
        option.addEventListener("pointermove", () => setActiveOption(index));
        option.addEventListener("mousedown", (event) => event.preventDefault());
        option.addEventListener("click", () => selectMovie(movie));
        optionsList.append(option);
    });

    resultsPanel.hidden = !hasSearchRun;
    optionsList.hidden = movies.length === 0;
    filterEmptyMessage.hidden = movies.length > 0 || !hasSearchRun;
    if (!movies.length && hasSearchRun) {
        filterEmptyMessage.textContent = activeFilter === "all"
            ? "No matches found."
            : `No ${activeFilter === "tv" ? "TV shows" : "movies"} found.`;
    }
    queryInput.setAttribute("aria-expanded", String(movies.length > 0));
    queryInput.removeAttribute("aria-activedescendant");
}

function setActiveOption(index) {
    activeOption = index;
    const options = optionsList.querySelectorAll('[role="option"]');
    options.forEach((option, optionIndex) => {
        const isActive = optionIndex === index;
        option.setAttribute("aria-selected", String(isActive));
        option.classList.toggle("is-active", isActive);
    });

    if (index >= 0 && options[index]) {
        queryInput.setAttribute("aria-activedescendant", options[index].id);
        options[index].scrollIntoView({ block: "nearest" });
    } else {
        queryInput.removeAttribute("aria-activedescendant");
    }
}

function selectMovie(movie) {
    closeOptions();
    const title = movie.title || "";
    const year = releaseYear(movie);
    queryInput.value = year ? `${title} (${year})` : title;
    titleHeading.classList.add("has-selection");
    resizeQueryInput();
    clearTimeout(verdictHideTimer);
    verdictMessage.classList.remove("is-fading");
    setStatus("");
    showVerdict(movie);
}

function releaseYear(movie) {
    const date = movie.release_date;
    return typeof date === "string" && /^\d{4}/.test(date) ? date.slice(0, 4) : "";
}

function showVerdict(movie) {
    const voteCount = Number(movie.vote_count) || 0;
    const rating = Number(movie.vote_average) || 0;
    const hasEnoughVotes = voteCount > MIN_VOTE_COUNT;
    const worthWatching = hasEnoughVotes && rating >= RECOMMENDATION_THRESHOLD;

    const verdict = worthWatching ? "Yes." : "No.";
    verdictMessage.textContent = verdict;
    verdictMessage.hidden = false;
    requestAnimationFrame(() => verdictMessage.classList.remove("is-fading"));
}

function closeOptions() {
    optionsList.replaceChildren();
    optionsList.hidden = true;
    resultsPanel.hidden = true;
    filterEmptyMessage.hidden = true;
    movies = [];
    hasSearchRun = false;
    activeOption = -1;
    queryInput.setAttribute("aria-expanded", "false");
    queryInput.removeAttribute("aria-activedescendant");
}

function fadeVerdict() {
    if (verdictMessage.hidden) return;
    verdictMessage.classList.add("is-fading");
    clearTimeout(verdictHideTimer);
    verdictHideTimer = setTimeout(() => {
        verdictMessage.hidden = true;
        verdictMessage.classList.remove("is-fading");
    }, 180);
}

function resizeQueryInput() {
    if (inputResizeFrame) return;
    inputResizeFrame = requestAnimationFrame(() => {
        inputResizeFrame = 0;
        titleHeading.style.fontSize = "";
        let styles = getComputedStyle(queryInput);
        if (measuredInputFont !== styles.font) measuredInputFont = styles.font;
        inputMeasureContext.font = measuredInputFont;
        const text = queryInput.value || queryInput.placeholder;
        const minimumText = queryInput.value ? "m" : queryInput.placeholder;
        const minimumWidth = inputMeasureContext.measureText(minimumText).width + 2;
        const textWidth = inputMeasureContext.measureText(text).width + 2;
        const desiredWidth = Math.ceil(Math.max(minimumWidth, textWidth));

        if (titleHeading.classList.contains("has-selection")) {
            const gap = Number.parseFloat(getComputedStyle(titleHeading).columnGap) || 0;
            const fixedWidth = titlePrefix.getBoundingClientRect().width
                + titleEnding.getBoundingClientRect().width
                + gap * 2;
            const baseFontSize = Number.parseFloat(getComputedStyle(titleHeading).fontSize);
            const fitScale = Math.min(1, titleHeading.clientWidth / (fixedWidth + desiredWidth));
            if (fitScale < 1) {
                titleHeading.style.fontSize = `${Math.max(14, baseFontSize * fitScale)}px`;
            }

            styles = getComputedStyle(queryInput);
            measuredInputFont = styles.font;
            inputMeasureContext.font = measuredInputFont;
            const fittedTextWidth = inputMeasureContext.measureText(text).width + 2;
            const fittedMinimumWidth = inputMeasureContext.measureText(minimumText).width + 2;
            queryInput.style.width = `${Math.ceil(Math.max(fittedMinimumWidth, fittedTextWidth))}px`;
        } else {
            queryInput.style.width = `${desiredWidth}px`;
        }
    });
}

window.addEventListener("resize", resizeQueryInput);

function setStatus(message, kind = "") {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", kind === "error");
}

function setLoading(isLoading) {
    queryInput.setAttribute("aria-busy", String(isLoading));
    loadingIndicator.hidden = !isLoading;
}

resizeQueryInput();
