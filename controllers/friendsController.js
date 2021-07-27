const authenticated = require('../middlewares/authenticated');
const validMongoObjectIdRouteParams = require('../middlewares/validMongoObjectIdRouteParams');
const User = require('../models/user');

exports.index = [
	authenticated,
	validMongoObjectIdRouteParams,
	// Check if user exists.
	async (req, res, next) => {
		try {
			const user = await User.findById(req.params.userId).exec();
			if (user === null) {
				const err = new Error('User not found.');
				err.status = 404;
				next(err);
			} else {
				req.user = user;
				next();
			}
		} catch (err) {
			next(err);
		}
	},
	async (req, res, next) => {
		try {
			const friendsIds = await req.user.getFriendsIds();
			req.friendsIds = friendsIds;
			next();
		} catch (err) {
			next(err);
		}
	},
	async (req, res, next) => {
		try {
			if (req.query.noDocs) {
				res.json({ totalUsers: req.friendsIds.length });
			} else {
				next();
			}
		} catch (err) {
			next(err);
		}
	},
	async (req, res, next) => {
		try {
			const users = await User.find({})
				.where('_id')
				.in(req.friendsIds)
				.skip(req.skip)
				.limit(req.query.limit)
				.sort({ updatedAt: -1 })
				.populate('author')
				.exec();
			res.json({ users, totalUsers: req.friendsIds.length });
		} catch (err) {
			next(err);
		}
	},
];
