const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasUserProperty,
	bodyHasPostProperty,
	bodyHasErrProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasReactionProperty,
} = require('../assertionFunctions');

let user1Jwt;
let post1Id;

beforeAll(async () => {
	await mongoConfigTesting.connect();
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
});
afterAll(async () => await mongoConfigTesting.close());

describe('create', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.post(`/posts/${post1Id}/reactions`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.post(`/posts/${post1Id + '123'}/reactions`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.post(
					`/posts/${post1Id.substring(0, post1Id.length - 3) + '123'}/reactions`
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
			.post(`/posts/${post1Id}/reactions`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasReactionProperty)
			.expect(201, done);
	});

	test('body has err property if currentUser have duplicate reaction type in the same post', (done) => {
		request(app)
			.post(`/posts/${post1Id}/reactions`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasErrProperty)
			.expect(422, done);
	});
});
