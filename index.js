import Express from 'express';
import Path from 'path';
import movies from './Movies.js';

const app = Express()
const PORT = process.env.PORT || 5000
const __dirname = Path.resolve(Path.dirname(''));

// set static folder
app.use(Express.static(Path.join(__dirname, 'public')))

// point all routes to client front end (built version)
app.get('/', (req, res) => res.sendFile(Path.join(__dirname, 'public/index.html')));

// API routes
app.get('/api', (req, res) => {
    console.log(`Sending all`)
    npm
    res.json(movies.all);
});

app.get('/api/test', (req, res) => {
    var id = req.params.id;
    console.log(`Running Test`);

    res.json(movies.GetMovie('Shrek'));
});

app.get('/api/:id', (req, res) => {
    var id = req.params.id;
    console.log(`Searching for id=${id}`);

    res.json(movies.all.filter(movies => movies.id === parseInt(id)))
});

// run server
app.listen(PORT, () => console.log(`Server Running: http://localhost:${PORT}`));