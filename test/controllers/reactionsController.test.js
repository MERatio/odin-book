const request = require('supertest');
const app = require('../../app');
const Reaction = require('../../models/reaction');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasPostProperty,
	bodyHasReactionsProperty,
	bodyHasTotalReactionsProperty,
	bodyHasReactionProperty,
} = require('../assertionFunctions');

let user1Jwt;
let user2Jwt;
let post1Id;
let post2Id;
let post1Reaction1;
let post1Reaction2;
let indexTotalReactions = 0;

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
		.post('/posts')
		.send({
			text: 'post2',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasPostProperty)
		.expect((res) => (post2Id = res.body.post._id))
		.expect(201);
	await request(app)
		.post(`/posts/${post1Id}/reactions`)
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasReactionProperty)
		.expect((res) => {
			post1Reaction1 = res.body.reaction._id;
			indexTotalReactions += 1;
		})
		.expect(201);
	await request(app)
		.post(`/posts/${post1Id}/reactions`)
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user2Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasReactionProperty)
		.expect((res) => {
			post1Reaction2 = res.body.reaction._id;
			indexTotalReactions += 1;
		})
		.expect(201);
});
afterEach(async () => {
	indexTotalReactions = 0;
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

describe('index', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get(`/posts/${post1Id}/reactions`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.get(`/posts/${post1Id + '123'}/reactions/`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.get(
					`/posts/${post1Id.substring(0, post1Id.length - 3) + '123'}/reactions`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});
	});

	describe('reactions', () => {
		test('should be recent', (done) => {
			request(app)
				.get(`/posts/${post1Id}/reactions`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasReactionsProperty)
				.expect((res) => {
					if (
						!(
							res.body.reactions[0]._id === post1Reaction2 &&
							res.body.reactions[1]._id === post1Reaction1
						)
					) {
						throw new Error('reactions are not recent');
					}
				})
				.expect(200, done);
		});

		describe('individual reaction', () => {
			describe('user', () => {
				test('should be populated', (done) => {
					request(app)
						.get(`/posts/${post1Id}/reactions`)
						.set('Accept', 'application/json')
						.set('Authorization', `Bearer ${user1Jwt}`)
						.expect('Content-Type', /json/)
						.expect(bodyHasReactionsProperty)
						.expect(bodyHasTotalReactionsProperty)
						.expect((res) => {
							if (!res.body.reactions[0].user._id) {
								throw new Error('individual reaction user is not populated');
							}
						})
						.expect(200, done);
				});
			});
		});
	});

	describe('pagination', () => {
		let firstReactionId;
		let fifteenthReactionId;
		let twentyFirstReactionId;
		let thirtiethReactionId;

		beforeEach(async () => {
			for (let i = 1; i < 31; i++) {
				let jwt;

				await request(app)
					.post('/users')
					.send({
						firstName: `reactionOwner${i}`,
						lastName: `reactionOwner${i}`,
						email: `reactionOwner${i}@example.com`,
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
					.post(`/posts/${post1Id}/reactions`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasReactionProperty)
					.expect((res) => {
						const reaction = res.body.reaction;
						indexTotalReactions += 1;
						if (i === 1) {
							firstReactionId = reaction._id;
						} else if (i === 15) {
							fifteenthReactionId = reaction._id;
						} else if (i === 21) {
							twentyFirstReactionId = reaction._id;
						} else if (i === 30) {
							thirtiethReactionId = reaction._id;
						}
					})
					.expect(201);
			}
		});

		test('works with or without query parameters', async (done) => {
			await request(app)
				.get(`/posts/${post1Id}/reactions`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasReactionsProperty)
				.expect(bodyHasTotalReactionsProperty)
				.expect((res) => {
					const { reactions, totalReactions } = res.body;
					if (reactions.length !== 10) {
						throw new Error(
							'reactions#index pagination - reactions body property length error.'
						);
					}
					if (totalReactions !== indexTotalReactions) {
						throw new Error(
							'reactions#index pagination - totalReactions body property error.'
						);
					}
					if (reactions[0]._id !== thirtiethReactionId) {
						throw new Error(
							'reactions#index pagination - incorrect first reaction.'
						);
					}
					if (reactions[reactions.length - 1]._id !== twentyFirstReactionId) {
						throw new Error(
							'reactions#index pagination - incorrect last reaction.'
						);
					}
				})
				.expect(200);

			request(app)
				.get(`/posts/${post1Id}/reactions?page=2&limit=15`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasReactionsProperty)
				.expect(bodyHasTotalReactionsProperty)
				.expect((res) => {
					const { reactions, totalReactions } = res.body;
					if (reactions.length !== 15) {
						throw new Error(
							'reactions#index pagination - reactions body property length error.'
						);
					}
					if (totalReactions !== indexTotalReactions) {
						throw new Error(
							'reactions#index pagination - totalReactions body property error.'
						);
					}
					if (reactions[0]._id !== fifteenthReactionId) {
						throw new Error(
							'reactions#index pagination - incorrect first reaction.'
						);
					}
					if (reactions[reactions.length - 1]._id !== firstReactionId) {
						throw new Error(
							'reactions#index pagination - incorrect last reaction.'
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
				.post(`/posts/${post2Id}/reactions`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.post(`/posts/${post2Id + '123'}/reactions`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.post(
					`/posts/${post2Id.substring(0, post2Id.length - 3) + '123'}/reactions`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});
	});

	test('body has err property if currentUser have duplicate reaction type in the same post', async (done) => {
		request(app)
			.post(`/posts/${post1Id}/reactions`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasErrProperty)
			.expect(422, done);
	});

	it('should like the post', (done) => {
		request(app)
			.post(`/posts/${post2Id}/reactions`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasReactionProperty)
			.expect(201, done);
	});
});

describe('destroy', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.del(`/posts/${post2Id}/reactions/${post1Reaction1}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.post(`/posts/${post2Id + '123'}/reactions`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.post(
					`/posts/${post2Id.substring(0, post2Id.length - 3) + '123'}/reactions`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if reactionId route parameter is not valid', (done) => {
			request(app)
				.del(`/posts/${post2Id}/reactions/${post1Reaction1 + '123'}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if reaction does not exists', (done) => {
			request(app)
				.del(
					`/posts/${post2Id}/reactions/${
						post1Reaction1.substring(0, post1Reaction1.length - 3) + '123'
					}`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the reaction's user", async (done) => {
			request(app)
				.del(`/posts/${post2Id}/reactions/${post1Reaction1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	it('should remove the reaction', async (done) => {
		await request(app)
			.del(`/posts/${post2Id}/reactions/${post1Reaction1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasReactionProperty)
			.expect((res) => {
				if (res.body.reaction.type !== 'like') {
					throw new Error('Reaction type should not change.');
				}
			})
			.expect(200);

		try {
			// Test to see if the reaction is removed.
			expect(await Reaction.exists({ _id: post1Reaction1 })).toBe(false);
			done();
		} catch (err) {
			done(err);
		}
	});
});
