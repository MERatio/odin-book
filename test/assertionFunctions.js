/* Variables are not evaluated in console when throwing an error.
	 That's why i create these non DRY functions.
*/
exports.bodyHasUserProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'user')) {
		throw new Error('missing user property');
	}
};

exports.bodyHasErrorsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'errors')) {
		throw new Error('missing errors property');
	}
};

exports.bodyHasErrProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'err')) {
		throw new Error('missing err property');
	}
};

exports.bodyHasJwtProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'jwt')) {
		throw new Error('missing jwt property');
	}
};

exports.bodyHasCurrentUserProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'currentUser')) {
		throw new Error('missing currentUser property');
	}
};

exports.bodyHasFriendshipProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'friendship')) {
		throw new Error('missing friendship property');
	}
};
