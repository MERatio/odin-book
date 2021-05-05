const path = require('path');
const fs = require('fs/promises');
const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrorsProperty,
	bodyHasUserProperty,
} = require('../assertionFunctions');

const imagesPath = 'public/images';
const profilePicture = 'profile-picture.jpg';

beforeAll(async () => await mongoConfigTesting.connect());
afterEach(async () => {
	// Delete all files in public/images directory.
	const files = await fs.readdir(imagesPath);
	for (const file of files) {
		await fs.unlink(path.join(imagesPath, file));
	}
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

describe('create', () => {
	describe('create and return the new user object', () => {
		it('if all fields are valid', async (done) => {
			// Create a valid user.
			await request(app)
				.post('/users')
				.field('firstName', 'user1')
				.field('lastName', 'user1')
				.field('email', 'user1@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.attach('profilePicture', `test/images/${profilePicture}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasUserProperty)
				.expect(201);
			/* Verify that public/images directory now have the recent profile picture.
				 Then clear the public/images directory after.
			*/
			try {
				const files = await fs.readdir(imagesPath);
				expect(files.length).toBe(1);
				expect(files[0].split('.')[1] === 'jpg');
				for (const file of files) {
					await fs.unlink(path.join(imagesPath, file));
				}
				done();
			} catch (err) {
				done(err);
			}
		});

		it('if profilePicture is not supplied but all other fields are valid', (done) => {
			request(app)
				.post('/users')
				.field('firstName', 'user1')
				.field('lastName', 'user1')
				.field('email', 'user1@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasUserProperty)
				.expect((res) => res.body.user.profilePicture === '')
				.expect(201, done);
		});
	});

	describe('body has santinized user and errors property', () => {
		it('if form texts has error/s. And if there is a uploaded valid profilePicture delete it', async (done) => {
			await request(app)
				.post('/users')
				.field('firstName', '')
				.field('lastName', 'user1')
				.field('email', 'user1@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.attach('profilePicture', `test/images/${profilePicture}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrorsProperty)
				.expect(bodyHasUserProperty)
				.expect(422);
			// Verify that the valid profilePicture is not saved because of form texts errors.
			try {
				const files = await fs.readdir(imagesPath);
				expect(files.length).toBe(0);
				done();
			} catch (err) {
				done(err);
			}
		});

		it('if profilePicture and form texts has error/s. They should be concatenated in 1 array. profilePicture should not be saved', async (done) => {
			await request(app)
				.post('/users')
				.field('firstName', '')
				.field('lastName', 'user1')
				.field('email', 'user1@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.attach('profilePicture', `test/files/dummyJson.json`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrorsProperty)
				.expect((res) => {
					if (res.body.errors.length !== 2) {
						throw new Error(
							'Should have profilePicture and form texts errors.'
						);
					}
				})
				.expect(bodyHasUserProperty)
				.expect(422);
			// Verify that the valid profilePicture is not saved because of form texts errors.
			try {
				const files = await fs.readdir(imagesPath);
				expect(files.length).toBe(0);
				done();
			} catch (err) {
				done(err);
			}
		});

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

		describe('if profilePicture', () => {
			test('has invalid extention. File with invalid file type should not be saved', async (done) => {
				await request(app)
					.post('/users')
					.field('firstName', 'invalidUser')
					.field('lastName', 'invalidUser')
					.field('email', 'invalidUser@example.com')
					.field('password', 'password123')
					.field('passwordConfirmation', 'password123')
					.attach('profilePicture', 'test/files/dummyJson.json')
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422);
				// Verify that the file with invalid file type is not saved.
				try {
					const files = await fs.readdir(imagesPath);
					expect(files.length).toBe(0);
					done();
				} catch (err) {
					done(err);
				}
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
