require('dotenv').config();

const express = require('express');
const logger = require('morgan');

const app = express();

// Routers
const usersRouter = require('./routes/users');

// Set up default mongoose connection
require('./configs/dbConfig');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use routers
app.use('/users', usersRouter);

module.exports = app;
