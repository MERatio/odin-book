const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
} = require('../assertionFunctions');

beforeAll(async () => await mongoConfigTesting.connect());
beforeEach(async () => {
	await mongoConfigTesting.clear();
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
});
afterAll(async () => await mongoConfigTesting.close());

describe('local', () => {
	it('body has jwt and currentUser property if credentials are correct', (done) => {
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

	it('body has error property if credentials are incorrect', (done) => {
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

	it('body has error property if user already have a valid jwt', async (done) => {
		let jwt;

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
			.expect((req) => (jwt = req.body.jwt))
			.expect(200);

		request(app)
			.post('/auth/local')
			.send({
				email: 'user1@example.com',
				password: 'password123',
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasErrProperty)
			.expect(403, done);
	});
});
