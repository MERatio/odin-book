require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('morgan');
const compression = require('compression');
const passportConfig = require('./configs/passportConfig');
const setCurrentUser = require('./middlewares/setCurrentUser');

const app = express();

// CORS
const allowedOrigins = [
	'http://localhost:3000',
	'https://localhost:3000',
	'https://meratio.github.io',
];
app.use(
	cors({
		origin(origin, callback) {
			if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		optionsSuccessStatus: 200,
	})
);

app.use(helmet());

// Routers
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const picturesRouter = require('./routes/pictures');
const friendshipsRouter = require('./routes/friendships');
const postsRouter = require('./routes/posts');
const reactionsRouter = require('./routes/reactions');
const commentsRouter = require('./routes/comments');

// Exlcude connecting to the real database.
// Jest automatically defines environment variable NODE_ENV as test.
if (process.env.NODE_ENV !== 'test') {
	// Set up default mongoose connection
	require('./configs/mongoConfig');
}

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression()); // Compress all routes
app.use(passportConfig.initialize({ userProperty: 'currentUser' }));
app.use(setCurrentUser);

function setPaginationVariables(
	req,
	noDocsName,
	pageName,
	limitName,
	skipName
) {
	const page = parseInt(req.query[pageName], 10);
	const limit = parseInt(req.query[limitName], 10);

	if (req.query[noDocsName] === 'true') {
		req.query[noDocsName] = true;
	} else {
		req.query[noDocsName] = false;
	}

	if (isNaN(page) || page < 1) {
		req.query[pageName] = 1;
	} else {
		req.query[pageName] = page;
	}

	if (isNaN(limit) || limit < 10) {
		req.query[limitName] = 10;
	} else if (limit > 50) {
		req.query[limitName] = 50;
	} else {
		req.query[limitName] = limit;
	}

	req[skipName] = (req.query[pageName] - 1) * req.query[limitName];
}
app.get(
	[
		'/users',
		'/users/:userId/friend-requests',
		'/users/:userId/friends',
		'/users/:userId/posts',
		'/posts',
		'/posts/:postId/reactions',
		'/posts/:postId/comments',
	],
	(req, res, next) => {
		setPaginationVariables(req, 'noDocs', 'page', 'limit', 'skip');
		next();
	}
);

// Use routers
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/pictures', picturesRouter);
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
