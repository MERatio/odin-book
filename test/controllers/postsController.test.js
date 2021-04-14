const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasUserProperty,
	bodyHasPostProperty,
	bodyHasErrorsProperty,
	bodyHasErrProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
} = require('../assertionFunctions');

let user1Jwt;

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
});
afterAll(async () => await mongoConfigTesting.close());

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
					.expect(bodyHasPostProperty)
					.expect(bodyHasErrorsProperty)
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
					.expect(bodyHasPostProperty)
					.expect(bodyHasErrorsProperty)
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
					.expect(bodyHasPostProperty)
					.expect(bodyHasErrorsProperty)
					.expect(422, done);
			});
		});
	});

	it('should create and return the new post object', (done) => {
		request(app)
			.post('/posts')
			.send({
				text: 'post1',
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPostProperty)
			.expect(201, done);
	});
});
