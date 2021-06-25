/* Variables are not evaluated in console when throwing an error.
	 That's why i create these non DRY functions.
*/

exports.bodyHasErrProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'err')) {
		throw new Error('missing err property');
	}
};

exports.bodyHasErrorsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'errors')) {
		throw new Error('missing errors property');
	}
};

exports.bodyHasUsersProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'users')) {
		throw new Error('missing users property');
	}
};

exports.bodyHasUsersCountProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'usersCount')) {
		throw new Error('missing usersCount property');
	}
};

exports.bodyHasUserProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'user')) {
		throw new Error('missing user property');
	}
};

exports.bodyHasPictureProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'picture')) {
		throw new Error('missing picture property');
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

exports.bodyHasCurrentPostsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'currentPosts')) {
		throw new Error('missing currentPosts property');
	}
};

exports.bodyHasTotalPostsCountProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'totalPostsCount')) {
		throw new Error('missing totalPostsCount property');
	}
};

exports.bodyHasPostProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'post')) {
		throw new Error('missing post property');
	}
};

exports.bodyHasReactionsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'reactions')) {
		throw new Error('missing reactions property');
	}
};

exports.bodyHasTotalReactionsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'totalReactions')) {
		throw new Error('missing totalReactions property');
	}
};

exports.bodyHasReactionProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'reaction')) {
		throw new Error('missing reaction property');
	}
};

exports.bodyHasCommentProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'comment')) {
		throw new Error('missing comment property');
	}
};
