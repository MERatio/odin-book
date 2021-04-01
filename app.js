require('dotenv').config();

const express = require('express');
const logger = require('morgan');

const app = express();

// Set up default mongoose connection
require('./configs/dbConfig');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

module.exports = app;
