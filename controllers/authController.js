const passport = require('passport');
const { unauthenticated } = require('../lib/middlewares');
const { createJwt } = require('../lib/helpers');

exports.local = [
	unauthenticated,
	(req, res, next) => {
		passport.authenticate(
			'local',
			{ session: false },
			(err, currentUser, info) => {
				if (err) {
					next(err);
				} else if (!currentUser) {
					const err = new Error(info.message);
					err.status = 401;
					next(err);
				} else {
					req.logIn(currentUser, { session: false }, (err) => {
						if (err) {
							next(err);
						} else {
							/* 
								Email and password matched.
								Generate a signed json web token 
								with object containing the currentUser._id as its payload.
							*/
							const jwt = createJwt(currentUser);
							res.json({ jwt, currentUser: currentUser });
						}
					});
				}
			}
		)(req, res, next);
	},
];
