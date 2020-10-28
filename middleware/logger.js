import moment from 'moment';

// middleware logger
const logger = (req, res, next) => {
    console.log(`${moment().format()}: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    next();
}

export default {
    logger
};