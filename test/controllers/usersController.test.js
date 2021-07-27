const fsPromises = require('fs/promises');
const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	imagesPath,
	testImagesPath,
	testFilesPath,
	userPicture1,
	json1,
} = require('../variables');
const emptyDir = require('../lib/emptyDir');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUsersProperty,
	bodyHasTotalUsersProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasFriendshipProperty,
} = require('../assertionFunctions');

let user1Id;
let user1Jwt;
let imagesDirFileInitialCount = 0;
let indexTotalUsers = 0;

beforeAll(async () => {
	await mongoConfigTesting.connect();
	imagesDirFileInitialCount = (await fsPromises.readdir(imagesPath)).length;
});
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
		.expect((res) => {
			indexTotalUsers += 0;
			user1Id = res.body.user._id;
		})
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
	indexTotalUsers = 0;
	await emptyDir(imagesPath, ['user.jpg', 'post.jpg']);
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

describe('index', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get('/users')
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	it("should get all users who don't have a friendship with currentUser", async (done) => {
		let userWithNoFriendshipWithCurrentUserId;
		let requesteeId;
		let requestorId;
		let requestorJwt;
		let friendId;
		let friendJwt;
		let user1AndFriendFriendshipId;

		await request(app)
			.post('/users')
			.send({
				firstName: 'userWithNoFriendshipWithCurrentUser',
				lastName: 'userWithNoFriendshipWithCurrentUser',
				email: 'userWithNoFriendshipWithCurrentUser@example.com',
				password: 'password123',
				passwordConfirmation: 'password123',
			})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect(bodyHasJwtProperty)
			.expect(
				(res) => (userWithNoFriendshipWithCurrentUserId = res.body.user._id)
			)
			.expect(201);

		await request(app)
			.post('/users')
			.send({
				firstName: 'requestee',
				lastName: 'requestee',
				email: 'requestee@example.com',
				password: 'password123',
				passwordConfirmation: 'password123',
			})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect(bodyHasJwtProperty)
			.expect((res) => (requesteeId = res.body.user._id))
			.expect(201);

		await request(app)
			.post('/users')
			.send({
				firstName: 'requestor',
				lastName: 'requestor',
				email: 'requestor@example.com',
				password: 'password123',
				passwordConfirmation: 'password123',
			})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect(bodyHasJwtProperty)
			.expect((res) => (requestorId = res.body.user._id))
			.expect(201);

		await request(app)
			.post('/auth/local')
			.send({
				email: 'requestor@example.com',
				password: 'password123',
			})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasJwtProperty)
			.expect(bodyHasCurrentUserProperty)
			.expect((res) => (requestorJwt = res.body.jwt))
			.expect(200);

		await request(app)
			.post('/users')
			.send({
				firstName: 'friend',
				lastName: 'friend',
				email: 'friend@example.com',
				password: 'password123',
				passwordConfirmation: 'password123',
			})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect(bodyHasJwtProperty)
			.expect((res) => (friendId = res.body.user._id))
			.expect(201);

		await request(app)
			.post('/auth/local')
			.send({
				email: 'friend@example.com',
				password: 'password123',
			})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasJwtProperty)
			.expect(bodyHasCurrentUserProperty)
			.expect((res) => (friendJwt = res.body.jwt))
			.expect(200);

		// user1 sends a friend request to requestee.
		await request(app)
			.post('/friendships')
			.send({ requesteeId })
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasFriendshipProperty)
			.expect(201);

		// requestor sends a friend request to user1.
		await request(app)
			.post('/friendships')
			.send({ requesteeId: user1Id })
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${requestorJwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasFriendshipProperty)
			.expect(201);

		// user1 sends a friend request to friend.
		await request(app)
			.post('/friendships')
			.send({ requesteeId: friendId })
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasFriendshipProperty)
			.expect((res) => (user1AndFriendFriendshipId = res.body.friendship._id))
			.expect(201);

		// friend accepts user1's friend request.
		await request(app)
			.put(`/friendships/${user1AndFriendFriendshipId}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${friendJwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasFriendshipProperty)
			.expect((res) => {
				if (res.body.friendship.status !== 'friends') {
					throw new Error('Friend request is not accepted.');
				}
			})
			.expect(200);

		request(app)
			.get('/users')
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUsersProperty)
			.expect((res) => {
				const usersIds = res.body.users.map((user) => user._id);
				if (usersIds.includes(user1Id)) {
					throw new Error('currentUser should not be included in users index');
				}
				if (!usersIds.includes(userWithNoFriendshipWithCurrentUserId)) {
					throw new Error(
						'users with no friendship currentUser should be included users index.'
					);
				}
				if (usersIds.includes(requesteeId)) {
					throw new Error('requestees should not be included in users index.');
				}
				if (usersIds.includes(requestorId)) {
					throw new Error('requestors should not be included in users index.');
				}
				if (usersIds.includes(friendId)) {
					throw new Error('friends should not be included in users index.');
				}
			})
			.expect(200, done);
	});

	test('should be recent', async (done) => {
		let stranger1Id;
		let stranger2Id;

		for (let i = 1; i < 3; i++) {
			await request(app)
				.post('/users')
				.send({
					firstName: `stranger${i}`,
					lastName: `stranger${i}`,
					email: `stranger${i}@example.com`,
					password: 'password123',
					passwordConfirmation: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasUserProperty)
				.expect(bodyHasJwtProperty)
				.expect((res) => {
					if (i === 1) {
						stranger1Id = res.body.user._id;
					} else if (i === 2) {
						stranger2Id = res.body.user._id;
					}
				})
				.expect(201);
		}

		request(app)
			.get('/users')
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUsersProperty)
			.expect((res) => {
				if (
					!(
						res.body.users[0]._id === stranger2Id &&
						res.body.users[res.body.users.length - 1]._id === stranger1Id
					)
				) {
					throw new Error('users are not recent');
				}
			})
			.expect(200, done);
	});

	describe('individual user', () => {
		beforeEach(async () => {
			await request(app)
				.post('/users')
				.send({
					firstName: `user`,
					lastName: `user`,
					email: `user@example.com`,
					password: 'password123',
					passwordConfirmation: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasUserProperty)
				.expect(bodyHasJwtProperty)
				.expect(201);
		});

		describe('picture', () => {
			test('should be populated', (done) => {
				request(app)
					.get('/users')
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasUsersProperty)
					.expect((res) => {
						if (!res.body.users[0].picture._id) {
							throw new Error('individual user picture is not populated');
						}
					})
					.expect(200, done);
			});
		});
	});

	test('noDocs query parameter set to true should only return the total documents', (done) => {
		request(app)
			.get(`/users?noDocs=true&limit=15&page=1`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasTotalUsersProperty)
			.expect((res) => {
				if (Object.keys(res.body).length !== 1) {
					throw new Error('users#index - should only return total document');
				}
				if (res.body.totalUsers !== indexTotalUsers) {
					throw new Error('users#index - totalUsers body property error.');
				}
			})
			.expect(200, done);
	});

	describe('pagination', () => {
		let firstUserId;
		let fifteenthUserId;
		let twentyFirstUserId;
		let thirtiethUserId;

		beforeEach(async () => {
			for (let i = 1; i < 31; i++) {
				await request(app)
					.post('/users')
					.send({
						firstName: `userPagination${i}`,
						lastName: `userPagination${i}`,
						email: `userPagination${i}@example.com`,
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasUserProperty)
					.expect(bodyHasJwtProperty)
					.expect((res) => {
						const user = res.body.user;
						indexTotalUsers += 1;
						if (i === 1) {
							firstUserId = user._id;
						} else if (i === 15) {
							fifteenthUserId = user._id;
						} else if (i === 21) {
							twentyFirstUserId = user._id;
						} else if (i === 30) {
							thirtiethUserId = user._id;
						}
					})
					.expect(201);
			}
		});

		test('works with or without query parameters', async (done) => {
			await request(app)
				.get('/users')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasUsersProperty)
				.expect(bodyHasTotalUsersProperty)
				.expect((res) => {
					const { users, totalUsers } = res.body;
					if (users.length !== 10) {
						throw new Error(
							'users#index pagination - users body property length error.'
						);
					}
					if (totalUsers !== indexTotalUsers) {
						throw new Error(
							'users#index pagination - totalUsers body property error.'
						);
					}
					if (users[0]._id !== thirtiethUserId) {
						throw new Error('users#index pagination - incorrect first user.');
					}
					if (users[users.length - 1]._id !== twentyFirstUserId) {
						throw new Error('users#index pagination - incorrect last user.');
					}
				})
				.expect(200);

			request(app)
				.get('/users?page=2&limit=15')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasUsersProperty)
				.expect(bodyHasTotalUsersProperty)
				.expect((res) => {
					const { users, totalUsers } = res.body;
					if (users.length !== 15) {
						throw new Error(
							'users#index pagination - users body property length error.'
						);
					}
					if (totalUsers !== indexTotalUsers) {
						throw new Error(
							'users#index pagination - totalUsers body property error.'
						);
					}
					if (users[0]._id !== fifteenthUserId) {
						throw new Error('users#index pagination - incorrect first user.');
					}
					if (users[users.length - 1]._id !== firstUserId) {
						throw new Error('users#index pagination - incorrect last user.');
					}
				})
				.expect(200, done);
		});
	});
});

describe('create', () => {
	describe('body has err property', () => {
		test('if valid JWT is supplied', (done) => {
			request(app)
				.post(`/users`)
				.send({
					firstName: 'userNotSaved',
					lastName: 'userNotSaved',
					email: 'userNotSaved@example.com',
					password: 'password123',
					passwordConfirmation: 'password123',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(403, done);
		});
	});

	describe('body has santinized user and errors property', () => {
		test('if form texts has error/s. And if there is a uploaded valid picture delete it', async (done) => {
			await request(app)
				.post('/users')
				.field('firstName', '')
				.field('lastName', 'user2')
				.field('email', 'user2@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.attach('picture', `${testImagesPath}/${userPicture1}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrorsProperty)
				.expect(bodyHasUserProperty)
				.expect(422);
			// Verify that the valid picture is not saved because of form texts errors.
			try {
				const files = await fsPromises.readdir(imagesPath);
				expect(files.length).toBe(imagesDirFileInitialCount);
				const isNewFileSaved = files.some((file) =>
					file.includes(userPicture1)
				);
				expect(isNewFileSaved).toBe(false);
				done();
			} catch (err) {
				done(err);
			}
		});

		test('if picture and form texts has error/s. They should be concatenated in 1 array. picture should not be saved', async (done) => {
			await request(app)
				.post('/users')
				.field('firstName', '')
				.field('lastName', 'user2')
				.field('email', 'user2@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.attach('picture', `${testFilesPath}/${json1}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrorsProperty)
				.expect((res) => {
					if (res.body.errors.length !== 2) {
						throw new Error('Should have picture and form texts errors.');
					}
				})
				.expect(bodyHasUserProperty)
				.expect(422);
			// Verify that the invalid picture is not saved because of image and form texts errors.
			try {
				const files = await fsPromises.readdir(imagesPath);
				expect(files.length).toBe(imagesDirFileInitialCount);
				const isNewFileSaved = files.some((file) => file.includes(json1));
				expect(isNewFileSaved).toBe(false);
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

		describe('if picture', () => {
			/* If the picture exceeds the file size limit, the error will be the same.
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
					.attach('picture', `${testFilesPath}/${json1}`)
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasUserProperty)
					.expect(422);
				// Verify that the file with invalid file type is not saved.
				try {
					const files = await fsPromises.readdir(imagesPath);
					expect(files.length).toBe(imagesDirFileInitialCount);
					const isNewFileSaved = files.some((file) => file.includes(json1));
					expect(isNewFileSaved).toBe(false);
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

	describe('create and return the new user and jwt,', () => {
		test('if all fields are valid', async (done) => {
			// Create a valid user.
			await request(app)
				.post('/users')
				.field('firstName', 'user2')
				.field('lastName', 'user2')
				.field('email', 'user2@example.com')
				.field('password', 'password123')
				.field('passwordConfirmation', 'password123')
				.attach('picture', `${testImagesPath}/${userPicture1}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasUserProperty)
				.expect(bodyHasJwtProperty)
				.expect(201);
			// Verify that public/images directory now have the recent picture.
			try {
				const files = await fsPromises.readdir(imagesPath);
				expect(files.length).toBe(imagesDirFileInitialCount + 1);
				const isNewFileSaved = files.some((file) =>
					file.includes(userPicture1)
				);
				expect(isNewFileSaved).toBe(true);
				done();
			} catch (err) {
				done(err);
			}
		});

		test('if picture is not supplied but all other fields are valid', (done) => {
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
				.expect(bodyHasJwtProperty)
				.expect((res) => res.body.user.picture.filename === '')
				.expect(201, done);
		});
	});
});

describe('getCurrentUser', () => {
	describe('body has currentUser set to false', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get('/users/current-user')
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasCurrentUserProperty)
				.expect((res) => {
					if (res.body.currentUser !== false) {
						throw new Error(
							'getCurrentUser error: currentUser is not set to false.'
						);
					}
				})
				.expect(200, done);
		});
	});

	describe('body has currentUser set to currentUser data', () => {
		test('if JWT is valid', (done) => {
			request(app)
				.get('/users/current-user')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasCurrentUserProperty)
				.expect((res) => {
					if (res.body.currentUser._id !== user1Id) {
						throw new Error(
							'getCurrentUser error: currentUser is not set to currentUser data.'
						);
					}
				})
				.expect(200, done);
		});
	});
});

describe('show', () => {
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
				.get(`/users/${user1Id + '123'}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if user does not exists', (done) => {
			request(app)
				.get(`/users/${user1Id.substring(0, user1Id.length - 3) + '123'}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});
	});

	it('should get own user information (except password) as user property', (done) => {
		request(app)
			.get(`/users/${user1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect((res) => {
				if (res.body.user._id !== user1Id) {
					throw new Error('Did not get own user information.');
				}
				const ownUserPropertyNames = Object.keys(res.body.user);
				if (ownUserPropertyNames.includes('password')) {
					throw new Error(
						'(users#show) Password should not included in own user info.'
					);
				}
			})
			.expect(200, done);
	});

	it('should get other user information (except password) as user property', async (done) => {
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
			.expect(bodyHasJwtProperty)
			.expect((res) => (user2Id = res.body.user._id))
			.expect(201);

		request(app)
			.get(`/users/${user2Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect((res) => {
				if (res.body.user._id !== user2Id) {
					throw new Error("Did not get other user's information.");
				}
				const otherUserPropertyNames = Object.keys(res.body.user);
				if (otherUserPropertyNames.includes('password')) {
					throw new Error(
						"(users#show) Password should not included in other user's info."
					);
				}
			})
			.expect(200, done);
	});

	describe("user's", () => {
		describe('picture ', () => {
			test('should be populated', (done) => {
				request(app)
					.get(`/users/${user1Id}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasUserProperty)
					.expect((res) => {
						if (!res.body.user.picture._id) {
							throw new Error("user's picture is not populated");
						}
					})
					.expect(200, done);
			});
		});
	});
});

describe('edit', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get(`/users/${user1Id}/edit`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if userId route parameter is not valid', (done) => {
			request(app)
				.get(`/users/${user1Id + '123'}/edit`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if user does not exists', (done) => {
			request(app)
				.get(`/users/${user1Id.substring(0, user1Id.length - 3) + '123'}/edit`)
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
				.expect(bodyHasJwtProperty)
				.expect((res) => (user2Id = res.body.user._id))
				.expect(201);

			request(app)
				.get(`/users/${user2Id}/edit`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	it("should get the user's information as the user property", (done) => {
		request(app)
			.get(`/users/${user1Id}/edit`)
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
});

describe('updateInfo', () => {
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
				.expect(bodyHasJwtProperty)
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
});
