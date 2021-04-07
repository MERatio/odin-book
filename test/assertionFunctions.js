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

exports.bodyHasNoErrorsProperty = (res) => {
	if (Object.prototype.hasOwnProperty.call(res.body, 'errors')) {
		throw new Error('errors property should not exists');
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

exports.bodyHasNoJwtProperty = (res) => {
	if (Object.prototype.hasOwnProperty.call(res.body, 'jwt')) {
		throw new Error('jwt property should not exist');
	}
};

exports.bodyHasCurrentUserProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'currentUser')) {
		throw new Error('missing currentUser property');
	}
};

exports.bodyHasNoCurrentUserProperty = (res) => {
	if (Object.prototype.hasOwnProperty.call(res.body, 'currentUser')) {
		throw new Error('currentUser property should not exist');
	}
};
