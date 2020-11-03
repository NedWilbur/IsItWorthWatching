const Express = require('express');
const Path = require('path');
const Tmdb = require('./tmdb.js');

const app = Express()
const PORT = process.env.PORT || 5000;

// set static folder
app.use(Express.static(Path.join(__dirname, 'public')))

// routes
app.get('/', (req, res) => res.sendFile(Path.join(__dirname, 'public/index.html')));
app.get('/about', (req, res) => res.sendFile(Path.join(__dirname, 'public/about.html')));
app.get('/beer', (req, res) => res.sendFile(Path.join(__dirname, 'public/beer.html')));

// ./title
app.get('/s/:query', async (req, res) => {
    res.send(await Tmdb.SearchForMovie(req.params.query));
});

// run server
app.listen(PORT, () => console.log(`Server Running: http://localhost:${PORT}`));