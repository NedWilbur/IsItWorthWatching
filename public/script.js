const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 7;
const MIN_VOTE_COUNT = 20;
const RECOMMENDATION_THRESHOLD = 6;
const SEARCH_DELAY = 300;

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query");
const optionsList = document.querySelector("#options");
const statusMessage = document.querySelector("#search-status");
const resultCard = document.querySelector("#result");
const spinner = document.querySelector("#spinner");
const clearButton = document.querySelector("#clear-search");

let searchTimer;
let requestController;
let requestSequence = 0;
let movies = [];
let activeOption = -1;

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
    searchMovies(queryInput.value.trim());
});

queryInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    cancelPendingRequest();
    closeOptions();
    hideResult();
    updateClearButton();

    const query = queryInput.value.trim();
    if (!query) {
        setStatus("Search by movie title to get started.");
        return;
    }
    if (query.length < MIN_QUERY_LENGTH) {
        setStatus("Keep typing for movie suggestions.");
        return;
    }

    setStatus("Finding movie matches…");
    searchTimer = setTimeout(() => searchMovies(query), SEARCH_DELAY);
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

clearButton.addEventListener("click", () => {
    clearTimeout(searchTimer);
    cancelPendingRequest();
    queryInput.value = "";
    closeOptions();
    hideResult();
    updateClearButton();
    setStatus("Search by movie title to get started.");
    queryInput.focus();
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
            body: JSON.stringify({ query }),
            signal: requestController.signal,
        });

        if (!response.ok) throw new Error("Movie search request failed");
        const data = await response.json();
        if (sequence !== requestSequence) return;
        if (!Array.isArray(data)) throw new Error("Unexpected movie search response");

        movies = data.slice(0, MAX_RESULTS);
        renderOptions();
        setLoading(false);

        if (movies.length) {
            setStatus("Choose the movie you mean.");
        } else {
            setStatus("No movies found. Try a different title.");
        }
    } catch (error) {
        if (error.name === "AbortError" || sequence !== requestSequence) return;
        setLoading(false);
        closeOptions();
        setStatus("Search took a wrong turn. Please try again.", "error");
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

        const title = document.createElement("span");
        title.className = "movie-option-title";
        title.textContent = movie.title || "Untitled movie";

        const details = document.createElement("span");
        details.className = "movie-option-details";
        details.textContent = [releaseYear(movie), movie.vote_count ? `${formatCount(movie.vote_count)} votes` : ""].filter(Boolean).join(" · ");

        const arrow = document.createElement("span");
        arrow.className = "movie-option-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↗";

        option.append(title, details, arrow);
        option.addEventListener("pointermove", () => setActiveOption(index));
        option.addEventListener("mousedown", (event) => event.preventDefault());
        option.addEventListener("click", () => selectMovie(movie));
        optionsList.append(option);
    });

    optionsList.hidden = movies.length === 0;
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
    queryInput.value = movie.title || "";
    updateClearButton();
    setStatus("");
    showVerdict(movie);
}

function showVerdict(movie) {
    const voteCount = Number(movie.vote_count) || 0;
    const rating = Number(movie.vote_average) || 0;
    const hasEnoughVotes = voteCount > MIN_VOTE_COUNT;
    const recommendation = hasEnoughVotes
        ? rating >= RECOMMENDATION_THRESHOLD
            ? { kind: "yes", symbol: "✓", headline: "Yes. Worth a watch.", copy: "The crowd gives it a solid thumbs-up. Go in with reasonable expectations." }
            : { kind: "no", symbol: "×", headline: "Probably not.", copy: "The crowd didn’t fall for it. There are plenty of other movies." }
        : { kind: "unsure", symbol: "?", headline: "The jury’s still out.", copy: "Not enough ratings yet to call it. You could be the tie-breaker." };

    resultCard.className = `result-card verdict-${recommendation.kind}`;
    resultCard.replaceChildren();
    resultCard.hidden = false;

    const verdict = document.createElement("div");
    verdict.className = "verdict-heading";
    const icon = document.createElement("span");
    icon.className = "verdict-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = recommendation.symbol;

    const wording = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "verdict-eyebrow";
    eyebrow.textContent = "Our very scientific verdict";
    const headline = document.createElement("h2");
    headline.textContent = recommendation.headline;
    const explanation = document.createElement("p");
    explanation.className = "verdict-copy";
    explanation.textContent = recommendation.copy;
    wording.append(eyebrow, headline, explanation);
    verdict.append(icon, wording);

    const details = document.createElement("div");
    details.className = "movie-rating";
    const name = document.createElement("p");
    name.className = "movie-rating-title";
    name.textContent = [movie.title, releaseYear(movie)].filter(Boolean).join(" · ");
    const score = document.createElement("p");
    score.className = "movie-rating-score";
    score.append(document.createTextNode(rating.toFixed(1) + " "));
    const scale = document.createElement("span");
    scale.textContent = "/ 10";
    score.append(scale);
    const scoreLabel = document.createElement("span");
    scoreLabel.className = "rating-votes";
    scoreLabel.textContent = `${formatCount(voteCount)} TMDB ratings`;
    details.append(name, score, scoreLabel);

    resultCard.append(verdict, details);
}

function releaseYear(movie) {
    const date = movie.release_date;
    return typeof date === "string" && /^\d{4}/.test(date) ? date.slice(0, 4) : "";
}

function formatCount(value) {
    return new Intl.NumberFormat().format(value);
}

function closeOptions() {
    optionsList.replaceChildren();
    optionsList.hidden = true;
    movies = [];
    activeOption = -1;
    queryInput.setAttribute("aria-expanded", "false");
    queryInput.removeAttribute("aria-activedescendant");
}

function hideResult() {
    resultCard.hidden = true;
    resultCard.replaceChildren();
}

function setStatus(message, kind = "") {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", kind === "error");
}

function setLoading(isLoading) {
    spinner.hidden = !isLoading;
    queryInput.setAttribute("aria-busy", String(isLoading));
}

function updateClearButton() {
    clearButton.hidden = queryInput.value.length === 0;
}
