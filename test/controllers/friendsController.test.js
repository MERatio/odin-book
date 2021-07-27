const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasUsersProperty,
	bodyHasTotalUsersProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasFriendshipProperty,
} = require('../assertionFunctions');

let user1Id;
let user1Jwt;

beforeAll(async () => {
	await mongoConfigTesting.connect();
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
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

describe('index', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get(`/users/${user1Id}/friends`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if userId route parameter is not valid', (done) => {
			request(app)
				.get(`/users/${user1Id + '123'}/friends`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if user does not exists', (done) => {
			request(app)
				.get(
					`/users/${user1Id.substring(0, user1Id.length - 3) + '123'}/friends`
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});
	});

	describe('users', () => {
		let friend1Id;
		let friend2Id;

		beforeEach(async () => {
			for (let i = 1; i < 3; i++) {
				let jwt;
				let friendshipId;

				// Create user.
				await request(app)
					.post('/users')
					.send({
						firstName: `friend${i}`,
						lastName: `friend${i}`,
						email: `friend${i}@example.com`,
						password: 'password123',
						passwordConfirmation: 'password123',
					})
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(bodyHasUserProperty)
					.expect(bodyHasJwtProperty)
					.expect((res) => {
						jwt = res.body.jwt;
						if (i === 1) {
							friend1Id = res.body.user._id;
						} else if (i === 2) {
							friend2Id = res.body.user._id;
						}
					})
					.expect(201);

				// Send friend request to user1.
				await request(app)
					.post('/friendships')
					.send({ requesteeId: user1Id })
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${jwt}`)
					.expect('Content-Type', /json/)
					.expect((res) => {
						friendshipId = res.body.friendship._id;
					})
					.expect(201);

				// user1 accepts their friend request.
				await request(app)
					.put(`/friendships/${friendshipId}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasFriendshipProperty)
					.expect((res) => {
						if (res.body.friendship.status !== 'friends') {
							throw new Error('Friend request is not accepted.');
						}
					})
					.expect(200);
			}
		});

		test('should be recent', (done) => {
			request(app)
				.get(`/users/${user1Id}/friends`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasUsersProperty)
				.expect((res) => {
					if (
						!(
							res.body.users[0]._id === friend2Id &&
							res.body.users[1]._id === friend1Id
						)
					) {
						throw new Error('users are not recent');
					}
				})
				.expect(200, done);
		});

		describe('individual user', () => {
			describe('picture', () => {
				test('should be populated', (done) => {
					request(app)
						.get(`/users/${user1Id}/friends`)
						.set('Accept', 'application/json')
						.set('Authorization', `Bearer ${user1Jwt}`)
						.expect('Content-Type', /json/)
						.expect(bodyHasUsersProperty)
						.expect(bodyHasTotalUsersProperty)
						.expect((res) => {
							if (!res.body.users[0].picture._id) {
								throw new Error('individual user picture is not populated');
							}
						})
						.expect(200, done);
				});
			});
		});
	});

	test('noDocs query parameter set to true should only return the total documents', (done) => {
		request(app)
			.get(`/users/${user1Id}/friends?noDocs=true&limit=15&page=1`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasTotalUsersProperty)
			.expect((res) => {
				if (Object.keys(res.body).length !== 1) {
					throw new Error('users#index - should only return total document');
				}
				if (res.body.totalUsers !== 0) {
					throw new Error('users#index - totalUsers body property error.');
				}
			})
			.expect(200, done);
	});

	describe('pagination', () => {
		let user1TotalFriends = 0;
		let firstFriendId;
		let fifteenthFriendId;
		let twentyFirstFriendshipId;
		let thirtiethFriendId;

		beforeEach(async () => {
			for (let i = 1; i < 31; i++) {
				let jwt;
				let friendshipId;

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
						const user = res.body.user;
						user1TotalFriends += 1;
						if (i === 1) {
							firstFriendId = user._id;
						} else if (i === 15) {
							fifteenthFriendId = user._id;
						} else if (i === 21) {
							twentyFirstFriendshipId = user._id;
						} else if (i === 30) {
							thirtiethFriendId = user._id;
						}
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
						friendshipId = res.body.friendship._id;
					})
					.expect(201);

				await request(app)
					.put(`/friendships/${friendshipId}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasFriendshipProperty)
					.expect((res) => {
						if (res.body.friendship.status !== 'friends') {
							throw new Error('Friend request is not accepted.');
						}
					})
					.expect(200);
			}
		});

		afterEach(() => {
			user1TotalFriends = 0;
		});

		test('works with or without query parameters', async (done) => {
			await request(app)
				.get(`/users/${user1Id}/friends`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasUsersProperty)
				.expect(bodyHasTotalUsersProperty)
				.expect((res) => {
					const { users, totalUsers } = res.body;
					if (users.length !== 10) {
						throw new Error(
							'users#friends pagination - users body property length error.'
						);
					}
					if (totalUsers !== user1TotalFriends) {
						throw new Error(
							'users#friends pagination - totalUsers body property error.'
						);
					}
					if (users[0]._id !== thirtiethFriendId) {
						throw new Error('users#friends pagination - incorrect first user.');
					}
					if (users[users.length - 1]._id !== twentyFirstFriendshipId) {
						throw new Error('users#friends pagination - incorrect last user.');
					}
				})
				.expect(200);

			request(app)
				.get(`/users/${user1Id}/friends?page=2&limit=15`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasUsersProperty)
				.expect(bodyHasTotalUsersProperty)
				.expect((res) => {
					const { users, totalUsers } = res.body;
					if (users.length !== 15) {
						throw new Error(
							'users#friends pagination - users body property length error.'
						);
					}
					if (totalUsers !== user1TotalFriends) {
						throw new Error(
							'users#friends pagination - totalUsers body property error.'
						);
					}
					if (users[0]._id !== fifteenthFriendId) {
						throw new Error('users#friends pagination - incorrect first user.');
					}
					if (users[users.length - 1]._id !== firstFriendId) {
						throw new Error('users#friends pagination - incorrect last user.');
					}
				})
				.expect(200, done);
		});
	});
});
