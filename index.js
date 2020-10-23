const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 5000
const logger = require('./middleware/logger')

// logger middleware
app.use(logger);

// set static folder
app.use(express.static(path.join(__dirname, 'public')))

// set api routes
app.use('/api/movies', require('./routes/api/movies'))

// point all routes to client front end (built version)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// run server
app.listen(PORT, () => {
    console.log(`Server Running: http://localhost:${PORT}`)
})