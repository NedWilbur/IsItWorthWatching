window.addEventListener('load', function () {
    var search = document.querySelector('#search');
    var result = document.querySelector('#result');

    // create search event listener
    search.addEventListener('input', inputChange);
    resizeInput.call(search);
})

function inputChange() {
    var length = this.value.length;

    // resize field
    this.style.width = length + "ch";

    // set result
    if (length > 1)
        setResult(true);
    else
        result.innerHTML = null;
}

function setResult(watch) {
    if (watch)
        result.innerHTML = "Yes.";
    else
        result.innerHTML = "No.";
}