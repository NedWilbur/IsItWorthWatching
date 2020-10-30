const ratingFilter = 7;
var queryResults = null;

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
        result.innerHTML = null;
        options.innerHTML = null;
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
    req.open('GET', `/${query}`);
    req.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200)
            HandleQueryResults(JSON.parse(this.response));
    }
    req.send();
}

function HandleQueryResults(queryResults) {
    options.innerHTML = null; // clear current results
    queryResults.forEach(movie => {
        var newElement = document.createElement('p');
        newElement.setAttribute('title', movie.title);
        newElement.setAttribute('rating', movie.vote_average);
        newElement.innerHTML = movie.title;
        newElement.addEventListener('click', OptionSelected);
        options.appendChild(newElement); // add to options list


        // options.innerHTML += `<button type="button" id=${movie.id} title="${movie.title}" rating="${movie.vote_average}">`${movie.title}</button></br>`; // add to doc
        // document.getElementById(movie.id).addEventListener('click', OptionSelected);
    }); // create listener
};

function OptionSelected() {
    options.innerHTML = null; // clear options
    search.value = this.getAttribute('title'); // set search option
    ResizeSearchInput();
    SetResult(this.getAttribute('rating'));
}

function SetResult(rating, title) {
    if (rating >= ratingFilter)
        result.innerHTML = title + "</br>Yes.";
    else
        result.innerHTML = title + "</br>No.";
}