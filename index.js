import Express from 'express';
import Path from 'path';
import Movies from './Movies.js';

const app = Express()
const PORT = process.env.PORT || 5000
const __dirname = Path.resolve(Path.dirname(''));

// body parser middleware (required for post)
app.use(Express.json());
app.use(Express.urlencoded({
    extended: false
}));

// set static folder
app.use(Express.static(Path.join(__dirname, 'public')))

// point all routes to client front end (built version)
app.get('/', (req, res) => res.sendFile(Path.join(__dirname, 'public/index.html')));

// ./title
app.get('/:title', async (req, res) => {
    res.send(await Movies.GetMovie(req.params.title));
});

// form search
app.post('/search', async (req, res) => {
    const query = req.body.query;
    res.send(await Movies.GetMovie(query));
});

// run server
app.listen(PORT, () => console.log(`Server Running: http://localhost:${PORT}`));