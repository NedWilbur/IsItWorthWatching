import Express from 'express';
import Path from 'path';
import Movies from './Movies.js';

const app = Express()
const PORT = process.env.PORT || 5000
const __dirname = Path.resolve(Path.dirname(''));

// set static folder
app.use(Express.static(Path.join(__dirname, 'public')))

// point all routes to client front end (built version)
app.get('/', (req, res) => res.sendFile(Path.join(__dirname, 'public/index.html')));

app.get('/:title', async (req, res) => {
    res.send(await Movies.GetMovie(req.params.title));
});

// run server
app.listen(PORT, () => console.log(`Server Running: http://localhost:${PORT}`));