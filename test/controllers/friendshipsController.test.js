const request = require('supertest');
const app = require('../../app');
const Friendship = require('../../models/friendship');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasFriendshipsProperty,
	bodyHasTotalFriendshipsProperty,
	bodyHasFriendshipProperty,
} = require('../assertionFunctions');

let user1Id;
let user2Id;
let user3Id;
let user1Jwt;
let user2Jwt;
let user3Jwt;
let user1AndUser2FriendshipId;
let user1TotalFriendRequests = 0;

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
		.expect((res) => (user1Id = res.body.user._id))
		.expect(201);
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
	await request(app)
		.post('/users')
		.send({
			firstName: 'user3',
			lastName: 'user3',
			email: 'user3@example.com',
			password: 'password123',
			passwordConfirmation: 'password123',
		})
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(bodyHasUserProperty)
		.expect(bodyHasJwtProperty)
		.expect((res) => (user3Id = res.body.user._id))
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
		.post('/auth/local')
		.send({
			email: 'user3@example.com',
			password: 'password123',
		})
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(bodyHasJwtProperty)
		.expect(bodyHasCurrentUserProperty)
		.expect((res) => (user3Jwt = res.body.jwt))
		.expect(200);
	// user1 sends a friend request to user2.
	await request(app)
		.post('/friendships')
		.send({
			requesteeId: user2Id,
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasFriendshipProperty)
		.expect((res) => (user1AndUser2FriendshipId = res.body.friendship._id))
		.expect(201);
});
afterEach(async () => {
	user1TotalFriendRequests = 0;
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

describe('create', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.post('/friendships')
				.send({
					requesteeId: user3Id,
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if user send a friend request to themselves', (done) => {
			request(app)
				.post('/friendships')
				.send({
					requesteeId: user2Id,
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect(bodyHasErrProperty)
				.expect(422, done);
		});

		test('if friendship between user already exists', async (done) => {
			await request(app)
				.post('/friendships')
				.send({
					requesteeId: user3Id,
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasFriendshipProperty)
				.expect(201);

			request(app)
				.post('/friendships')
				.send({
					requesteeId: user3Id,
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect(bodyHasErrProperty)
				.expect(422, done);
		});
	});

	describe('body has friendship and errors', () => {
		test('if requesteeId is not valid', (done) => {
			request(app)
				.post('/friendships')
				.send({ requesteeId: 'notAMongoId123' })
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrorsProperty)
				.expect(bodyHasFriendshipProperty)
				.expect(422, done);
		});
	});

	it('should send a friend request to other user', async (done) => {
		request(app)
			.post('/friendships')
			.send({
				requesteeId: user3Id,
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasFriendshipProperty)
			.expect(201, done);
	});
});

describe('update', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/friendships/${user1AndUser2FriendshipId}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if friendshipId route parameter is not valid', (done) => {
			request(app)
				.put(`/friendships/${user1AndUser2FriendshipId}` + '123')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if friendship does not exists', (done) => {
			request(app)
				.put(
					`/friendships/${user1AndUser2FriendshipId.substring(
						0,
						user1AndUser2FriendshipId.length - 3
					)}` + '123'
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if requestee is not the currentUser', (done) => {
			request(app)
				.put(`/friendships/${user1AndUser2FriendshipId}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	test('body has err property if friend request is already accepted', async (done) => {
		await request(app)
			.put(`/friendships/${user1AndUser2FriendshipId}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasFriendshipProperty)
			.expect((res) => {
				if (res.body.friendship.status !== 'friends') {
					throw new Error('Friendship status should not change.');
				}
			})
			.expect(200);

		request(app)
			.put(`/friendships/${user1AndUser2FriendshipId}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasErrProperty)
			.expect(400, done);
	});
});

it('should accept the friend request of other user', (done) => {
	request(app)
		.put(`/friendships/${user1AndUser2FriendshipId}`)
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user2Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasFriendshipProperty)
		.expect((res) => {
			if (res.body.friendship.status !== 'friends') {
				throw new Error('Friend request is not accepted.');
			}
		})
		.expect(200, done);
});

describe('destroy', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.del(`/friendships/${user1AndUser2FriendshipId}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if friendshipId route parameter is not valid', (done) => {
			request(app)
				.del(`/friendships/${user1AndUser2FriendshipId}` + '123')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if friendship does not exists', (done) => {
			request(app)
				.del(
					`/friendships/${user1AndUser2FriendshipId.substring(
						0,
						user1AndUser2FriendshipId.length - 3
					)}` + '123'
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if currentUser is not the requestor or the requestee', (done) => {
			request(app)
				.del(`/friendships/${user1AndUser2FriendshipId}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user3Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	it('should remove the friendship', async (done) => {
		await request(app)
			.del(`/friendships/${user1AndUser2FriendshipId}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasFriendshipProperty)
			.expect((res) => {
				if (res.body.friendship.status !== 'pending') {
					throw new Error('Friendship status should not change.');
				}
			})
			.expect(200);

		try {
			// Test to see if the friendship is removed.
			expect(await Friendship.exists({ _id: user1AndUser2FriendshipId })).toBe(
				false
			);
			done();
		} catch (err) {
			done(err);
		}
	});
});

describe('friendRequests', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get(`/users/${user1Id}/friend-requests`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if userId route parameter is not valid', (done) => {
			request(app)
				.get(`/users/${user1Id + '123'}/friend-requests`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if user does not exists', (done) => {
			request(app)
				.get(
					`/users/${
						user1Id.substring(0, user1Id.length - 3) + '123'
					}/friend-requests`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if userId is not the currentUser's id", (done) => {
			request(app)
				.get(`/users/${user1Id}/friend-requests`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('friendships', () => {
		let friendship1Id;
		let friendship2Id;

		beforeEach(async () => {
			for (let i = 1; i < 3; i++) {
				let jwt;

				await request(app)
					.post('/users')
					.send({
						firstName: `requestor${i}`,
						lastName: `requestor${i}`,
						email: `requestor${i}@example.com`,
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasUserProperty)
					.expect(bodyHasJwtProperty)
					.expect((res) => {
						jwt = res.body.jwt;
					})
					.expect(201);

				await request(app)
					.post('/friendships')
					.send({ requesteeId: user1Id })
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${jwt}`)
					.expect('Content-Type', /json/)
					.expect((res) => {
						if (i === 1) {
							friendship1Id = res.body.friendship._id;
						} else if (i === 2) {
							friendship2Id = res.body.friendship._id;
						}
					})
					.expect(201);
			}
		});

		test('should be recent', (done) => {
			request(app)
				.get(`/users/${user1Id}/friend-requests`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasFriendshipsProperty)
				.expect((res) => {
					if (
						!(
							res.body.friendships[0]._id === friendship2Id &&
							res.body.friendships[1]._id === friendship1Id
						)
					) {
						throw new Error('friendships are not recent');
					}
				})
				.expect(200, done);
		});

		describe('individual friendship', () => {
			describe('requestor', () => {
				test('should be populated', (done) => {
					request(app)
						.get(`/users/${user1Id}/friend-requests`)
						.set('Accept', 'application/json')
						.set('Authorization', `Bearer ${user1Jwt}`)
						.expect('Content-Type', /json/)
						.expect(bodyHasFriendshipsProperty)
						.expect(bodyHasTotalFriendshipsProperty)
						.expect((res) => {
							if (!res.body.friendships[0].requestor._id) {
								throw new Error(
									'individual friendship requestor is not populated'
								);
							}
						})
						.expect(200, done);
				});
			});
		});
	});

	describe('pagination', () => {
		let firstFriendshipId;
		let fifteenthFriendshipId;
		let twentyFirstFriendshipId;
		let thirtiethFriendshipId;

		beforeEach(async () => {
			for (let i = 1; i < 31; i++) {
				let jwt;

				await request(app)
					.post('/users')
					.send({
						firstName: `requestor${i}`,
						lastName: `requestor${i}`,
						email: `requestor${i}@example.com`,
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasUserProperty)
					.expect(bodyHasJwtProperty)
					.expect((res) => {
						jwt = res.body.jwt;
					})
					.expect(201);

				await request(app)
					.post('/friendships')
					.send({ requesteeId: user1Id })
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasFriendshipProperty)
					.expect((res) => {
						const friendship = res.body.friendship;
						user1TotalFriendRequests += 1;
						if (i === 1) {
							firstFriendshipId = friendship._id;
						} else if (i === 15) {
							fifteenthFriendshipId = friendship._id;
						} else if (i === 21) {
							twentyFirstFriendshipId = friendship._id;
						} else if (i === 30) {
							thirtiethFriendshipId = friendship._id;
						}
					})
					.expect(201);
			}
		});

		test('works with or without query parameters', async (done) => {
			await request(app)
				.get(`/users/${user1Id}/friend-requests`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasFriendshipsProperty)
				.expect(bodyHasTotalFriendshipsProperty)
				.expect((res) => {
					const { friendships, totalFriendships } = res.body;
					if (friendships.length !== 10) {
						throw new Error(
							'friendships#friendRequests pagination - friendships body property length error.'
						);
					}
					if (totalFriendships !== user1TotalFriendRequests) {
						throw new Error(
							'friendships#friendRequests pagination - totalFriendships body property error.'
						);
					}
					if (friendships[0]._id !== thirtiethFriendshipId) {
						throw new Error(
							'friendships#friendRequests pagination - incorrect first friendship.'
						);
					}
					if (
						friendships[friendships.length - 1]._id !== twentyFirstFriendshipId
					) {
						throw new Error(
							'friendships#friendRequests pagination - incorrect last friendship.'
						);
					}
				})
				.expect(200);

			request(app)
				.get(`/users/${user1Id}/friend-requests?page=2&limit=15`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasFriendshipsProperty)
				.expect(bodyHasTotalFriendshipsProperty)
				.expect((res) => {
					const { friendships, totalFriendships } = res.body;
					if (friendships.length !== 15) {
						throw new Error(
							'friendships#friendRequests pagination - friendships body property length error.'
						);
					}
					if (totalFriendships !== user1TotalFriendRequests) {
						throw new Error(
							'friendships#friendRequests pagination - totalFriendships body property error.'
						);
					}
					if (friendships[0]._id !== fifteenthFriendshipId) {
						throw new Error(
							'friendships#friendRequests pagination - incorrect first friendship.'
						);
					}
					if (friendships[friendships.length - 1]._id !== firstFriendshipId) {
						throw new Error(
							'friendships#friendRequests pagination - incorrect last friendship.'
						);
					}
				})
				.expect(200, done);
		});
	});
});
