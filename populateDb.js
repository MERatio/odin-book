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
const ProfilePicture = require('./models/profilePicture');

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
      let profilePicture = new ProfilePicture({
        filename: '',
        origin: 'local',
      });
      user.profilePicture = profilePicture._id;
      profilePicture.user = user._id;
      user = await user.save();
      profilePicture = await profilePicture.save();
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
          'johndoe@gmail.com',
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
          `${firstName + lastName}@gmail.com`.toLowerCase(),
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

async.series(
  [(cb) => emptyCollections([User, ProfilePicture], cb), createUsers],
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
