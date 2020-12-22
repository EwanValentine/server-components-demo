'use strict';

const express = require('express');
const compress = require('compression');
const {readFileSync} = require('fs');
const {pipeToNodeWritable} = require('react-server-dom-webpack/writer');
const path = require('path');
const React = require('react');
const ReactApp = require('../src/App.server').default;

const serverlessExpress = require('@vendia/serverless-express')
const app = express();
const server = serverlessExpress.createServer(app);

app.use(compress());
app.use(express.json());

function handleErrors(fn) {
  return async function(req, res, next) {
    try {
      return await fn(req, res);
    } catch (x) {
      next(x);
    }
  };
}

async function renderReactTree(res, props) {
  const manifest = readFileSync(
    path.resolve(__dirname, '../build/react-client-manifest.json'),
    'utf8'
  );
  const moduleMap = JSON.parse(manifest);
  pipeToNodeWritable(React.createElement(ReactApp, props), res, moduleMap);
}

function sendResponse(req, res, redirectToId) {
  const location = JSON.parse(req.query.location);
  if (redirectToId) {
    location.selectedId = redirectToId;
  }
  res.set('X-Location', JSON.stringify(location));
  renderReactTree(res, {
    selectedId: location.selectedId,
    isEditing: location.isEditing,
    searchText: location.searchText,
  });
}

app.get('/react', function(req, res) {
  sendResponse(req, res, null);
});

const rows = [{
    title: 'testing 123',
    content: 'testing 123',
}];

app.post(
  '/notes',
  handleErrors(async function(req, res) {
    const insertedId = "abc123"; // spoofed
    sendResponse(req, res, insertedId);
  })
);

app.put(
  '/notes/:id',
  handleErrors(async function(req, res) {
    sendResponse(req, res, null);
  })
);

app.delete(
  '/notes/:id',
  handleErrors(async function(req, res) {
    sendResponse(req, res, null);
  })
);

app.get(
  '/notes',
  handleErrors(async function(_req, res) {
    res.json(rows);
  })
);

app.get(
  '/notes/:id',
  handleErrors(async function(req, res) {
    res.json(rows[0]);
  })
);

app.get('/sleep/:ms', function(req, res) {
  setTimeout(() => {
    res.json({ok: true});
  }, req.params.ms);
});

exports.handler = (event, context) => { serverlessExpress.proxy(server, event, context) };
