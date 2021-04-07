/* Variables are not evaluated in console when throwing an error.
	 That's why i create these non DRY functions.
*/
exports.bodyHasUserProperty = (res) => {
	if (!res.body.hasOwnProperty('user')) {
		throw new Error('missing user property');
	}
};

exports.bodyHasErrorsProperty = (res) => {
	if (!res.body.hasOwnProperty('errors')) {
		throw new Error('missing errors property');
	}
};

exports.bodyHasNoErrorsProperty = (res) => {
	if (res.body.hasOwnProperty('errors')) {
		throw new Error('missing errors property');
	}
};

exports.bodyHasErrProperty = (res) => {
	if (!res.body.hasOwnProperty('err')) {
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
