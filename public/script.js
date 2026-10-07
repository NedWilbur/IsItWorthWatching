import { MAX_QUERY_LENGTH, MIN_VOTE_COUNT, RECOMMENDATION_THRESHOLD, recommendationFor } from "./movies.js";
import { searchTitles } from "./search.js";

const MIN_QUERY_LENGTH = 2;
const SEARCH_DELAY = 300;

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const loadingIndicator = document.querySelector("#loading-indicator");
const resultsPanel = document.querySelector("#results-panel");
const optionsList = document.querySelector("#options");
const optionTemplate = document.querySelector("#movie-option-template");
const filters = document.querySelector(".result-filters");
const verdictMessage = document.querySelector("#verdict");
const voteCountMessage = document.querySelector("#vote-count");
const verdictAnswer = document.querySelector("#verdict-answer");
const issueLink = document.querySelector("#issue-link");
const aboutDialog = document.querySelector("#about-dialog");
const inputMeasureContext = document.createElement("canvas").getContext("2d");

const state = {
    timer: null,
    controller: null,
    movies: [],
    filter: "all",
    activeOption: -1,
};
let inputResizeFrame = 0;
let isComposing = false;

queryInput.maxLength = MAX_QUERY_LENGTH;
document.querySelector("#recommendation-algorithm").textContent =
    `if (votes < ${MIN_VOTE_COUNT})\n    return 'Not enough data.';\nelse if (rating >= ${RECOMMENDATION_THRESHOLD * 10}%)\n    return 'Yes.';\nelse\n    return 'No.';`;

document.querySelector("#about-open").addEventListener("click", () => {
    cancelSearch();
    aboutDialog.showModal();
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isComposing) return;
    const movie = state.movies[state.activeOption] || state.movies[0];
    if (movie) selectMovie(movie);
    else searchMovies();
});

queryInput.addEventListener("input", (event) => {
    resizeQueryInput();
    cancelSearch();
    showMessage("");
    if (isComposing || event.isComposing) return;
    scheduleSearch();
});

queryInput.addEventListener("compositionstart", () => {
    isComposing = true;
    cancelSearch();
});

queryInput.addEventListener("compositionend", () => {
    isComposing = false;
    resizeQueryInput();
    scheduleSearch();
});

function scheduleSearch() {
    clearTimeout(state.timer);
    state.timer = null;
    const query = queryInput.value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
        showMessage(query ? "Keep typing." : "Type a title.");
        return;
    }

    showMessage("Searching…");
    state.timer = setTimeout(searchMovies, SEARCH_DELAY);
}

queryInput.addEventListener("focus", () => queryInput.select());

queryInput.addEventListener("keydown", (event) => {
    if (isComposing || event.isComposing) return;
    if (event.key === "Escape") {
        cancelSearch();
        showMessage("Search closed.");
    } else if (state.movies.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveOption(Math.max(0, Math.min(state.activeOption + step, state.movies.length - 1)), true);
    }
});

filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button || button.dataset.filter === state.filter) return;
    state.filter = button.dataset.filter;
    for (const filterButton of filters.children) {
        filterButton.setAttribute("aria-pressed", String(filterButton === button));
    }
    searchMovies();
});

optionsList.addEventListener("pointermove", (event) => {
    const option = event.target.closest("[data-index]");
    if (option) setActiveOption(Number(option.dataset.index));
});

optionsList.addEventListener("mousedown", (event) => {
    if (event.target.closest("[data-index]")) event.preventDefault();
});

optionsList.addEventListener("click", (event) => {
    const option = event.target.closest("[data-index]");
    if (option) selectMovie(state.movies[Number(option.dataset.index)]);
});

optionsList.addEventListener("error", (event) => {
    if (event.target.tagName === "IMG") event.target.hidden = true;
}, true);

document.addEventListener("pointerdown", (event) => {
    if (!form.contains(event.target)) cancelSearch();
});

function cancelSearch() {
    if (state.timer || state.controller || !resultsPanel.hidden) showMessage("");
    clearTimeout(state.timer);
    state.timer = null;
    state.controller?.abort();
    state.controller = null;
    setLoading(false);
    state.movies = [];
    state.activeOption = -1;
    optionsList.replaceChildren();
    resultsPanel.hidden = true;
    queryInput.setAttribute("aria-expanded", "false");
    queryInput.removeAttribute("aria-activedescendant");
}

async function searchMovies() {
    cancelSearch();
    const query = queryInput.value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
        showMessage(query ? "Keep typing." : "Type a title.");
        return;
    }

    const controller = new AbortController();
    state.controller = controller;
    setLoading(true);
    showMessage("Searching…");

    try {
        const data = await searchTitles(query, state.filter, controller.signal);
        if (state.controller !== controller) return;
        state.movies = data;
        renderOptions();
        showMessage(state.movies.length ? "Which one?" : "No matches.");
    } catch {
        if (state.controller !== controller) return;
        cancelSearch();
        showMessage("fuck, I broke something again.", "", true);
    } finally {
        // A cancelled request must not clear a newer request's loading state.
        if (state.controller === controller) {
            state.controller = null;
            setLoading(false);
        }
    }
}

function renderOptions() {
    const options = state.movies.map((movie, index) => {
        const option = optionTemplate.content.firstElementChild.cloneNode(true);
        option.id = `movie-option-${index}`;
        option.dataset.index = index;
        option.querySelector(".movie-option-title").textContent = movie.title;
        option.querySelector(".movie-option-year").textContent = [
            movie.media_type === "tv" ? "TV" : "Movie", releaseYear(movie),
        ].filter(Boolean).join(" · ");
        option.querySelector(".movie-option-overview").textContent = movie.overview.trim() || "No summary.";

        const poster = option.querySelector("img");
        if (movie.poster_path) poster.src = `https://image.tmdb.org/t/p/w185${movie.poster_path}`;
        else poster.remove();
        return option;
    });

    optionsList.replaceChildren(...options);
    optionsList.hidden = state.movies.length === 0;
    resultsPanel.hidden = false;
    optionsList.scrollTop = 0;
    queryInput.setAttribute("aria-expanded", String(state.movies.length > 0));
}

function setActiveOption(index, scroll = false) {
    if (!optionsList.children[index]) return;
    if (index === state.activeOption) return;
    state.activeOption = index;
    const options = optionsList.children;
    for (const option of options) {
        const isActive = Number(option.dataset.index) === index;
        option.setAttribute("aria-selected", String(isActive));
        option.classList.toggle("is-active", isActive);
    }

    const option = options[index];
    queryInput.setAttribute("aria-activedescendant", option.id);
    if (scroll) {
        const top = option.getBoundingClientRect().top - optionsList.getBoundingClientRect().top;
        const bottom = top + option.offsetHeight;
        if (top < 0) optionsList.scrollTop += top;
        else if (bottom > optionsList.clientHeight) optionsList.scrollTop += bottom - optionsList.clientHeight;
    }
}

function selectMovie(movie) {
    if (!movie) return;
    cancelSearch();
    const year = releaseYear(movie);
    queryInput.value = year ? `${movie.title} (${year})` : movie.title;
    resizeQueryInput();
    const { answer, estimatedVotes } = recommendationFor(movie);
    const voteCaption = estimatedVotes === null ? ""
        : `~${estimatedVotes.toLocaleString()} ${estimatedVotes === 1 ? "person says" : "people say"}`;
    showMessage(answer, voteCaption);
}

function releaseYear(movie) {
    return /^\d{4}/.test(movie.release_date) ? movie.release_date.slice(0, 4) : "";
}

function resizeQueryInput() {
    if (inputResizeFrame) return;
    inputResizeFrame = requestAnimationFrame(() => {
        inputResizeFrame = 0;
        inputMeasureContext.font = getComputedStyle(queryInput).font;
        const text = queryInput.value || queryInput.placeholder;
        queryInput.style.width = `${Math.ceil(inputMeasureContext.measureText(text).width) + 4}px`;
    });
}

function showMessage(message, voteCaption = "", isError = false) {
    verdictAnswer.textContent = message;
    voteCountMessage.textContent = voteCaption;
    voteCountMessage.hidden = !voteCaption;
    issueLink.hidden = !isError;
    verdictMessage.hidden = !message;
}

function setLoading(isLoading) {
    queryInput.setAttribute("aria-busy", String(isLoading));
    loadingIndicator.hidden = !isLoading;
}

window.addEventListener("resize", resizeQueryInput);
resizeQueryInput();
