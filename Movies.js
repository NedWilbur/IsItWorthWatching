import {
    MovieDb
} from 'moviedb-promise'
const moviedb = new MovieDb('9b0b73c0081cd92f6455b2bace97c1ca')

async function GetMovie(title) {
    console.log(`Searching for ${title}`);

    const result = await moviedb.searchMovie({
        query: title
    }).then(res => {
        const firstResult = res.results[0];
        console.log(firstResult);
        return firstResult;
    }).catch(console.error)

    return result;
}

export default {
    GetMovie
};