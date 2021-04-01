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

// Set up default mongoose connection
const mongoDB = userArgs[0];
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const users = [];

async function userCreate(firstName, lastName, email, password, cb) {
  try {
    const userDetail = { firstName, lastName, email, password };
    const user = new User(userDetail);
    const savedUser = await user.save();
    console.log('New User: ' + savedUser);
    users.push(savedUser);
    cb(null, savedUser);
  } catch (err) {
    cb(err, null);
  }
}

async function emptyCollections(models, cb) {
  try {
    console.log('Emptying collections...');
    for (model of models) {
      await model.deleteMany({});
    }
    console.log('Collections emptied');
    cb(null, true);
  } catch (err) {
    cb(err, null);
  }
}

function createUsers(cb) {
  const hashedPassword = bcrypt.hashSync('password123', 10);

  function createTasks() {
    const tasks = [
      (callback) => {
        userCreate(
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
        userCreate(
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
  [(cb) => emptyCollections([User], cb), createUsers],
  // Optional callback
  (err, results) => {
    if (err) {
      console.log('FINAL ERR: ' + err);
    } else {
      console.log('All done');
    }
    // All done, disconnect from database
    db.close();
  }
);
