// app.js
const sls = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const app = express();
const Sentry = require('@sentry/node');
const fs = require('fs');

const express_graphql = require('express-graphql');
const { buildSchema } = require('graphql');

Sentry.init({ dsn: '' });

app.use(bodyParser.json({ strict: false }));

app.use(cors());

app.use(Sentry.Handlers.requestHandler());

let corsList = [
  "localhost:3023",
];

// All queries will go through this
app.all('*', function(req, res, next) {
  if (req.headers.origin) {
    let originCheck = corsList.indexOf(req.headers.origin) > -1;
    console.log('Request Origin: ' + req.headers.origin);
    
    console.log(originCheck);

    if (originCheck) {
      res.status(400).json({ error: `Denied` });
    } else {
      next();
    }
  } else {
    console.log(req.headers.origin);
    res.status(400).json({ error: `Denied` });
  }
});

const usersDataJSON = './data/users.json';
const usersData = './data/users.js';

// helper methods
const readFile = (callback, returnJson = false, filePath = dataPath, encoding = 'utf8') => {
    fs.readFile(filePath, encoding, (err, data) => {
        if (err) {
            throw err;
        }

        callback(returnJson ? JSON.parse(data) : data);
    });
};

const writeFile = (fileData, callback, filePath = dataPath, encoding = 'utf8') => {

    fs.writeFile(filePath, fileData, encoding, (err) => {
        if (err) {
            throw err;
        }

        callback();
    });
};

// get user data - non graphQL
app.get('/getUserData/', function(req, res) {
  fs.readFile(usersDataJSON, 'utf8', (err, data) => {
      if (err) {
          throw err;
      }

      res.send(JSON.parse(data));
  });

  res.status(200).json({ status: 'success', data: companyDetailsArray });
});


// Resolver functions
const getUser = function(args) {
  let id = args.id;
  return usersData.filter(user => {
      return user.id == id;
  })[0];
}
const getUsers = function(args) {
  if (args.profession) {
      let profession = args.profession;
      return usersData.filter(user => user.profession === profession);
  } else {
      return usersData;
  }
}

//Root Resolver
const root = {
  user: getUser,
  users: getUsers
};

// GraphQL schema
const usersschema = buildSchema(`
  type User {
      id: Int!
      name: String!
      password: String!
      profession: String!
      facebook: String!
      twitter: String!
      linkedin: String!
      website: String!
  },
  type Query {
      user(id: Int!): User
      users(profession: String): [User]
  }
`);

app.use('/usersdata', express_graphql({
  schema: usersschema,
  rootValue: root,
  graphiql: true
}));

// Error check
app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error('Hey! This is an error');
});

// Health check
app.get('/health', function mainHandler(req, res) {
  res.status(200).json({ status: 'success', data: 'All is fine.' });
});

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

module.exports.server = sls(app);
