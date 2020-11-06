const moment = require('moment');

// middleware logger
const log = (req, res, next) => {
    console.log(`[${moment().format()}][${req.protocol}://${req.get('host')}${req.originalUrl}][${req.method}]`);
    next();
}

module.exports = {
    log
};