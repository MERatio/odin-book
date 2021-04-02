const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const passportJWT = require('passport-jwt');
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const User = require('../models/user');

// The strategy is called when passport.authenticate('local', ...) is called.
passport.use(
	new LocalStrategy(
		{
			usernameField: 'email',
		},
		(email, password, done) => {
			User.findOne({ email }, (err, currentUser) => {
				if (err) {
					done(err);
				} else if (!currentUser) {
					done(null, false, { message: 'Incorrect email or password.' });
				} else {
					bcrypt.compare(password, currentUser.password, (err, res) => {
						if (res) {
							// Passwords match! log currentUser in
							done(null, currentUser);
						} else {
							// Passwords do not match!
							done(null, false, { message: 'Incorrect email or password.' });
						}
					});
				}
			});
		}
	)
);

// The strategy is called when passport.authenticate('jwt', ...) is called.
passport.use(
	new JWTStrategy(
		{
			jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
			secretOrKey: process.env.JWT_SECRET,
		},
		(jwtPayload, done) => {
			User.findById(jwtPayload.currentUserId, (err, currentUser) => {
				err ? done(err) : done(null, currentUser);
			});
		}
	)
);

module.exports = passport;
