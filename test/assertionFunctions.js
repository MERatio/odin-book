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

exports.bodyHasTotalUsersProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'totalUsers')) {
		throw new Error('missing totalUsers property');
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

exports.bodyHasFriendshipsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'friendships')) {
		throw new Error('missing friendships property');
	}
};

exports.bodyHasTotalFriendshipsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'totalFriendships')) {
		throw new Error('missing totalFriendships property');
	}
};

exports.bodyHasFriendshipProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'friendship')) {
		throw new Error('missing friendship property');
	}
};

exports.bodyHasPostsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'posts')) {
		throw new Error('missing posts property');
	}
};

exports.bodyHasTotalPostsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'totalPosts')) {
		throw new Error('missing totalPosts property');
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

exports.bodyHasCommentsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'comments')) {
		throw new Error('missing comments property');
	}
};

exports.bodyHasTotalCommentsProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'totalComments')) {
		throw new Error('missing totalComments property');
	}
};

exports.bodyHasCommentProperty = (res) => {
	if (!Object.prototype.hasOwnProperty.call(res.body, 'comment')) {
		throw new Error('missing comment property');
	}
};
