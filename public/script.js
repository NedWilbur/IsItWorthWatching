const ratingFilter = 6;
const voteCountThreshhold = 25;
let optionsList = null;
let selectedMovie = null;
let queryEle = null;
let optionsEle = null;
let resultEle = null;
let timeout = null;


window.addEventListener('load', function () {
    queryEle = document.getElementById('query');
    optionsEle = document.getElementById('options');
    resultEle = document.getElementById('result');

    // create search event listener
    queryEle.addEventListener('input', NewQuery);
    ResizeSearchInput.call(queryEle);
})

function NewQuery() {
    ResizeSearchInput();

    // clear results
    if (queryEle.value.length <= 1) {
        resultEle.innerHTML = '';
        optionsEle.innerHTML = '';
        return;
    }

    // wait 500ms before sending request
    clearTimeout(timeout);
    timeout = setTimeout(function () {
        SendRequest(queryEle.value);
    }, 500);
}

function ResizeSearchInput() {
    queryEle.style.width = queryEle.value.length + 'ch';
}

function SendRequest(query) {
    // send request
    var req = new XMLHttpRequest();
    req.open('GET', `/s/${query}`);
    req.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200)
            HandleQueryResults(JSON.parse(this.response));
    }
    req.send();
    document.getElementById('spinner').hidden = false; // show spinner
}

function HandleQueryResults(queryResults) {
    optionsList = queryResults;
    optionsEle.innerHTML = ''; // clear current results
    document.getElementById('spinner').hidden = true; // hide spinner

    // handle if no results
    if (queryResults.length <= 0) {
        optionsEle.innerHTML = 'Movie not found.';
        return;
    }

    // show results
    queryResults.forEach(movie => {
        // create new element
        var newElement = document.createElement('li');
        newElement.setAttribute('id', movie.id);
        newElement.innerHTML = `${movie.title} ${GetReleaseYear(movie)}`;
        newElement.addEventListener('click', OptionSelected);

        // add to options list
        optionsEle.appendChild(newElement);
    });
};

function GetReleaseYear(movie) {
    if (movie.release_date != null || movie.release_date <= 0) {
        return `(${movie.release_date.split('-')[0]})`;
    } else {
        return '(?)'
    }
}

function OptionSelected() {
    selectedMovie = optionsList.filter((movie) => movie.id == this.id)[0];
    optionsEle.innerHTML = ''; // clear options
    queryEle.value = this.innerHTML; // set search option
    ResizeSearchInput();

    if (selectedMovie.vote_count <= voteCountThreshhold)
        resultEle.innerHTML = 'Not enough data.';
    else
        selectedMovie.vote_average >= ratingFilter ?
        resultEle.innerHTML = 'Yes.' :
        resultEle.innerHTML = 'No.';



}