import Express from 'express';
import Path from 'path';
import Movies from './Movies.js';

const app = Express()
const __dirname = Path.resolve(Path.dirname(''));

// set static folder
app.use(Express.static(Path.join(__dirname, 'public')))

// routes
app.get('/', (req, res) => res.sendFile(Path.join(__dirname, 'public/index.html')));
app.get('/about', (req, res) => res.sendFile(Path.join(__dirname, 'public/about.html')));
app.get('/beer', (req, res) => res.sendFile(Path.join(__dirname, 'public/beer.html')));

// ./title
app.get('/s/:query', async (req, res) => {
    res.send(await Movies.SearchForMovie(req.params.query));
});

// run server
app.listen(process.env.PORT, () => console.log(`Server Running: http://localhost:${process.env.PORT}`));