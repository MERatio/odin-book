const path = require('path');
const fsPromises = require('fs/promises');
const request = require('supertest');
const app = require('../../app');
const mongoConfigTesting = require('../../configs/mongoConfigTesting');
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
const imagesPath = 'public/images';
const userPicture1 = 'user-picture-1.jpg';
const userPicture2 = 'user-picture-2.png';

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
	// Delete all files in public/images directory.
	const files = await fsPromises.readdir(imagesPath);
	for (const file of files) {
		await fsPromises.unlink(path.join(imagesPath, file));
	}
	await mongoConfigTesting.clear();
});
afterAll(async () => await mongoConfigTesting.close());

// Both User and Post use the Picture model
describe('update', () => {
	describe('body has err property', () => {
		test('if JWT is not valid or not supplied', (done) => {
			request(app)
				.put(`/pictures/${user1PictureId}`)
				.attach('picture', `test/images/${userPicture1}`)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});

		test('if pictureId route parameter is not valid', (done) => {
			request(app)
				.put(`/pictures/${user1PictureId + '123'}`)
				.attach('picture', `test/images/${userPicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user1Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(404, done);
		});

		test('if picture does not exists', (done) => {
			request(app)
				.put(
					`/pictures/${user1Id.substring(0, user1Id.length - 3) + '123'}`
				)
				.attach('picture', `test/images/${userPicture1}`)
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
				.attach('picture', `test/images/${userPicture1}`)
				.set('Accept', 'application/json')
				.set('Authorization', `Bearer ${user2Jwt}`)
				.expect('Content-Type', /json/)
				.expect(bodyHasErrProperty)
				.expect(401, done);
		});
	});

	describe('body has picture and errors property', () => {
		/* If the image exceeds the file size limit, the error will be the same.
			 albeit has different error message.
		*/
		describe('if picture', () => {
			test('has invalid extention. File with invalid file type should not be saved', async (done) => {
				await request(app)
					.put(`/pictures/${user1PictureId}`)
					.attach('picture', 'test/files/dummyJson.json')
					.set('Accept', 'application/json')
					.set('Authorization', `Bearer ${user1Jwt}`)
					.expect('Content-Type', /json/)
					.expect(bodyHasErrorsProperty)
					.expect(bodyHasPictureProperty)
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

	it("should add the user's picture if there's no old picture, and body has picture property", async (done) => {
		await request(app)
			.put(`/pictures/${user1PictureId}`)
			.attach('picture', `test/images/${userPicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);
		// Verify that public/images directory now have the recent user picture.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'jpg');
			done();
		} catch (err) {
			done(err);
		}
	});

	it("should delete the old picture if there's any and if picture is successfully updated. And body has picture property", async (done) => {
		// Add first picture
		await request(app)
			.put(`/pictures/${user1PictureId}`)
			.attach('picture', `test/images/${userPicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);

		// Verify first picture of the user.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'jpg');
		} catch (err) {
			done(err);
		}

		// Update picture
		await request(app)
			.put(`/pictures/${user1PictureId}`)
			.attach('picture', `test/images/${userPicture2}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);

		// Verify that the old picture is deleted. And new one is saved.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'png');
			done();
		} catch (err) {
			done(err);
		}
	});

	it('should update picture if picture origin is Facebook. And body has picture property', async (done) => {
		await request(app)
			.put(`/pictures/${user1PictureId}`)
			.attach('picture', `test/images/${userPicture1}`)
			.set('Accept', 'application/json')
			.set('Authorization', `Bearer ${user1Jwt}`)
			.expect('Content-Type', /json/)
			.expect(bodyHasPictureProperty)
			.expect(200);

		// Verify that public/images directory now have the recent user picture.
		try {
			const files = await fsPromises.readdir(imagesPath);
			expect(files.length).toBe(1);
			expect(files[0].split('.')[1] === 'jpg');
			done()
		} catch (err) {
			done(err);
		}
	});
});
