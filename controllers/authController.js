const { body } = require('express-validator');
const passport = require('passport');
const { unauthenticated } = require('../lib/middlewares');
const { createJwt } = require('../lib/helpers');

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

exports.facebookOauth = [
	unauthenticated,
	passport.authenticate('facebook', { session: false, scope: ['email'] }),
];

exports.facebookCallback = [
	unauthenticated,
	(req, res, next) => {
		passport.authenticate(
			'facebook',
			{ session: false },
			(err, currentUser, info) => {
				if (err) {
					if (err.message === 'email-required') {
						res.redirect('/auth/facebook/rerequest');
					} else {
						next(err);
					}
				} else if (!currentUser) {
					const err = new Error(info.message);
					err.status = 401;
					next(err);
				} else {
					req.logIn(currentUser, { session: false }, (err) => {
						if (err) {
							next(err);
						} else {
							const jwt = createJwt(currentUser);
							res.json({ jwt, currentUser });
						}
					});
				}
			}
		)(req, res, next);
	},
];

// Rerequest for email if Facebook user didn't give permission to use their email.
exports.facebookRerequest = [
	unauthenticated,
	passport.authenticate('facebook', {
		session: false,
		scope: ['email'],
		authType: 'rerequest',
	}),
];
