require('dotenv').config();

const express = require('express');
const logger = require('morgan');
const passportConfig = require('./configs/passportConfig');
const { setCurrentUser } = require('./lib/middlewares');

const app = express();

// Routers
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

// Set up default mongoose connection
require('./configs/dbConfig');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(passportConfig.initialize({ userProperty: 'currentUser' }));
app.use(setCurrentUser);

// Use routers
app.use('/auth', authRouter);
app.use('/users', usersRouter);

// Error handler
app.use((err, req, res, next) => {
	res.status(err.status || 500).send({
		err: { ...err, message: err.message },
	});
});

module.exports = app;
