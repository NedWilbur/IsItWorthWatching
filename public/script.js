const ratingFilter = 7;

window.addEventListener('load', function () {
    var search = document.querySelector('#search');
    var result = document.querySelector('#result');

    // create search event listener
    search.addEventListener('input', inputChange);
    inputChange.call(search);
})

function inputChange() {
    var length = this.value.length;
    if (length <= 1) {
        result.innerHTML = null;
        return;
    }

    // resize field
    this.style.width = length + "ch";

    // send request
    var req = new XMLHttpRequest();
    req.open('GET', `/${this.value}`);
    req.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // request results
            var res = JSON.parse(this.response);
            res.vote_average >= ratingFilter ? setResult(true, res.title) : setResult(false, res.title);
        }
    }
    req.send();
}

function setResult(worthWatching, title) {
    if (worthWatching)
        result.innerHTML = title + " - Yes.";
    else
        result.innerHTML = title + " - No.";
}