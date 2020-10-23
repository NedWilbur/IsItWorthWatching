const express = require('express')
const router = express.Router();
const movies = require('../../Movies')

// get all movies
router.get('/', (req, res) => res.json(movies))

// get single movie
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id); // get ID from get request
    const found = movies.some(movie => movie.id === id) // check if exists

    if (found)
        res.json(movies.filter(movie => movie.id === id))
    else
        res.status(400).json({
            msg: `No movie with the ID of ${id} found.`
        })
})

module.exports = router;