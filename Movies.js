import {
    MovieDb
} from 'moviedb-promise'
const moviedb = new MovieDb('9b0b73c0081cd92f6455b2bace97c1ca')

// example json
const all = [{
    id: 1,
    name: 'Shrek',
    rating: 99,
}, {
    id: 2,
    name: 'Bambi',
    rating: 59,
}, {
    id: 3,
    name: 'Frozen',
    rating: 32,
}];

const findMovie = async title => {
    // Equivalant to { query: title }
    // const res = await moviedb.searchMovie(title)

    // return res
}

// get 
// 808 = Shrek
function GetMovie(title) {
    moviedb.searchMovie({
        query: title
    }).then(res => {
        console.log(res)
        return res;
    }).catch(console.error)
}

export default {
    all,
    GetMovie
};