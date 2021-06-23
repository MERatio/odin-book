const { body } = require('express-validator');
const passport = require('passport');
const nodeFetch = require('node-fetch');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Picture = require('../models/picture');
const unauthenticated = require('../middlewares/unauthenticated');
const createJwt = require('../lib/createJwt');

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
					req.logIn(currentUser, { session: false }, async (err) => {
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

exports.facebook = [
	unauthenticated,
	async (req, res, next) => {
		// id is included by default.
		const fields = 'first_name,last_name,picture,email';
		const userAccessToken = req.body.userAccessToken;
		const debugTokenUrl = `https://graph.facebook.com/v10.0/debug_token?input_token=${userAccessToken}&access_token=${
			process.env.FACEBOOK_APP_ID + '|' + process.env.FACEBOOK_APP_SECRET
		}`;
		try {
			const debugTokenResponse = await nodeFetch(debugTokenUrl);
			const debugTokenData = await debugTokenResponse.json();
			if (
				!debugTokenData ||
				!debugTokenData.data ||
				!debugTokenData.data.is_valid
			) {
				const err = new Error('User access token is invalid.');
				err.status = 422;
				throw err;
			} else {
				const meUrl = `https://graph.facebook.com/v10.0/me?fields=${fields}&access_token=${userAccessToken}`;
				const meResponse = await nodeFetch(meUrl);
				const meData = await meResponse.json();
				const user = await User.findOne({ email: meData.email }).exec();
				if (user) {
					// If email is taken
					if (user.provider !== 'facebook') {
						const err = new Error(
							'Email is already taken. Sign in to that instead.'
						);
						err.status = 422;
						throw err;
					} else {
						// Sign in
						const jwt = createJwt(user);
						res.json({ jwt, currentUser: user });
					}
				} else {
					const picture = new Picture({
						ofModel: 'User',
						filename: meData.picture.data.url,
						isLocal: false,
					});
					// Create user
					const randomString = nanoid() + process.env.JWT_SECRET;
					const hashedPassword = await bcrypt.hash(randomString, 10);
					const currentUser = new User({
						provider: 'facebook',
						firstName: meData.first_name,
						lastName: meData.last_name,
						email: meData.email,
						password: hashedPassword,
					});
					picture.of = currentUser._id;
					currentUser.picture = picture._id;
					await picture.save();
					await currentUser.save();
					const jwt = createJwt(currentUser);
					/* Initialized (doc = new Model()) and saved documents (savedDoc = await doc.save()) 
						 have the same reference and properties.
					*/
					res.status(201).json({ jwt, currentUser });
				}
			}
		} catch (err) {
			next(err);
		}
	},
];
