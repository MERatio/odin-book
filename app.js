require('dotenv').config();

const path = require('path');
const { mkdir } = require('fs');
const express = require('express');
const logger = require('morgan');
const passportConfig = require('./configs/passportConfig');
const { setCurrentUser } = require('./lib/middlewares');

mkdir('public/images', { recursive: true }, (err) => {
	if (err) {
		throw err;
	}
});

const app = express();

// Routers
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const friendshipsRouter = require('./routes/friendships');
const postsRouter = require('./routes/posts');
const reactionsRouter = require('./routes/reactions');
const commentsRouter = require('./routes/comments');

// Exlcude connecting to the real database
if (process.env.NODE_ENV !== 'test') {
	// Set up default mongoose connection
	require('./configs/mongoConfig');
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(passportConfig.initialize({ userProperty: 'currentUser' }));
app.use(setCurrentUser);

// Use routers
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/friendships', friendshipsRouter);
app.use('/posts', postsRouter);
app.use('/posts/:postId/reactions', reactionsRouter);
app.use('/posts/:postId/comments', commentsRouter);

// Error handler
app.use((err, req, res, next) => {
	res.status(err.status || 500).send({
		err: { ...err, message: err.message },
	});
});

module.exports = app;
