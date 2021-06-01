function unauthenticated(req, res, next) {
	if (req.currentUser) {
		const err = new Error("You're already signed in");
		err.status = 403;
		next(err);
	} else {
		next();
	}
}

module.exports = unauthenticated;
