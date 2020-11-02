const ratingFilter = 7;
var optionsList = null;
var selectedMovie = null;
var queryEle = null;
var optionsEle = null;
var resultEle = null;

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

    SendRequest(queryEle.value);
}

function ResizeSearchInput() {
    queryEle.style.width = queryEle.value.length + "ch";
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
        // get movie year
        var year = movie.release_date.split('-')[0];
        year.length <= 0 ? year = "" : year = `(${year})`; // Handle unknown year

        // create new element
        var newElement = document.createElement('li');
        newElement.setAttribute('id', movie.id);
        newElement.innerHTML = `${movie.title} ${year}`;
        newElement.addEventListener('click', OptionSelected);

        // add to options list
        optionsEle.appendChild(newElement);
    });
};

function OptionSelected() {
    selectedMovie = optionsList.filter((movie) => movie.id == this.id);
    optionsEle.innerHTML = ''; // clear options
    queryEle.value = this.innerHTML; // set search option
    ResizeSearchInput();
    SetResult(this.getAttribute('rating'));

    // set background image
    // document.getElementById('backdrop').src = 'https://image.tmdb.org/t/p/original/' +  selectedMovie.backdrop_path;
}

function SetResult(rating) {
    if (rating >= ratingFilter)
        resultEle.innerHTML = "Yes.";
    else
        resultEle.innerHTML = "No.";
}