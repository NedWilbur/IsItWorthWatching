import {
    MovieDb
} from 'moviedb-promise'
const moviedb = new MovieDb('9b0b73c0081cd92f6455b2bace97c1ca')

async function SearchForMovie(query) {
    console.log(`Searching for ${query}`);

    const results = await moviedb.searchMovie({
        query: query
    }).then(res => {
        return res.results;
    }).catch(console.error)

    return results;
}

export default {
    SearchForMovie
};