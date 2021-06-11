const path = require('path');
const fsPromises = require('fs/promises');
const request = require('supertest');
const app = require('../../app');
const Reaction = require('../../models/reaction');
const Comment = require('../../models/comment');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasFriendshipProperty,
	bodyHasPostsProperty,
	bodyHasPostsCountProperty,
	bodyHasPostProperty,
	bodyHasImageProperty,
	bodyHasReactionProperty,
	bodyHasCommentProperty,
} = require('../assertionFunctions');

let user1Id;
let user2Id;
let user1Jwt;
let user2Jwt;
let user1Post1Id;
let user1AndUser2FriendshipId;
let user2Post1Id;
let user2Post1Reaction1Id;
let user2Post1Comment4Id;
let indexPostsCount = 0;
const imagesPath = 'public/images';
const image1 = 'post-image-1.jpg';
const updatedUser1PostText = 'updatedUser1Post1Text';

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
		.post('/posts')
		.send({
			text: 'userPost1',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasPostProperty)
		.expect((res) => {
			user1Post1Id = res.body.post._id;
			indexPostsCount += 1;
		})
		.expect(201);
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
	await request(app)
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
		.expect(200);
	await request(app)
		.post('/posts')
		.send({
			text: 'user2Post1',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user2Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasPostProperty)
		.expect((res) => {
			user2Post1Id = res.body.post._id;
			indexPostsCount += 1;
		})
		.expect(201);
	await request(app)
		.post(`/posts/${user2Post1Id}/reactions`)
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasReactionProperty)
		.expect((res) => (user2Post1Reaction1Id = res.body.reaction._id))
		.expect(201);
	await request(app)
		.post(`/posts/${user2Post1Id}/comments`)
		.send({
			text: 'user2Post1Comment1Id',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasCommentProperty)
		.expect(201);
	await request(app)
		.post(`/posts/${user2Post1Id}/comments`)
		.send({
			text: 'user2Post1IdComment2',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasCommentProperty)
		.expect(201);
	await request(app)
		.post(`/posts/${user2Post1Id}/comments`)
		.send({
			text: 'user2Post1IdComment3',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasCommentProperty)
		.expect(201);
	await request(app)
		.post(`/posts/${user2Post1Id}/comments`)
		.send({
			text: 'user2Post1IdComment4',
		})
		.set('Accept', 'application/json')
		.set('Authorization', `Bearer ${user1Jwt}`)
		.expect('Content-Type', /json/)
		.expect(bodyHasCommentProperty)
		.expect((res) => (user2Post1Comment4Id = res.body.comment._id))
		.expect(201);
});
afterEach(async () => {
	indexPostsCount = 0;
	// Delete all files in public/images directory.
	const files = await fsPromises.readdir(imagesPath);
	for (const file of files) {
		await fsPromises.unlink(path.join(imagesPath, file));
	}
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

describe('index', () => {
	test('should require a valid JWT', (done) => {
		request(app)
			.get('/posts')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasErrProperty)
			.expect(401, done);
	});

	describe('posts', () => {
		let stranger1Jwt;
		let stranger1Post1Id;

		beforeEach(async () => {
			await request(app)
				.post('/users')
				.send({
					firstName: 'stranger',
					lastName: 'stranger',
					email: 'stranger@example.com',
					password: 'password123',
					passwordConfirmation: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasUserProperty)
				.expect(bodyHasJwtProperty)
				.expect(201);

			await request(app)
				.post('/auth/local')
				.send({
					email: 'stranger@example.com',
					password: 'password123',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasJwtProperty)
				.expect(bodyHasCurrentUserProperty)
				.expect((res) => (stranger1Jwt = res.body.jwt))
				.expect(200);

			await request(app)
				.post('/posts')
				.send({
					text: 'stranger1Post1',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${stranger1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect((res) => (stranger1Post1Id = res.body.post._id))
				.expect(201);
		});

		test('should be from currentUser and friends only', (done) => {
			request(app)
				.get('/posts')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostsProperty)
				.expect((res) => {
					let isCurrentUserPostIncluded = false;
					let isFriendPostIncluded = false;
					const postsIds = res.body.posts.map((post) => post._id);
					postsIds.forEach((postId) => {
						if (postId.toString() === user1Post1Id) {
							isCurrentUserPostIncluded = true;
						} else if (postId.toString() === user2Post1Id) {
							isFriendPostIncluded = true;
						} else if (postId.toString() === stranger1Post1Id) {
							throw new Error(
								"Stranger's posts should not be included in post's index."
							);
						}
					});
					if (!isCurrentUserPostIncluded) {
						throw new Error(
							"currentUser's posts should be included in post's index."
						);
					} else if (!isFriendPostIncluded) {
						throw new Error(
							"Friends's posts should be included in post's index."
						);
					}
				})
				.expect(200, done);
		});

		test('should be recent', (done) => {
			request(app)
				.get('/posts')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostsProperty)
				.expect((res) => {
					if (
						!(
							res.body.posts[0]._id === user2Post1Id &&
							res.body.posts[res.body.posts.length - 1]._id === user1Post1Id
						)
					) {
						throw new Error('posts are not recent');
					}
				})
				.expect(200, done);
		});

		describe('individual post', () => {
			describe('author', () => {
				test('should be populated', (done) => {
					request(app)
						.get('/posts')
						.set('Accept', 'application/json')
						.set('Authorization', `Bearer ${user1Jwt}`)
						.expect('Content-Type', /json/)
						.expect(bodyHasPostsProperty)
						.expect((res) => {
							if (!res.body.posts[0].author._id) {
								throw new Error('individual post author is not populated');
							}
						})
						.expect(200, done);
				});
			});

			describe('reactions', () => {
				test('should be populated', (done) => {
					request(app)
						.get('/posts')
						.set('Accept', 'application/json')
						.set('Authorization', `Bearer ${user1Jwt}`)
						.expect('Content-Type', /json/)
						.expect(bodyHasPostsProperty)
						.expect((res) => {
							if (!res.body.posts[0].reactions[0]._id) {
								throw new Error('individual post reactions is not populated');
							}
						})
						.expect(200, done);
				});
			});
		});
	});

	describe('pagination', () => {
		beforeEach(async () => {
			for (let i = 1; i < 31; i++) {
				await request(app)
					.post('/posts')
					.send({
						text: `postPagination${i}`,
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user2Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostProperty)
					.expect(() => (indexPostsCount += 1))
					.expect(201);
			}
		});

		test('works with or without query parameters', async (done) => {
			await request(app)
				.get('/posts')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostsProperty)
				.expect(bodyHasPostsCountProperty)
				.expect((res) => {
					const { posts, postsCount } = res.body;
					if (posts.length !== 10) {
						throw new Error(
							'posts#index pagination - posts body property length error.'
						);
					}
					if (postsCount !== indexPostsCount) {
						throw new Error(
							'posts#index pagination - postsCount body property error.'
						);
					}
					if (posts[0].text !== 'postPagination30') {
						throw new Error('posts#index pagination - incorrect first post.');
					}
					if (posts[posts.length - 1].text !== 'postPagination21') {
						throw new Error('posts#index pagination - incorrect last post.');
					}
				})
				.expect(200);

			request(app)
				.get('/posts?page=2&limit=15')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostsProperty)
				.expect(bodyHasPostsCountProperty)
				.expect((res) => {
					const { posts, postsCount } = res.body;
					if (posts.length !== 15) {
						throw new Error(
							'posts#index pagination - posts body property length error.'
						);
					}
					if (postsCount !== indexPostsCount) {
						throw new Error(
							'posts#index pagination - postsCount body property error.'
						);
					}
					if (posts[0].text !== 'postPagination15') {
						throw new Error('posts#index pagination - incorrect first post.');
					}
					if (posts[posts.length - 1].text !== 'postPagination1') {
						throw new Error('posts#index pagination - incorrect last post.');
					}
				})
				.expect(200, done);
		});
	});
});

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
		test('if form texts has error/s. And if there is a uploaded valid image delete it', async (done) => {
			await request(app)
				.post('/posts')
				.field({ text: '' })
				.attach('image', `test/images/${image1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect(422);
			// Verify that the valid imqge is not saved because of form texts errors.
			try {
				const files = await fsPromises.readdir(imagesPath);
				expect(files.length).toBe(0);
				done();
			} catch (err) {
				done(err);
			}
		});

		test('if image and form texts has error/s. They should be concatenated in 1 array. image should not be saved', async (done) => {
			await request(app)
				.post('/posts')
				.field({ text: '' })
				.attach('image', `test/files/dummyJson.json`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrorsProperty)
				.expect((res) => {
					if (res.body.errors.length !== 2) {
						throw new Error('Should have image and form texts errors.');
					}
				})
				.expect(bodyHasPostProperty)
				.expect(422);
			// Verify that the invalid image is not saved because of image and form texts errors.
			try {
				const files = await fsPromises.readdir(imagesPath);
				expect(files.length).toBe(0);
				done();
			} catch (err) {
				done(err);
			}
		});

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
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
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
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
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
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});
		});

		describe('if image', () => {
			/* If the image exceeds the file size limit, the error will be the same.
				 albeit has different error message.
			*/
			test('has invalid extention. File with invalid file type should not be saved', async (done) => {
				await request(app)
					.post('/posts')
					.field({ text: 'hello world' })
					.attach('image', 'test/files/dummyJson.json')
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422);
				// Verify that the file with invalid file type is not saved.
				try {
					const files = await fsPromises.readdir(imagesPath);
					expect(files.length).toBe(0);
					done();
				} catch (err) {
					done(err);
				}
			});
		});
	});

	describe('create and return the new post object', () => {
		test('if all fields are valid', async (done) => {
			// Create a valid post.
			await request(app)
				.post('/posts')
				.field({ text: 'valid post' })
				.attach('image', `test/images/${image1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect(201);
			// Verify that public/images directory now have the recent image.
			try {
				const files = await fsPromises.readdir(imagesPath);
				expect(files.length).toBe(1);
				expect(files[0].split('.')[1] === 'jpg');
				done();
			} catch (err) {
				done(err);
			}
		});

		test('if image is not supplied but all other fields are valid', (done) => {
			request(app)
				.post('/posts')
				.field({ text: 'valid post' })
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect((res) => res.body.post.image === '')
				.expect(201, done);
		});
	});

	test("post should be included in user's posts when post is created", (done) => {
		request(app)
			.get(`/users/${user1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect((res) => {
				const userPostsIds = res.body.user.posts.map((post) => post._id);
				if (!userPostsIds.includes(user1Post1Id)) {
					throw new Error("Post is not included in user's posts");
				}
			})
			.expect(200, done);
	});
});

describe('show', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.get(`/posts/${user2Post1Id}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.get(`/posts/${user2Post1Id}` + '123')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.get(
					`/posts/${user2Post1Id.substring(0, user2Post1Id.length - 3)}` + '123'
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});
	});

	test('body should have a post property', (done) => {
		request(app)
			.get(`/posts/${user2Post1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPostProperty)
			.expect(200, done);
	});

	describe("post's", () => {
		describe('author ', () => {
			test('should be populated', (done) => {
				request(app)
					.get(`/posts/${user2Post1Id}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostProperty)
					.expect((res) => {
						if (!res.body.post.author._id) {
							throw new Error("post's author is not populated");
						}
					})
					.expect(200, done);
			});
		});

		describe('reactions', () => {
			test('should be populated', (done) => {
				request(app)
					.get(`/posts/${user2Post1Id}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostProperty)
					.expect((res) => {
						if (!res.body.post.reactions[0]._id) {
							throw new Error("post's reactions is not populated");
						}
					})
					.expect(200, done);
			});
		});

		describe('comments', () => {
			test('should be populated', (done) => {
				request(app)
					.get(`/posts/${user2Post1Id}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostProperty)
					.expect((res) => {
						if (!res.body.post.comments[0]._id) {
							throw new Error("post's comments is not populated");
						}
					})
					.expect(200, done);
			});

			test('should be recent', (done) => {
				request(app)
					.get(`/posts/${user2Post1Id}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostProperty)
					.expect((res) => {
						if (res.body.post.comments[0]._id !== user2Post1Comment4Id) {
							throw new Error("post's comments are not recent");
						}
					})
					.expect(200, done);
			});
		});
	});
});

describe('update', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/posts/${user1Post1Id}`)
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.put(`/posts/${user1Post1Id}` + '123')
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.put(
					`/posts/${user1Post1Id.substring(0, user1Post1Id.length - 3)}` + '123'
				)
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the post's author", (done) => {
			request(app)
				.put(`/posts/${user1Post1Id}`)
				.send({
					text: 'post1UpdateErr',
				})
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('body has santinized post and errors property', () => {
		describe('if text', () => {
			test('is empty', (done) => {
				request(app)
					.put(`/posts/${user1Post1Id}`)
					.send({
						text: '',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});

			test('only contains a whitespace/s', (done) => {
				request(app)
					.put(`/posts/${user1Post1Id}`)
					.send({
						text: ' ',
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});

			test('length is greater than 1000', (done) => {
				request(app)
					.put(`/posts/${user1Post1Id}`)
					.send({
						text: 'a'.repeat(10001),
					})
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
					.expect(422, done);
			});
		});
	});

	it('should update post and body should have a post property', (done) => {
		request(app)
			.put(`/posts/${user1Post1Id}`)
			.send({
				text: updatedUser1PostText,
			})
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPostProperty)
			.expect((res) => {
				if (res.body.post.text !== updatedUser1PostText) {
					throw new Error('Post is not updated.');
				}
			})
			.expect(200, done);
	});
});

describe('updateImage', () => {
	const image2 = 'post-image-2.png';

	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/posts/${user1Post1Id}/image`)
				.attach('image', `test/images/${image1}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.put(`/posts/${user1Post1Id + '123'}/image`)
				.attach('image', `test/images/${image1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.put(
					`/posts/${
						user1Post1Id.substring(0, user1Post1Id.length - 3) + '123'
					}/image`
				)
				.attach('image', `test/images/${image1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the post's author", (done) => {
			request(app)
				.put(`/posts/${user1Post1Id}/image`)
				.attach('image', `test/images/${image1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('body has santinized post and errors property', () => {
		describe('if image', () => {
			/* If the image exceeds the file size limit, the error will be the same.
				 albeit has different error message.
			*/
			test('has invalid extention. File with invalid file type should not be saved', async (done) => {
				await request(app)
					.put(`/posts/${user1Post1Id}/image`)
					.attach('image', 'test/files/dummyJson.json')
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasImageProperty)
					.expect(422);
				// Verify that the file with invalid file type is not saved.
				try {
					const files = await fsPromises.readdir(imagesPath);
					expect(files.length).toBe(0);
					done();
				} catch (err) {
					done(err);
				}
			});
		});
	});

	it("should add the image if there's no old image, and body has image property", async (done) => {
		await request(app)
			.put(`/posts/${user1Post1Id}/image`)
			.attach('image', `test/images/${image1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasImageProperty)
			.expect(200);

		// Verify that public/images directory now have the recent image.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'jpg');
			done();
		} catch (err) {
			done(err);
		}
	});

	it("should delete the old image if there's any, and if image is successfully updated. And body has image property", async (done) => {
		// Add first image
		await request(app)
			.put(`/posts/${user1Post1Id}/image`)
			.attach('image', `test/images/${image1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasImageProperty)
			.expect(200);

		// Verify first image of the post.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'jpg');
		} catch (err) {
			done(err);
		}

		// Update image
		await request(app)
			.put(`/posts/${user1Post1Id}/image`)
			.attach('image', `test/images/${image2}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasImageProperty)
			.expect(200);

		// Verify that the old image is deleted. And new one is saved.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'png');
			done();
		} catch (err) {
			done(err);
		}
	});
});

describe('destroy', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.del(`/posts/${user1Post1Id}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if postId route parameter is not valid', (done) => {
			request(app)
				.del(`/posts/${user1Post1Id}` + '123')
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if post does not exists', (done) => {
			request(app)
				.del(
					`/posts/${user1Post1Id.substring(0, user1Post1Id.length - 3)}` + '123'
				)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser is not the post's author", (done) => {
			request(app)
				.del(`/posts/${user1Post1Id}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	it('should remove the post and its image, and body should have a post property', async (done) => {
		// Add post's image
		await request(app)
			.put(`/posts/${user2Post1Id}/image`)
			.attach('image', `test/images/${image1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasImageProperty)
			.expect(200);

		// Verify that public/images directory now have the recent image.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'jpg');
		} catch (err) {
			done(err);
		}

		// Test to see if post's reactions and comments exists.
		expect(await Reaction.exists({ _id: user2Post1Reaction1Id })).toBe(true);
		expect(await Comment.exists({ _id: user2Post1Comment4Id })).toBe(true);

		// Delete the post.
		await request(app)
			.del(`/posts/${user2Post1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPostProperty)
			.expect(200);

		// Verify that post's image is deleted.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(0);
		} catch (err) {
			done(err);
		}

		// Test to see if post's reactions and comments are deleted.
		expect(await Reaction.exists({ _id: user2Post1Reaction1Id })).toBe(false);
		expect(await Comment.exists({ _id: user2Post1Comment4Id })).toBe(false);

		// Test that post is deleted in user's posts when post is deleted.
		request(app)
			.get(`/users/${user2Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasUserProperty)
			.expect((res) => {
				const userPostsIds = res.body.user.posts.map((post) => {
					return post._id;
				});
				if (userPostsIds.includes(user2Post1Id)) {
					throw new Error("Post is still included in user's posts.");
				}
			})
			.expect(200, done);
	});
});
