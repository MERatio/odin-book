const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mongoServer = new MongoMemoryServer();

mongoose.Promise = Promise;

// Provide connection to a new in-memory database server.
exports.connect = async () => {
  mongoose.disconnect();

  const mongoUri = await mongoServer.getUri();

  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  mongoose.connect(mongoUri, mongooseOpts);

  mongoose.connection.on('error', (e) => {
    if (e.message.code === 'ETIMEDOUT') {
      console.log(e);
      mongoose.connect(mongoUri, mongooseOpts);
    }
    console.log(e);
  });

  mongoose.connection.once('open', () => {
    console.log(`MongoDB successfully connected to ${mongoUri}`);
  });
};

// Remove and close the database and server.
exports.close = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

// Remove all data from collections
exports.clear = async () => {
  const collections = mongoose.connection.collections;
  for (const prop in collections) {
    if (Object.prototype.hasOwnProperty.call(collections, prop)) {
      await collections[prop].deleteMany({});
    }
  }
};
