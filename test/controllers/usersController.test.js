const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrorsProperty,
	bodyHasUserProperty,
} = require('../assertionFunctions');

beforeAll(async () => await mongoConfigTesting.connect());
afterEach(async () => await mongoConfigTesting.clear());
afterAll(async () => await mongoConfigTesting.close());

describe('create', () => {
	it('should create and return the new user object', (done) => {
		request(app)
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
			.expect(201, done);
	});

	describe('body has santinized user and errors property', () => {
		describe('if firstName', () => {
			test('is empty', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: '',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('only contains a whitespace/s', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: ' ',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('length is greater than 255', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: 'a'.repeat(256),
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});

		describe('if lastName', () => {
			test('is empty', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: 'invalidUser',
						lastName: '',
						email: 'invalidUser@example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('contains a whitespace/s only', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: 'invalidUser',
						lastName: ' ',
						email: 'invalidUser@example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('length is greater than 255', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: 'invalidUser',
						lastName: 'a'.repeat(256),
						email: 'invalidUser@example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});

		// Validation if email is email is handled by express-validator
		describe('if email', () => {
			test('is valid', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'invalidUser.example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('is already taken', async (done) => {
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

				request(app)
					.post('/users')
					.send({
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'user1@example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});

		// I could use express-validator's isStrongPassword
		describe('if password', () => {
			test('length is less than 8', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: ' '.repeat(7),
						passwordConfirmation: ' '.repeat(7),
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});

		describe('if passwordConfirmation', () => {
			test('does not match password', (done) => {
				request(app)
					.post('/users')
					.send({
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'password123',
						passwordConfirmation: 'password',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});
	});
});
