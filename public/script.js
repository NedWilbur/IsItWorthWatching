const ratingFilter = 7;
var optionsList = null;
var selectedMovie = null;

window.addEventListener('load', function () {
    var search = document.querySelector('#search');
    var options = document.querySelector('#options');
    var result = document.querySelector('#result');

    // create search event listener
    search.addEventListener('input', NewQuery);
    ResizeSearchInput.call(search);
})

function NewQuery() {
    ResizeSearchInput();

    // clear results
    if (search.value.length <= 1) {
        result.innerHTML = '';
        options.innerHTML = '';
        return;
    }

    SendRequest(search.value);
}

function ResizeSearchInput() {
    search.style.width = search.value.length + "ch";
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
    options.innerHTML = ''; // clear current results
    document.getElementById('spinner').hidden = true; // hide spinner

     // handle if no results
     if (queryResults.length <= 0) {
        options.innerHTML = 'Movie not found.';
        return;
    }

    // show results
    queryResults.forEach(movie => {
        // get movie year
        var year = movie.release_date.split('-')[0];

        // create new element
        var newElement = document.createElement('li');
        newElement.setAttribute('id', movie.id);
        newElement.innerHTML = `${movie.title} (${year})`;
        newElement.addEventListener('click', OptionSelected);

        // add to options list
        options.appendChild(newElement);
    });
};

function OptionSelected() {
    selectedMovie = optionsList.filter((movie) => movie.id == this.id);
    options.innerHTML = ''; // clear options
    search.value = this.innerHTML; // set search option
    ResizeSearchInput();
    SetResult(this.getAttribute('rating'));
}

function SetResult(rating) {
    if (rating >= ratingFilter)
        result.innerHTML = "Yes.";
    else
        result.innerHTML = "No.";
}