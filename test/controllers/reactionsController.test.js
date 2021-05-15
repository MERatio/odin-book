const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasPostProperty,
	bodyHasReactionProperty,
} = require('../assertionFunctions');

let user1Id;
let user1Jwt;
let post1Id;
let post2Id;
let post1Reaction1;

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
		.expect((res) => (post1Reaction1 = res.body.reaction._id))
		.expect(201);
});
afterEach(async () => await mongoConfigTesting.clear());
afterAll(async () => await mongoConfigTesting.close());

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

	it('should like the post', (done) => {
		request(app)
			.post(`/posts/${post2Id}/reactions`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasReactionProperty)
			.expect(201, done);
	});

	test("reaction should be included in user's reactions when reaction is created", async (done) => {
		request(app)
			.get(`/users/${user1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect((res) => {
				const userReactionsIds = res.body.user.reactions.map((reaction) => {
					return reaction._id;
				});
				if (!userReactionsIds.includes(post1Reaction1)) {
					throw new Error("Reaction is not included in user's reaction");
				}
			})
			.expect(200, done);
	});

	test("reaction should be included in post's reactions when reaction is created", async (done) => {
		request(app)
			.get(`/posts/${post1Id}`)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect((res) => {
				const postReactionsIds = res.body.post.reactions.map((reaction) => {
					return reaction._id;
				});
				if (!postReactionsIds.includes(post1Reaction1)) {
					throw new Error("Reaction is not included in post's reactions");
				}
			})
			.expect(200, done);
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
				.del(`/posts/${post2Id.substring(0, post2Id.length - 3) + '123'}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the reaction's user", async (done) => {
			let user2Jwt;
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
					email: 'user2@example.com',
					password: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasJwtProperty)
				.expect(bodyHasCurrentUserProperty)
				.expect((res) => (user2Jwt = res.body.jwt))
				.expect(200);

			request(app)
				.del(`/posts/${post2Id}/reactions/${post1Reaction1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	it('should remove the reaction', (done) => {
		request(app)
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
			.expect(200, done);
	});
});
