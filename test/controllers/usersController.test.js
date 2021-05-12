const path = require('path');
const fs = require('fs/promises');
const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasProfilePictureProperty,
} = require('../assertionFunctions');

let user1Id;
let user1Jwt;
const imagesPath = 'public/images';
const profilePicture1 = 'profile-picture-1.jpg';

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
});
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
				.field('firstName', 'user2')
				.field('lastName', 'user2')
				.field('email', 'user2@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.attach('profilePicture', `test/images/${profilePicture1}`)
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
				done();
			} catch (err) {
				done(err);
			}
		});

		it('if profilePicture is not supplied but all other fields are valid', (done) => {
			request(app)
				.post('/users')
				.field('firstName', 'user2')
				.field('lastName', 'user2')
				.field('email', 'user2@example.com')
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
				.field('lastName', 'user2')
				.field('email', 'user2@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.attach('profilePicture', `test/images/${profilePicture1}`)
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
				.field('lastName', 'user2')
				.field('email', 'user2@example.com')
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

		// Validation of email is handled by express-validator.
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

				request(app)
					.post('/users')
					.send({
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'user2@example.com',
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
			/* If the image exceeds the file size limit, the error will be the same.
				 albeit has different error message.
			*/
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

describe('edit', () => {
	it("should get the user's information as the user property", (done) => {
		request(app)
			.get(`/users/${user1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect((res) => {
				if (res.body.user._id !== user1Id) {
					throw new Error('Did not get user information for updating.');
				}
			})
			.expect(200, done);
	});

	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get(`/users/${user1Id}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if userId route parameter is not valid', (done) => {
			request(app)
				.get(`/users/${user1Id}` + '123')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if user does not exists', (done) => {
			request(app)
				.get(`/users/${user1Id.substring(0, user1Id.length - 3)}` + '123')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if userId is not the currentUser's id", async (done) => {
			let user2Id;

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
				.expect((res) => (user2Id = res.body.user._id))
				.expect(201);

			request(app)
				.get(`/users/${user2Id}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});
});

describe('updateInfo', () => {
	it("should update the user's information, and body has user property", (done) => {
		const updatedFirstName = 'updatedUser1';

		request(app)
			.put(`/users/${user1Id}`)
			.send({
				oldPassword: 'password123',
				firstName: updatedFirstName,
				lastName: 'updatedUser1',
				email: 'updatedUser1@example.com',
				password: 'updatedPassword123',
				passwordConfirmation: 'updatedPassword123',
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect((res) => {
				if (res.body.user.firstName !== updatedFirstName) {
					throw new Error('User is not updated.');
				}
			})
			.expect(200, done);
	});

	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/users/${user1Id}`)
				.send({
					oldPassword: 'password123',
					firstName: 'user1UpdateErr',
					lastName: 'user1UpdateErr',
					email: 'user1UpdateErr@example.com',
					password: 'passwordNotUpdated123',
					passwordConfirmation: 'passwordNotUpdated123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if userId route parameter is not valid', (done) => {
			request(app)
				.put(`/users/${user1Id}` + '123')
				.send({
					oldPassword: 'password123',
					firstName: 'user1UpdateErr',
					lastName: 'user1UpdateErr',
					email: 'user1UpdateErr@example.com',
					password: 'passwordNotUpdated123',
					passwordConfirmation: 'passwordNotUpdated123',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if user does not exists', (done) => {
			request(app)
				.put(`/users/${user1Id.substring(0, user1Id.length - 3)}` + '123')
				.send({
					oldPassword: 'password123',
					firstName: 'user1UpdateErr',
					lastName: 'user1UpdateErr',
					email: 'user1UpdateErr@example.com',
					password: 'passwordNotUpdated123',
					passwordConfirmation: 'passwordNotUpdated123',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if userId is not the currentUser's id", async (done) => {
			let user2Id;

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
				.expect((res) => (user2Id = res.body.user._id))
				.expect(201);

			request(app)
				.put(`/users/${user2Id}`)
				.send({
					oldPassword: 'password123',
					firstName: 'user2UpdateErr',
					lastName: 'user2UpdateErr',
					email: 'user2UpdateErr@example.com',
					password: 'passwordNotUpdated123',
					passwordConfirmation: 'passwordNotUpdated123',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('body has santinized user and errors property', () => {
		describe('if firstName', () => {
			test('is empty', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: '',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('only contains a whitespace/s', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: ' ',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('length is greater than 255', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'a'.repeat(256),
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});

		describe('if lastName', () => {
			test('is empty', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'invalidUser',
						lastName: '',
						email: 'invalidUser@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('contains a whitespace/s only', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'invalidUser',
						lastName: ' ',
						email: 'invalidUser@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('length is greater than 255', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'invalidUser',
						lastName: 'a'.repeat(256),
						email: 'invalidUser@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});

		// Validation of email handled by express-validator
		describe('if email', () => {
			test('is valid', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'invalidUser.example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('is already taken', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'user1@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
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
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: ' '.repeat(7),
						passwordConfirmation: ' '.repeat(7),
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});

			test('is the same as the current password', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});

		describe('if passwordConfirmation', () => {
			test('does not match password', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'password123',
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});

		describe('if oldPassword', () => {
			test('is incorrect', (done) => {
				request(app)
					.put(`/users/${user1Id}`)
					.send({
						oldPassword: 'incorrectOldPassword',
						firstName: 'invalidUser',
						lastName: 'invalidUser',
						email: 'invalidUser@example.com',
						password: 'passwordNotUpdated123',
						passwordConfirmation: 'passwordNotUpdated123',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422, done);
			});
		});
	});
});

describe('updateProfilePicture', () => {
	const profilePicture2 = 'profile-picture-2.png';

	it("should add the user's profilePicture if there's no old profilePicture, and body has profilePicture property", async (done) => {
		await request(app)
			.put(`/users/${user1Id}/profile-picture`)
			.attach('profilePicture', `test/images/${profilePicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasProfilePictureProperty)
			.expect(200);
		/* Verify that public/images directory now have the recent profile picture.
			 Then clear the public/images directory after.
		*/
		try {
			const files = await fs.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'jpg');
			done();
		} catch (err) {
			done(err);
		}
	});

	it("should delete the old profilePicture if there's any and if profilePicture is successfully updated. And body has profilePicture property", async (done) => {
		await request(app)
			.put(`/users/${user1Id}/profile-picture`)
			.attach('profilePicture', `test/images/${profilePicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasProfilePictureProperty)
			.expect(200);

		// Verify first profilePicture of the user.
		try {
			const files = await fs.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'jpg');
		} catch (err) {
			done(err);
		}

		await request(app)
			.put(`/users/${user1Id}/profile-picture`)
			.attach('profilePicture', `test/images/${profilePicture2}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasProfilePictureProperty)
			.expect(200);

		// Verify that the old profilePicture is deleted. And new one is saved.
		try {
			const files = await fs.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'png');
			done();
		} catch (err) {
			done(err);
		}
	});

	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/users/${user1Id}/profile-picture`)
				.attach('profilePicture', `test/images/${profilePicture1}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if userId route parameter is not valid', (done) => {
			request(app)
				.put(`/users/${user1Id + '123'}/profile-picture`)
				.attach('profilePicture', `test/images/${profilePicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if user does not exists', (done) => {
			request(app)
				.put(
					`/users/${
						user1Id.substring(0, user1Id.length - 3) + '123'
					}/profile-picture `
				)
				.attach('profilePicture', `test/images/${profilePicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if userId is not the currentUser's id", async (done) => {
			let user2Id;

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
				.expect((res) => (user2Id = res.body.user._id))
				.expect(201);

			request(app)
				.put(`/users/${user2Id}/profile-picture`)
				.attach('profilePicture', `test/images/${profilePicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('body has profilePicture and errors property', () => {
		/* If the image exceeds the file size limit, the error will be the same.
			 albeit has different error message.
		*/
		describe('if profilePicture', () => {
			test('has invalid extention. File with invalid file type should not be saved', async (done) => {
				await request(app)
					.put(`/users/${user1Id}/profile-picture`)
					.attach('profilePicture', 'test/files/dummyJson.json')
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasProfilePictureProperty)
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
	});
});
