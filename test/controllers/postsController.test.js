const fsPromises = require('fs/promises');
const request = require('supertest');
const app = require('../../app');
const Post = require('../../models/post');
const Reaction = require('../../models/reaction');
const Comment = require('../../models/comment');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	imagesPath,
	testImagesPath,
	testFilesPath,
	postPicture1,
	json1,
} = require('../variables');
const emptyDir = require('../lib/emptyDir');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUserProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
	bodyHasFriendshipProperty,
	bodyHasPostsProperty,
	bodyHasTotalPostsProperty,
	bodyHasPostProperty,
	bodyHasPictureProperty,
	bodyHasReactionProperty,
	bodyHasCommentProperty,
} = require('../assertionFunctions');

let user2Id;
let user1Jwt;
let user2Jwt;
let user1Post1Id;
let user1AndUser2FriendshipId;
let user2Post1Id;
let user2Post1Picture1Id;
let user2Post1Reaction1Id;
let user2Post1Comment4Id;
let indexTotalPosts = 0;
const updatedUser1PostText = 'updatedUser1Post1Text';
let imagesDirFileInitialCount = 0;

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
			indexTotalPosts += 1;
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
			indexTotalPosts += 1;
			user2Post1Picture1Id = res.body.post.picture._id;
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
	indexTotalPosts = 0;
	await emptyDir(imagesPath, ['user.jpg', 'post.jpg']);
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

			describe('picture', () => {
				test('should be populated', (done) => {
					request(app)
						.get('/posts')
						.set('Accept', 'application/json')
						.set('Authorization', `Bearer ${user1Jwt}`)
						.expect('Content-Type', /json/)
						.expect(bodyHasPostsProperty)
						.expect((res) => {
							if (!res.body.posts[0].picture._id) {
								throw new Error('individual post picture is not populated');
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
					.expect(() => (indexTotalPosts += 1))
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
				.expect(bodyHasTotalPostsProperty)
				.expect((res) => {
					const { posts, totalPosts } = res.body;
					if (posts.length !== 10) {
						throw new Error(
							'posts#index pagination - posts body property length error.'
						);
					}
					if (totalPosts !== indexTotalPosts) {
						throw new Error(
							'posts#index pagination - totalPosts body property error.'
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
				.expect(bodyHasTotalPostsProperty)
				.expect((res) => {
					const { posts, totalPosts } = res.body;
					if (posts.length !== 15) {
						throw new Error(
							'posts#index pagination - posts body property length error.'
						);
					}
					if (totalPosts !== indexTotalPosts) {
						throw new Error(
							'posts#index pagination - totalPosts body property error.'
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
		test('if form texts has error/s. And if there is a uploaded valid picture delete it', async (done) => {
			await request(app)
				.post('/posts')
				.field({ text: '' })
				.attach('picture', `${testImagesPath}/${postPicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect(422);
			// Verify that the valid image is not saved because of form texts errors.
			try {
				const files = await fsPromises.readdir(imagesPath);
				expect(files.length).toBe(imagesDirFileInitialCount);
				const isNewFileSaved = files.some((file) =>
					file.includes(postPicture1)
				);
				expect(isNewFileSaved).toBe(false);
				done();
			} catch (err) {
				done(err);
			}
		});

		test('if picture and form texts has error/s. They should be concatenated in 1 array. picture should not be saved', async (done) => {
			await request(app)
				.post('/posts')
				.field({ text: '' })
				.attach('picture', `${testFilesPath}/${json1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrorsProperty)
				.expect((res) => {
					if (res.body.errors.length !== 2) {
						throw new Error('Should have picture and form texts errors.');
					}
				})
				.expect(bodyHasPostProperty)
				.expect(422);
			// Verify that the invalid picture is not saved because of picture and form texts errors.
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

		describe('if picture', () => {
			/* If the picture exceeds the file size limit, the error will be the same.
				 albeit has different error message.
			*/
			test('has invalid extention. File with invalid file type should not be saved', async (done) => {
				await request(app)
					.post('/posts')
					.field({ text: 'hello world' })
					.attach('picture', `${testFilesPath}/${json1}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPostProperty)
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
	});

	describe('create and return the new post object', () => {
		test('if all fields are valid', async (done) => {
			// Create a valid post.
			await request(app)
				.post('/posts')
				.field({ text: 'valid post' })
				.attach('picture', `${testImagesPath}/${postPicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect(201);
			// Verify that public/images directory now have the recent picture.
			try {
				const files = await fsPromises.readdir(imagesPath);
				expect(files.length).toBe(imagesDirFileInitialCount + 1);
				const isNewFileSaved = files.some((file) =>
					file.includes(postPicture1)
				);
				expect(isNewFileSaved).toBe(true);
				done();
			} catch (err) {
				done(err);
			}
		});

		test('if picture is not supplied but all other fields are valid', (done) => {
			request(app)
				.post('/posts')
				.field({ text: 'valid post' })
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasPostProperty)
				.expect(201, done);
		});
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

		describe('picture ', () => {
			test('should be populated', (done) => {
				request(app)
					.get(`/posts/${user2Post1Id}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasPostProperty)
					.expect((res) => {
						if (!res.body.post.picture._id) {
							throw new Error("post's picture is not populated");
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

	it('should remove the post and its picture, and body should have a post property', async (done) => {
		// Add post's picture
		await request(app)
			.put(`/pictures/${user2Post1Picture1Id}`)
			.attach('picture', `${testImagesPath}/${postPicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);

		// Verify that public/images directory now have the recent picture.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(imagesDirFileInitialCount + 1);
			const isNewFileSaved = files.some((file) => file.includes(postPicture1));
			expect(isNewFileSaved).toBe(true);
		} catch (err) {
			done(err);
		}

		try {
			// Test to see if post's reactions and comments exists.
			expect(await Reaction.exists({ _id: user2Post1Reaction1Id })).toBe(true);
			expect(await Comment.exists({ _id: user2Post1Comment4Id })).toBe(true);
		} catch (err) {
			done(err);
		}

		// Delete the post.
		await request(app)
			.del(`/posts/${user2Post1Id}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user2Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPostProperty)
			.expect(200);

		// Verify that post's picture is deleted.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(imagesDirFileInitialCount);
			const isOldFileSaved = files.some((file) => file.includes(postPicture1));
			expect(isOldFileSaved).toBe(false);
		} catch (err) {
			done(err);
		}

		try {
			// Test to see if post, post's reactions, and comments are removed.
			expect(await Post.exists({ _id: user2Post1Id })).toBe(false);
			expect(await Reaction.exists({ _id: user2Post1Reaction1Id })).toBe(false);
			expect(await Comment.exists({ _id: user2Post1Comment4Id })).toBe(false);
			done();
		} catch (err) {
			done(err);
		}
	});
});
