const request = require('supertest');
const app = require('../../app');
const Comment = require('../../models/comment');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasPostProperty,
	bodyHasCommentsProperty,
	bodyHasTotalCommentsProperty,
	bodyHasCommentProperty,
} = require('../assertionFunctions');

let user1Jwt;
let user2Jwt;
let post1Id;
let comment1Id;
let comment2Id;
let indexTotalComments = 0;

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
		.expect(bodyHasJwtProperty)
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
		.expect(bodyHasJwtProperty)
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
		.expect((res) => {
			comment1Id = res.body.comment._id;
			indexTotalComments += 1;
		})
		.expect(201);
	await request(app)
		.post(`/posts/${post1Id}/comments`)
		.send({
			text: 'comment2',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasCommentProperty)
		.expect((res) => {
			comment2Id = res.body.comment._id;
			indexTotalComments += 1;
		})
		.expect(201);
});
indexTotalComments = 0;
afterEach(async () => {
	indexTotalComments = 0;
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

describe('index', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get(`/posts/${post1Id}/comments`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.get(`/posts/${post1Id + '123'}/comments`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.get(
					`/posts/${post1Id.substring(0, post1Id.length - 3) + '123'}/comments`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});
	});

	describe('comments', () => {
		test('should be recent', (done) => {
			request(app)
				.get(`/posts/${post1Id}/comments`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasCommentsProperty)
				.expect((res) => {
					if (
						!(
							res.body.comments[0]._id === comment2Id &&
							res.body.comments[1]._id === comment1Id
						)
					) {
						throw new Error('comments are not recent');
					}
				})
				.expect(200, done);
		});

		describe('individual comment', () => {
			describe('author', () => {
				test('should be populated', (done) => {
					request(app)
						.get(`/posts/${post1Id}/comments`)
						.set('Accept', 'application/json')
						.set('Authorization', `Bearer ${user1Jwt}`)
						.expect('Content-Type', /json/)
						.expect(bodyHasCommentsProperty)
						.expect(bodyHasTotalCommentsProperty)
						.expect((res) => {
							if (!res.body.comments[0].author._id) {
								throw new Error('individual comment author is not populated');
							}
						})
						.expect(200, done);
				});
			});
		});
	});

	describe('pagination', () => {
		let firstCommentId;
		let fifteenthCommentId;
		let twentyFirstCommentId;
		let thirtiethCommentId;

		beforeEach(async () => {
			for (let i = 1; i < 31; i++) {
				let jwt;

				await request(app)
					.post('/users')
					.send({
						firstName: `commentOwner${i}`,
						lastName: `commentOwner${i}`,
						email: `commentOwner${i}@example.com`,
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasUserProperty)
					.expect(bodyHasJwtProperty)
					.expect((res) => (jwt = res.body.jwt))
					.expect(201);

				await request(app)
					.post(`/posts/${post1Id}/comments`)
					.send({
						text: `commentPagination${i}`,
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasCommentProperty)
					.expect((res) => {
						const comment = res.body.comment;
						indexTotalComments += 1;
						if (i === 1) {
							firstCommentId = comment._id;
						} else if (i === 15) {
							fifteenthCommentId = comment._id;
						} else if (i === 21) {
							twentyFirstCommentId = comment._id;
						} else if (i === 30) {
							thirtiethCommentId = comment._id;
						}
					})
					.expect(201);
			}
		});

		test('works with or without query parameters', async (done) => {
			await request(app)
				.get(`/posts/${post1Id}/comments`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasCommentsProperty)
				.expect(bodyHasTotalCommentsProperty)
				.expect((res) => {
					const { comments, totalComments } = res.body;
					if (comments.length !== 10) {
						throw new Error(
							'comments#index pagination - comments body property length error.'
						);
					}
					if (totalComments !== indexTotalComments) {
						throw new Error(
							'comments#index pagination - totalComments body property error.'
						);
					}
					if (comments[0]._id !== thirtiethCommentId) {
						throw new Error(
							'comments#index pagination - incorrect first comment.'
						);
					}
					if (comments[comments.length - 1]._id !== twentyFirstCommentId) {
						throw new Error(
							'comments#index pagination - incorrect last comment.'
						);
					}
				})
				.expect(200);

			request(app)
				.get(`/posts/${post1Id}/comments?page=2&limit=15`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasCommentsProperty)
				.expect(bodyHasTotalCommentsProperty)
				.expect((res) => {
					const { comments, totalComments } = res.body;
					if (comments.length !== 15) {
						throw new Error(
							'comments#index pagination - comments body property length error.'
						);
					}
					if (totalComments !== indexTotalComments) {
						throw new Error(
							'comments#index pagination - totalComments body property error.'
						);
					}
					if (comments[0]._id !== fifteenthCommentId) {
						throw new Error(
							'comments#index pagination - incorrect first comment.'
						);
					}
					if (comments[comments.length - 1]._id !== firstCommentId) {
						throw new Error(
							'comments#index pagination - incorrect last comment.'
						);
					}
				})
				.expect(200, done);
		});
	});
});

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
		await request(app)
			.del(`/posts/${post1Id}/comments/${comment1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasCommentProperty)
			.expect(200);

		try {
			// Test to see if the comment is removed.
			expect(await Comment.exists({ _id: comment1Id })).toBe(false);
			done();
		} catch (err) {
			done(err);
		}
	});
});
