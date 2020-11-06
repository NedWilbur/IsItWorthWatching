const {
    MovieDb
} = require('moviedb-promise');
const moviedb = new MovieDb('9b0b73c0081cd92f6455b2bace97c1ca');

async function SearchForMovie(searchQuery) {
    console.log(`Searching for movie: ${searchQuery}`);
    const results = await moviedb.searchMovie({
        query: searchQuery
    }).then(res => {
        var results = res.results;
        results.sort((a, b) => b.vote_count - a.vote_count)
        return results;
    }).catch(console.error)

    return results;
}

module.exports = {
    SearchForMovie
};