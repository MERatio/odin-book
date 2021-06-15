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

// Set up default mongoose connection
const mongoDB = userArgs[0];
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const users = [];

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
    cb
  ) {
    try {
      let user = new User({ firstName, lastName, email, password });
      let picture = new Picture({
        ofModel: 'User',
        filename: '',
        isLocal: true,
      });
      user.picture = picture._id;
      picture.of = user._id;
      user = await user.save();
      picture = await picture.save();
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
        createUser(
          'local',
          'John',
          'Doe',
          'johndoe@example.com',
          hashedPassword,
          callback
        );
      },
    ];
    for (let i = 0; i < 10; i++) {
      tasks.push((callback) => {
        const firstName = faker.name.firstName();
        const lastName = faker.name.lastName();
        createUser(
          'local',
          firstName,
          lastName,
          `${firstName + lastName}@example.com`.toLowerCase(),
          hashedPassword,
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
      requestor.friendships.push(friendship._id);
      requestee.friendships.push(friendship._id);
      await requestor.save();
      await requestee.save();
      console.log('New Friendship: ' + friendship);
      cb(null, friendship);
    } catch (err) {
      cb(err, null);
    }
  }

  function createTasks() {
    const tasks = [];
    for (let i = 1; i < users.length; i++) {
      tasks.push((callback) => {
        createFriendship(users[0], users[i], 'friends', callback);
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
    (cb) => emptyCollections([User, Picture, Friendship], cb),
    createUsers,
    createFriendships,
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
