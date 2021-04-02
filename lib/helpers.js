const jsonwebtoken = require('jsonwebtoken');

exports.createJwt = (currentUser) => {
	const jwtPayload = { currentUserId: currentUser._id };
	const jwt = jsonwebtoken.sign(jwtPayload, process.env.JWT_SECRET, {
		expiresIn: '7d',
	});
	return jwt;
};
