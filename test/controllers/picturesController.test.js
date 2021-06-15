const fsPromises = require('fs/promises');
const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
const {
	imagesPath,
	testImagesPath,
	testFilesPath,
	userPicture1,
	userPicture2,
	json1,
} = require('../variables');
const emptyDir = require('../lib/emptyDir');
const {
	bodyHasErrProperty,
	bodyHasErrorsProperty,
	bodyHasUserProperty,
	bodyHasPictureProperty,
	bodyHasJwtProperty,
	bodyHasCurrentUserProperty,
} = require('../assertionFunctions');

let user1Id;
let user1Jwt;
let user1PictureId;
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
		.expect((res) => {
			user1Id = res.body.user._id;
			user1PictureId = res.body.user.picture._id;
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
	await emptyDir(imagesPath, ['user.jpg', 'post.jpg']);
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

// Both User and Post use the Picture model
describe('update', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/pictures/${user1PictureId}`)
				.attach('picture', `${testImagesPath}/${userPicture1}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if pictureId route parameter is not valid', (done) => {
			request(app)
				.put(`/pictures/${user1PictureId + '123'}`)
				.attach('picture', `${testImagesPath}/${userPicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if picture does not exists', (done) => {
			request(app)
				.put(`/pictures/${user1Id.substring(0, user1Id.length - 3) + '123'}`)
				.attach('picture', `${testImagesPath}/${userPicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test("if currentUser doesn't own the picture", async (done) => {
			let user2Jwt;

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
				.expect(201);

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

			request(app)
				.put(`/pictures/${user1PictureId}`)
				.attach('picture', `${testImagesPath}/${userPicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('body has picture and errors property', () => {
		/* If the picture exceeds the file size limit, the error will be the same.
			 albeit has different error message.
		*/
		describe('if picture', () => {
			test('has invalid extention. File with invalid file type should not be saved', async (done) => {
				await request(app)
					.put(`/pictures/${user1PictureId}`)
					.attach('picture', `${testFilesPath}/${json1}`)
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPictureProperty)
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

	it("should add the user's picture if there's no old local picture, and body has picture property", async (done) => {
		await request(app)
			.put(`/pictures/${user1PictureId}`)
			.attach('picture', `${testImagesPath}/${userPicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);
		// Verify that public/images directory now have the recent user picture.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(imagesDirFileInitialCount + 1);
			const isNewFileSaved = files.some((file) => file.includes(userPicture1));
			expect(isNewFileSaved).toBe(true);
			done();
		} catch (err) {
			done(err);
		}
	});

	it("should update user's picture and deleted the old picture. And body has picture property", async (done) => {
		// Add first picture
		await request(app)
			.put(`/pictures/${user1PictureId}`)
			.attach('picture', `${testImagesPath}/${userPicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);

		// Verify first picture of the user.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(imagesDirFileInitialCount + 1);
			const isNewFileSaved = files.some((file) => file.includes(userPicture1));
			expect(isNewFileSaved).toBe(true);
		} catch (err) {
			done(err);
		}

		// Update picture.
		await request(app)
			.put(`/pictures/${user1PictureId}`)
			.attach('picture', `${testImagesPath}/${userPicture2}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);

		// Verify that the old picture is deleted. And new one is saved.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(imagesDirFileInitialCount + 1);
			const isOldFileSaved = files.some((file) => file.includes(userPicture1));
			expect(isOldFileSaved).toBe(false);
			const isNewFileSaved = files.some((file) => file.includes(userPicture2));
			expect(isNewFileSaved).toBe(true);
			done();
		} catch (err) {
			done(err);
		}
	});

	it("should update user's picture if old picture is not local. And body has picture property", async (done) => {
		let facebookUser1Jwt;
		let facebookUser1PictureId;

		// Creates user using their Facebook data.
		// Picture document is created on User creation.
		await request(app)
			.post('/auth/facebook')
			.send({
				userAccessToken: process.env.FACEBOOK_USER_ACCESS_TOKEN,
			})
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(bodyHasJwtProperty)
			.expect(bodyHasCurrentUserProperty)
			.expect((res) => {
				facebookUser1Jwt = res.body.jwt;
				facebookUser1PictureId = res.body.currentUser.picture._id;
			})
			.expect(201);

		// Update picture.
		await request(app)
			.put(`/pictures/${facebookUser1PictureId}`)
			.attach('picture', `${testImagesPath}/${userPicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${facebookUser1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);

		// Verify that the new picture is saved.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(imagesDirFileInitialCount + 1);
			const isNewFileSaved = files.some((file) => file.includes(userPicture1));
			expect(isNewFileSaved).toBe(true);
			done();
		} catch (err) {
			done(err);
		}
	});
});
