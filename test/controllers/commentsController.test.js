const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasPostProperty,
	bodyHasCommentProperty,
} = require('../assertionFunctions');

let user1Id;
let user1Jwt;
let user2Jwt;
let post1Id;
let comment1Id;

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
		.expect((res) => (user1Id = res.body.user._id))
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
	await request(app)
		.post(`/posts/${post1Id}/comments`)
		.send({
			text: 'comment1',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasCommentProperty)
		.expect((res) => (comment1Id = res.body.comment._id))
		.expect(201);
});
afterEach(async () => await mongoConfigTesting.clear());
afterAll(async () => await mongoConfigTesting.close());

describe('create', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.post(`/posts/${post1Id}/comments`)
				.send({
					text: 'hello world',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.post(`/posts/${post1Id + '123'}/comments`)
				.send({
					text: 'hello world',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.post(
					`/posts/${post1Id.substring(0, post1Id.length - 3) + '123'}/comments`
				)
				.send({
					text: 'hello world',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});
	});

	describe('body has santinized comment and errors property', () => {
		describe('if text', () => {
			test('is empty', (done) => {
				request(app)
					.post(`/posts/${post1Id}/comments`)
					.send({
						text: '',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasCommentProperty)
					.expect(422, done);
			});

			test('only contains a whitespace/s', (done) => {
				request(app)
					.post(`/posts/${post1Id}/comments`)
					.send({
						text: ' ',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasCommentProperty)
					.expect(422, done);
			});

			test('length is greater than 200', (done) => {
				request(app)
					.post(`/posts/${post1Id}/comments`)
					.send({
						text: 'a'.repeat(201),
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasCommentProperty)
					.expect(422, done);
			});
		});
	});

	it('should create and return the new comment object', (done) => {
		request(app)
			.post(`/posts/${post1Id}/comments`)
			.send({
				text: 'validComment1',
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasCommentProperty)
			.expect(201, done);
	});

	test("comment should be included in user's comments when comment is created", (done) => {
		request(app)
			.get(`/users/${user1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect((res) => {
				const userCommentsIds = res.body.user.comments.map((comment) => {
					return comment._id;
				});
				if (!userCommentsIds.includes(comment1Id)) {
					throw new Error("Comment is not included in user's comments");
				}
			})
			.expect(200, done);
	});

	test("comment should be included in post's comments when comment is created", (done) => {
		request(app)
			.get(`/posts/${post1Id}`)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect((res) => {
				const postCommentsIds = res.body.post.comments.map((comment) => {
					return comment._id;
				});
				if (!postCommentsIds.includes(comment1Id)) {
					throw new Error("Comment is not included in post's comments");
				}
			})
			.expect(200, done);
	});
});

describe('update', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/posts/${post1Id}/comments/${comment1Id}`)
				.send({
					text: 'comment1UpdateErr',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.put(`/posts/${post1Id + '123'}/comments/${comment1Id}`)
				.send({
					text: 'comment1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.put(
					`/posts/${
						post1Id.substring(0, post1Id.length - 3) + '123'
					}/comments/${comment1Id}`
				)
				.send({
					text: 'comment1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if commentId route parameter is not valid', (done) => {
			request(app)
				.put(`/posts/${post1Id}/comments/${comment1Id + '123'}`)
				.send({
					text: 'comment1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if comment does not exists', (done) => {
			request(app)
				.put(
					`/posts/${post1Id}/comments/${
						comment1Id.substring(0, comment1Id.length - 3) + '123'
					}`
				)
				.send({
					text: 'comment1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the comment's author", (done) => {
			request(app)
				.put(`/posts/${post1Id}`)
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('body has santinized comment and errors property', () => {
		describe('if text', () => {
			test('is empty', (done) => {
				request(app)
					.put(`/posts/${post1Id}/comments/${comment1Id}`)
					.send({
						text: '',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasCommentProperty)
					.expect(422, done);
			});

			test('only contains a whitespace/s', (done) => {
				request(app)
					.put(`/posts/${post1Id}/comments/${comment1Id}`)
					.send({
						text: ' ',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasCommentProperty)
					.expect(422, done);
			});

			test('length is greater than 200', (done) => {
				request(app)
					.put(`/posts/${post1Id}/comments/${comment1Id}`)
					.send({
						text: 'a'.repeat(201),
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasCommentProperty)
					.expect(422, done);
			});
		});
	});

	it('should update and return the updated comment object', (done) => {
		const updatedCommentText = 'comment1Updated';
		request(app)
			.put(`/posts/${post1Id}/comments/${comment1Id}`)
			.send({
				text: updatedCommentText,
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasCommentProperty)
			.expect((res) => {
				if (res.body.comment.text !== updatedCommentText) {
					throw new Error('Comment is not updated.');
				}
			})
			.expect(200, done);
	});
});

describe('destroy', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.del(`/posts/${post1Id}/comments/${comment1Id}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.del(`/posts/${post1Id + '123'}/comments/${comment1Id}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.del(
					`/posts/${
						post1Id.substring(0, post1Id.length - 3) + '123'
					}/comments/${comment1Id}`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if commentId route parameter is not valid', (done) => {
			request(app)
				.del(`/posts/${post1Id}/comments/${comment1Id + '123'}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if comment does not exists', (done) => {
			request(app)
				.del(
					`/posts/${post1Id}/comments/${
						comment1Id.substring(0, comment1Id.length - 3) + '123'
					}`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the comment's author", (done) => {
			request(app)
				.del(`/posts/${post1Id}/comments/${comment1Id}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	it('should remove the comment. And body should have a comment property', async (done) => {
		request(app)
			.del(`/posts/${post1Id}/comments/${comment1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasCommentProperty)
			.expect(200, done);
	});
});
