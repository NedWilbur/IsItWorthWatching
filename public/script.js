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
    if (length <= 1) return;

    // resize field
    this.style.width = length + "ch";

    // send request
    var req = new XMLHttpRequest();
    req.open('GET', `/${this.value}`);
    req.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // request results
            var res = JSON.parse(this.response);
            res.vote_average >= ratingFilter ? setResult(true) : setResult(false);
        }
    }
    req.send();

    // set result
    // if (length > 1)
    //     setResult(true);
    // else
    //     result.innerHTML = null;
}

function setResult(watch) {
    if (watch)
        result.innerHTML = "Yes.";
    else
        result.innerHTML = "No.";
}