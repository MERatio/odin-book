function authenticated(req, res, next) {
	if (!req.currentUser) {
		const err = new Error('You may not proceed without being signed in');
		err.status = 401;
		next(err);
	} else {
		next();
	}
}

module.exports = authenticated;
