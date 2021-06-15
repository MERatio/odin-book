require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('morgan');
const compression = require('compression');
const paginate = require('express-paginate');
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
/* First parameter is used if req.query.limit is not supplied. 
	   Not a minimum value.
	 Second parameter is max value of req.query.limit.
*/
app.use(paginate.middleware(10, 50));
/* Set pagination default or minimum limit per page.
	 This override paginate.middleware() first parameter.
*/
app.get(['/users', '/posts'], (req, res, next) => {
	if (req.query.limit < 9) {
		req.query.limit = 10;
	}
	next();
});

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
