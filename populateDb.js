#! /usr/bin/env node

console.log(
  'This script populates some test data to your database. Specified database as argument - e.g.: populatedb <connection_string>'
);

// Get arguments passed on command line
const userArgs = process.argv.slice(2);
/*
if (!userArgs[0].startsWith('mongodb')) {
    console.log('ERROR: You need to specify a valid mongodb URL as the first argument');
    return
}
*/

// Packages
const mongoose = require('mongoose');
const async = require('async');
const bcrypt = require('bcryptjs');
const faker = require('faker');

// Model
const User = require('./models/user');
const Picture = require('./models/picture');
const Friendship = require('./models/friendship');
const Post = require('./models/post');
const Reaction = require('./models/reaction');
const Comment = require('./models/comment');

// Set up default mongoose connection
const mongoDB = userArgs[0];
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

let nonMassCreatedUserCount = 0;
const users = [];
const posts = [];

async function emptyCollections(models, cb) {
  try {
    console.log('Emptying collections...');
    for (const model of models) {
      await model.deleteMany({});
    }
    console.log('Collections emptied');
    cb(null, true);
  } catch (err) {
    cb(err, null);
  }
}

function createUsers(cb) {
  async function createUser(
    provider,
    firstName,
    lastName,
    email,
    password,
    picture,
    cb
  ) {
    try {
      const user = new User({
        provider,
        firstName,
        lastName,
        email,
        password,
      });
      picture.of = user._id;
      user.picture = picture._id;
      await picture.save();
      await user.save();
      console.log('New User: ' + user);
      users.push(user);
      cb(null, user);
    } catch (err) {
      cb(err, null);
    }
  }

  function createTasks() {
    const hashedPassword = bcrypt.hashSync('password123', 10);
    const tasks = [
      (callback) => {
        const picture = new Picture({
          ofModel: 'User',
          filename: 'user.jpg',
          isLocal: true,
        });
        createUser(
          'local',
          'John',
          'Doe',
          'johndoe@example.com',
          hashedPassword,
          picture,
          callback
        );
        nonMassCreatedUserCount += 1;
      },
      (callback) => {
        const picture = new Picture({
          ofModel: 'User',
          filename: faker.image.avatar(),
          isLocal: false,
        });
        createUser(
          'local',
          'Jane',
          'Doe',
          'janedoe@example.com',
          hashedPassword,
          picture,
          callback
        );
        nonMassCreatedUserCount += 1;
      },
    ];
    for (let i = 0; i < 31; i++) {
      tasks.push((callback) => {
        const firstName = faker.name.firstName();
        const lastName = faker.name.lastName();
        const isIEven = i % 2 === 0;
        const picture = new Picture({
          ofModel: 'User',
          filename: isIEven ? 'user.jpg' : faker.image.avatar(),
          isLocal: isIEven,
        });
        createUser(
          'local',
          firstName,
          lastName,
          `${firstName + lastName}@example.com`.toLowerCase(),
          hashedPassword,
          picture,
          callback
        );
      });
    }
    return tasks;
  }

  async.series(
    createTasks(),
    // Optional callback
    cb
  );
}

function createFriendships(cb) {
  async function createFriendship(requestor, requestee, status, cb) {
    try {
      const friendship = await Friendship.create({
        requestor,
        requestee,
        status,
      });
      console.log('New Friendship: ' + friendship);
      cb(null, friendship);
    } catch (err) {
      cb(err, null);
    }
  }

  function createTasks() {
    const tasks = [];
    for (
      let i = nonMassCreatedUserCount;
      i < 22 + nonMassCreatedUserCount;
      i++
    ) {
      tasks.push((callback) => {
        createFriendship(
          users[0],
          users[i],
          i < 11 + nonMassCreatedUserCount ? 'pending' : 'friends',
          callback
        );
      });
    }
    return tasks;
  }

  async.series(
    createTasks(),
    // Optional callback
    cb
  );
}

function createPosts(cb) {
  async function createPost(author, text, picture, cb) {
    try {
      const post = new Post({
        author,
        text,
      });
      picture.of = post._id;
      post.picture = picture._id;
      await picture.save();
      await post.save();
      console.log('New Post: ' + post);
      posts.push(post);
      cb(null, post);
    } catch (err) {
      cb(err, null);
    }
  }

  function createTasks() {
    const tasks = [
      (callback) => {
        const picture = new Picture({
          ofModel: 'Post',
          filename: 'post.jpg',
          isLocal: true,
        });
        createPost(users[0], faker.lorem.paragraph(), picture, callback);
      },
    ];
    for (let i = 0; i < 10; i++) {
      tasks.push((callback) => {
        const isIEven = i % 2 === 0;
        const picture = new Picture({
          ofModel: 'Post',
          filename: isIEven ? '' : faker.image.image(),
          isLocal: isIEven,
        });
        createPost(users[0], faker.lorem.paragraph(), picture, callback);
      });
    }
    for (let i = nonMassCreatedUserCount; i < users.length; i++) {
      tasks.push((callback) => {
        const isIEven = i % 2 === 0;
        const picture = new Picture({
          ofModel: 'Post',
          filename: isIEven ? 'post.jpg' : faker.image.image(),
          isLocal: isIEven,
        });
        createPost(users[i], faker.lorem.paragraph(), picture, callback);
      });
    }
    return tasks;
  }

  async.series(
    createTasks(),
    // Optional callback
    cb
  );
}

function createReactions(cb) {
  async function createReaction(user, post, type, cb) {
    try {
      const reaction = await Reaction.create({
        user,
        post,
        type,
      });
      console.log('New Reaction: ' + reaction);
      cb(null, reaction);
    } catch (err) {
      cb(err, null);
    }
  }

  function createTasks() {
    const tasks = [];
    for (
      let i = nonMassCreatedUserCount;
      i < 11 + nonMassCreatedUserCount;
      i++
    ) {
      tasks.push((callback) => {
        createReaction(users[i], posts[0], 'like', callback);
      });
    }
    return tasks;
  }

  async.series(
    createTasks(),
    // Optional callback
    cb
  );
}

function createComments(cb) {
  async function createComment(author, post, text, cb) {
    try {
      const comment = await Comment.create({
        author,
        post,
        text,
      });
      console.log('New Comment: ' + comment);
      cb(null, comment);
    } catch (err) {
      cb(err, null);
    }
  }

  function createTasks() {
    const tasks = [];
    for (
      let i = nonMassCreatedUserCount;
      i < 11 + nonMassCreatedUserCount;
      i++
    ) {
      tasks.push((callback) => {
        createComment(users[i], posts[0], faker.lorem.sentence(), callback);
      });
    }
    return tasks;
  }

  async.series(
    createTasks(),
    // Optional callback
    cb
  );
}

async.series(
  [
    (cb) =>
      emptyCollections(
        [User, Picture, Friendship, Post, Reaction, Comment],
        cb
      ),
    createUsers,
    createFriendships,
    createPosts,
    createReactions,
    createComments,
  ],
  // Optional callback
  (err) => {
    if (err) {
      console.log('FINAL ERR: ' + err);
    } else {
      console.log('All done');
    }
    // All done, disconnect from database
    db.close();
  }
);
