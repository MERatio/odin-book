const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const bcrypt = require('bcryptjs');
const passportJWT = require('passport-jwt');
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;
const { nanoid } = require('nanoid');
const User = require('../models/user');
const Provider = require('../models/provider');

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

passport.use(
	new FacebookStrategy(
		{
			clientID: process.env.FACEBOOK_APP_ID,
			clientSecret: process.env.FACEBOOK_APP_SECRET,
			callbackURL: process.env.FACEBOOK_CALLBACK_URL,
			profileFields: ['name', 'email', 'photos'],
		},
		async (accessToken, refreshToken, profile, done) => {
			// Successful Facebook log in.
			try {
				// Find a local user account using their Facebook email.
				// User can only use unique email.
				let currentUser = await User.findOne({
					email: profile.emails[0].value,
				}).exec();
				// If Facebook user have a local user account.
				if (currentUser) {
					if (currentUser.profilePicture === '') {
						currentUser.profilePicture = profile.photos[0].value;
					}
				} else {
					// Create the new user using their Facebook profile data.
					const hashedPassword = await bcrypt.hash(nanoid(), 10);
					currentUser = new User({
						firstName: profile.name.givenName,
						lastName: profile.name.familyName,
						email: profile.emails[0].value,
						profilePicture: profile.photos[0].value,
						password: hashedPassword,
					});
				}
				const provider = await Provider.findOne({
					providerId: profile.id,
				}).exec();
				// If currentUser doen't have a Facebook provider registered.
				if (provider === null) {
					const provider = await Provider.create({
						user: currentUser._id,
						provider: 'facebook',
						providerId: profile.id,
					});
					currentUser.providers.push(provider.id);
				}
				currentUser = await currentUser.save();
				done(null, currentUser);
			} catch (err) {
				done(err);
			}
		}
	)
);

module.exports = passport;
