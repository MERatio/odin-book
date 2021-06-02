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
		async (email, password, done) => {
			try {
				const currentUser = await User.findOne({ email }).exec();
				if (!currentUser) {
					done(null, false, { message: 'Incorrect email or password.' });
				} else {
					const res = await bcrypt.compare(password, currentUser.password);
					if (res) {
						// Passwords match! log currentUser in
						done(null, currentUser);
					} else {
						// Passwords do not match!
						done(null, false, { message: 'Incorrect email or password.' });
					}
				}
			} catch (err) {
				done(err);
			}
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
		async (jwtPayload, done) => {
			try {
				const currentUser = await User.findById(
					jwtPayload.currentUserId
				).exec();
				done(null, currentUser);
			} catch (err) {
				done(err);
			}
		}
	)
);

module.exports = passport;
