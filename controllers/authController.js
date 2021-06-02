const { body } = require('express-validator');
const passport = require('passport');
const unauthenticated = require('../middlewares/unauthenticated');
const createJwt = require('../helpers/createJwt');

exports.local = [
	unauthenticated,
	body('email').normalizeEmail(),
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
							res.json({ jwt, currentUser });
						}
					});
				}
			}
		)(req, res, next);
	},
];
