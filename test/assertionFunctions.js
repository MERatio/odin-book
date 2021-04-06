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
