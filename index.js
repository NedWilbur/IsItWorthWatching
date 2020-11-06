const {
    Console
} = require('console');
const express = require('express');
const logger = require('./middleware/logger.js');
const path = require('path');
const tmdb = require('./tmdb.js');

const app = express()
const PORT = process.env.PORT || 5000;

// init body parser for POST
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

// init middleware
app.use(logger.log);

// set static folder
app.use(express.static(path.join(__dirname, 'public')))

// routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public/about.html')));
app.get('/beer', (req, res) => res.sendFile(path.join(__dirname, 'public/beer.html')));

app.post('/query', async (req, res) => {
    res.send(await tmdb.SearchForMovie(req.body.query));
});

// run server
app.listen(PORT, () => console.log(`Server Running: http://localhost:${PORT}`));