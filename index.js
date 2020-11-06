const {
    Console
} = require('console');
const express = require('express');
const path = require('path');
const tmdb = require('./tmdb.js');

const app = express()
const PORT = process.env.PORT || 5000;

// body parser for POST
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

// set static folder
app.use(express.static(path.join(__dirname, 'public')))

// routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public/about.html')));
app.get('/beer', (req, res) => res.sendFile(path.join(__dirname, 'public/beer.html')));

app.post('/query', async (req, res) => {
    console.log(`POST: ${req.body.query}`);
    res.send(await tmdb.SearchForMovie(req.body.query));
});

// run server
app.listen(PORT, () => console.log(`Server Running: http://localhost:${PORT}`));