const mongoose = require('mongoose');
const mongoDB = process.env.DEV_DB_STRING || process.env.PROD_DB_STRING;
// https://mongoosejs.com/docs/deprecations.html#findandmodify
mongoose.set('useFindAndModify', false);
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
