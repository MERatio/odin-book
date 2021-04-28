const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasFriendshipProperty,
	bodyHasPostProperty,
	bodyHasPostsProperty,
	bodyHasReactionProperty,
	bodyHasCommentProperty,
} = require('../assertionFunctions');

let user2Id;
let user1Jwt;
let user2Jwt;
let post1Id;

beforeAll(async () => await mongoConfigTesting.connect());
beforeEach(async () => {
	await request(app)
		.post('/users')
		.send({
			firstName: 'user1',
			lastName: 'user1',
			email: 'user1@example.com',
			password: 'password123',
			passwordConfirmation: 'password123',
		})
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(bodyHasUserProperty)
		.expect(201);
	await request(app)
		.post('/users')
		.send({
			firstName: 'user2',
			lastName: 'user2',
			email: 'user2@example.com',
			password: 'password123',
			passwordConfirmation: 'password123',
		})
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(bodyHasUserProperty)
		.expect((res) => (user2Id = res.body.user._id))
		.expect(201);
	await request(app)
		.post('/auth/local')
		.send({
			email: 'user1@example.com',
			password: 'password123',
		})
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(bodyHasJwtProperty)
		.expect(bodyHasCurrentUserProperty)
		.expect((res) => (user1Jwt = res.body.jwt))
		.expect(200);
	await request(app)
		.post('/auth/local')
		.send({
			email: 'user2@example.com',
			password: 'password123',
		})
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(bodyHasJwtProperty)
		.expect(bodyHasCurrentUserProperty)
		.expect((res) => (user2Jwt = res.body.jwt))
		.expect(200);
	await request(app)
		.post('/posts')
		.send({
			text: 'post1',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasPostProperty)
		.expect((res) => (post1Id = res.body.post._id))
		.expect(201);
});
afterEach(async () => await mongoConfigTesting.clear());
afterAll(async () => await mongoConfigTesting.close());

describe('index', () => {
	test('should require a valid JWT', (done) => {
		request(app)
			.get('/posts')
			.expect('Content-Type', /json/)
			.expect(bodyHasErrProperty)
			.expect(401, done);
	});

	describe('posts', () => {
		let user1AndUser2FriendshipId;
		let user2Post1Id;
		let stranger1Jwt;
		let stranger1Post1Id;

		beforeEach(async () => {
			await request(app)
				.post('/friendships')
				.send({
					requesteeId: user2Id,
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasFriendshipProperty)
				.expect((res) => (user1AndUser2FriendshipId = res.body.friendship._id))
				.expect(201);

			await request(app)
				.put(`/friendships/${user1AndUser2FriendshipId}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasFriendshipProperty)
				.expect((res) => {
					if (res.body.friendship.status !== 'friends') {
						throw new Error('Friend request is not accepted.');
					}
				})
				.expect(200);

			await request(app)
				.post('/posts')
				.send({
					text: "friend's post",
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect((res) => (user2Post1Id = res.body.post._id))
				.expect(201);

			await request(app)
				.post('/users')
				.send({
					firstName: 'stranger',
					lastName: 'stranger',
					email: 'stranger@example.com',
					password: 'password123',
					passwordConfirmation: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasUserProperty)
				.expect(201);

			await request(app)
				.post('/auth/local')
				.send({
					email: 'stranger@example.com',
					password: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasJwtProperty)
				.expect(bodyHasCurrentUserProperty)
				.expect((res) => (stranger1Jwt = res.body.jwt))
				.expect(200);

			await request(app)
				.post('/posts')
				.send({
					text: "stranger's post",
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${stranger1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect((res) => (stranger1Post1Id = res.body.post._id))
				.expect(201);
		});

		test('should be from currentUser and friends only', (done) => {
			request(app)
				.get('/posts')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostsProperty)
				.expect((res) => {
					let isCurrentUserPostIncluded = false;
					let isFriendPostIncluded = false;
					const postsIds = res.body.posts.map((post) => post._id);
					postsIds.forEach((postId) => {
						if (postId.toString() === post1Id) {
							isCurrentUserPostIncluded = true;
						} else if (postId.toString() === user2Post1Id) {
							isFriendPostIncluded = true;
						} else if (postId.toString() === stranger1Post1Id) {
							throw new Error(
								"Stranger's posts should not be included in post's index."
							);
						}
					});
					if (!isCurrentUserPostIncluded) {
						throw new Error(
							"currentUser's posts should be included in post's index."
						);
					} else if (!isFriendPostIncluded) {
						throw new Error(
							"Friends's posts should be included in post's index."
						);
					}
				})
				.expect(200, done);
		});

		test('should be recent', (done) => {
			request(app)
				.get('/posts')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostsProperty)
				.expect((res) => {
					if (
						!(
							res.body.posts[0]._id === user2Post1Id &&
							res.body.posts[res.body.posts.length - 1]._id === post1Id
						)
					) {
						throw new Error('posts are not recent');
					}
				})
				.expect(200, done);
		});

		test('should populate individual post author', (done) => {
			request(app)
				.get('/posts')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostsProperty)
				.expect((res) => {
					if (!res.body.posts[0].author._id) {
						throw new Error('individual post author is not populated');
					}
				})
				.expect(200, done);
		});

		describe('individual post reactions', () => {
			beforeEach(async () => {
				await request(app)
					.post(`/posts/${user2Post1Id}/reactions`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasReactionProperty)
					.expect(201);
			});

			test('should be populated', (done) => {
				request(app)
					.get('/posts')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostsProperty)
					.expect((res) => {
						if (!res.body.posts[0].reactions[0]._id) {
							throw new Error('individual post reactions is not populated');
						}
					})
					.expect(200, done);
			});
		});

		describe('individual post comments', () => {
			let user2Post1Comment4Id;

			beforeEach(async () => {
				await request(app)
					.post(`/posts/${user2Post1Id}/comments`)
					.send({
						text: 'user2Post1Comment1Id',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasCommentProperty)
					.expect(201);

				await request(app)
					.post(`/posts/${user2Post1Id}/comments`)
					.send({
						text: 'user2Post1IdComment2',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasCommentProperty)
					.expect(201);

				await request(app)
					.post(`/posts/${user2Post1Id}/comments`)
					.send({
						text: 'user2Post1IdComment3',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasCommentProperty)
					.expect(201);

				await request(app)
					.post(`/posts/${user2Post1Id}/comments`)
					.send({
						text: 'user2Post1IdComment4',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasCommentProperty)
					.expect((res) => (user2Post1Comment4Id = res.body.comment._id))
					.expect(201);
			});

			test('should be populated', (done) => {
				request(app)
					.get('/posts')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostsProperty)
					.expect((res) => {
						if (!res.body.posts[0].comments[0]._id) {
							throw new Error('individual post comments is not populated');
						}
					})
					.expect(200, done);
			});

			test('should be limited to 3', (done) => {
				request(app)
					.get('/posts')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostsProperty)
					.expect((res) => {
						if (!res.body.posts[0].comments.length === 3) {
							throw new Error(
								'individual post comments length should be limited to 3'
							);
						}
					})
					.expect(200, done);
			});

			test('should be recent', (done) => {
				request(app)
					.get('/posts')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostsProperty)
					.expect((res) => {
						if (res.body.posts[0].comments[0]._id !== user2Post1Comment4Id) {
							throw new Error('individual post comments are not recent');
						}
					})
					.expect(200, done);
			});
		});
	});
});

describe('create', () => {
	test('should require a valid JWT', (done) => {
		request(app)
			.post('/posts')
			.send({
				text: 'hello world',
			})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasErrProperty)
			.expect(401, done);
	});

	describe('body has santinized post and errors property', () => {
		describe('if text', () => {
			test('is empty', (done) => {
				request(app)
					.post('/posts')
					.send({
						text: '',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});

			test('only contains a whitespace/s', (done) => {
				request(app)
					.post('/posts')
					.send({
						text: ' ',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});

			test('length is greater than 1000', (done) => {
				request(app)
					.post('/posts')
					.send({
						text: 'a'.repeat(10001),
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});
		});
	});

	it('should create and return the new post object', (done) => {
		request(app)
			.post('/posts')
			.send({
				text: 'valid post',
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPostProperty)
			.expect(201, done);
	});
});

describe('update', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/posts/${post1Id}`)
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.put(`/posts/${post1Id}` + '123')
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.put(`/posts/${post1Id.substring(0, post1Id.length - 3)}` + '123')
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the post's author", (done) => {
			request(app)
				.put(`/posts/${post1Id}`)
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(403, done);
		});
	});

	describe('body has santinized post and errors property', () => {
		describe('if text', () => {
			test('is empty', (done) => {
				request(app)
					.put(`/posts/${post1Id}`)
					.send({
						text: '',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});

			test('only contains a whitespace/s', (done) => {
				request(app)
					.put(`/posts/${post1Id}`)
					.send({
						text: ' ',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});

			test('length is greater than 1000', (done) => {
				request(app)
					.put(`/posts/${post1Id}`)
					.send({
						text: 'a'.repeat(10001),
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});
		});
	});

	it('should update post and body should have a post property', (done) => {
		const updatedCommentText = 'post1Updated';
		request(app)
			.put(`/posts/${post1Id}`)
			.send({
				text: updatedCommentText,
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPostProperty)
			.expect((res) => {
				if (res.body.post.text !== updatedCommentText) {
					throw new Error('Post is not updated.');
				}
			})
			.expect(200, done);
	});
});

describe('destroy', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.del(`/posts/${post1Id}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.del(`/posts/${post1Id}` + '123')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.del(`/posts/${post1Id.substring(0, post1Id.length - 3)}` + '123')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the post's author", (done) => {
			request(app)
				.del(`/posts/${post1Id}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(403, done);
		});
	});

	it('should remove the post, and its reactions and comments. And body should have a post property', async (done) => {
		await request(app)
			.post(`/posts/${post1Id}/reactions`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasReactionProperty)
			.expect(201);

		await request(app)
			.post(`/posts/${post1Id}/comments`)
			.send({
				text: 'comment1',
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasCommentProperty)
			.expect(201);

		request(app)
			.del(`/posts/${post1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPostProperty)
			.expect(200, done);
	});
});
