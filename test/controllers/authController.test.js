const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
} = require('../assertionFunctions');

let user1Jwt;

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
		.expect((res) => (user1Jwt = res.body.jwt))
		.expect(201);
});
afterEach(async () => await mongoConfigTesting.clear());
afterAll(async () => await mongoConfigTesting.close());

describe('local', () => {
	describe('body has err property', () => {
		test('if user already have a valid jwt', (done) => {
			request(app)
				.post('/auth/local')
				.send({
					email: 'user1@example.com',
					password: 'password123',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(403, done);
		});

		test('if credentials are incorrect', (done) => {
			request(app)
				.post('/auth/local')
				.send({
					email: 'user1@example.com',
					password: 'incorrectPassword123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('body has jwt and currentUser property', () => {
		test('if credentials are correct', (done) => {
			request(app)
				.post('/auth/local')
				.send({
					email: 'user1@example.com',
					password: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasJwtProperty)
				.expect(bodyHasCurrentUserProperty)
				.expect(200, done);
		});
	});
});

describe('facebook', () => {
	/* Visit for info about access token and data access
  	 https://developers.facebook.com/docs/facebook-login/auth-vs-data
  */
	describe('body has err property', () => {
		test('if user already have a valid jwt', (done) => {
			request(app)
				.post('/auth/facebook')
				.send({
					userAccessToken: process.env.FACEBOOK_USER_ACCESS_TOKEN,
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(403, done);
		});

		test('if email is already taken and provider is not facebook', async (done) => {
			await request(app)
				.post('/users')
				.send({
					firstName: 'localUser',
					lastName: 'localUser',
					email: process.env.FACEBOOK_USER_EMAIL,
					password: 'password123',
					passwordConfirmation: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasUserProperty)
				.expect(bodyHasJwtProperty)
				.expect(201);

			request(app)
				.post('/auth/facebook')
				.send({
					userAccessToken: process.env.FACEBOOK_USER_ACCESS_TOKEN,
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(422, done);
		});
	});

	describe('create and return jwt and new currentUser', () => {
		test('if userAccessToken is valid', (done) => {
			request(app)
				.post('/auth/facebook')
				.send({
					userAccessToken: process.env.FACEBOOK_USER_ACCESS_TOKEN,
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasJwtProperty)
				.expect(bodyHasCurrentUserProperty)
				.expect(201, done);
		});
	});

	describe('sign in and return jwt and new currentUser', () => {
		test('if userAccessToken is valid', async (done) => {
			// Create a new user.
			await request(app)
				.post('/auth/facebook')
				.send({
					userAccessToken: process.env.FACEBOOK_USER_ACCESS_TOKEN,
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasJwtProperty)
				.expect(bodyHasCurrentUserProperty)
				.expect(201);

			// Sign in that user.
			request(app)
				.post('/auth/facebook')
				.send({
					userAccessToken: process.env.FACEBOOK_USER_ACCESS_TOKEN,
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasJwtProperty)
				.expect(bodyHasCurrentUserProperty)
				.expect(200, done);
		});
	});
});
