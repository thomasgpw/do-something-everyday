/*
 * This file and code are modified from an original file from Facebook, Inc.
 * The use is permitted by their license which can be found in their original file heading below.
 *
 * *
 * * Copyright 2017-present, Facebook, Inc. All rights reserved.
 * *
 * * This source code is licensed under the license found in the
 * * LICENSE file in the root directory of this source tree.
 * *
 * * Messenger Platform Quick Start Tutorial
 * *
 * * This is the completed code for the Messenger Platform quick start tutorial
 * *
 * * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 * *
 * 
 */


 /*** GLOBAL CONSTANTS & REQUIREMENTS ***/

'use strict';

// Dependency Imports
const 
  request = require('request'),
  express = require('express'),
  path = require('path'),
  body_parser = require('body-parser'),
  winston = require('winston');

// Module Imports
const
  text_responses = require('./text')['text responses'],
  db_keeper = require('./db'),
  fbm_postal_worker = require('./fbm'),
  state_manager = require('./sm'),
  app = express().use(body_parser.json()), // creates express http server
  logger = winston.createLogger({
    transports: [
        new winston.transports.Console()
    ]
  });
logger.log('info', 'logger initiated')
app.listen(process.env.PORT || 1337, () => logger.log('info','Express server is listening'));


// from https://matthiashager.com/converting-snake-case-to-camel-case-object-keys-with-javascript
const toCamel = (s) => {
  return s.toLowerCase().replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};


/** SITE ROUTING **/

// Accepts GET requests at the /privacypolicy endpoint
app.get('/privacypolicy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacypolicy.html'))
})

// Accepts both POST and GET at /webhook
app.route('/webhook')
  .post((req, res) => {  
    fbm_postal_worker.receive(req, res, state_manager.handleMessage, state_manager.handlePostback, logger)
  })
  .get((req, res) => {
    fbm_postal_worker.verify(req, res, logger)
  });
app.route('/dev(/login)?')
  .get((req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'))
  })
  .post((req, res) => {
    console.log(req)
    res.status(200).send('EVENT_RECEIVED');
  })

/**  CONTROLLER LOGIC **/

function requestMongoData(sender_psid, dseEventObj, text_tags, callback) {
  logger.log('info', 'at requestMongoData function with response ' + dseEventObj.response.message.text, {'text_tags': text_tags})  
  var tag_replacements = text_tags.slice(0)
  text_tags.forEach((tag, i) => {
    tag_replacements[i] = useName(sender_psid, db_keeper.byTag(sender_psid, tag, logger))
  })
}

function useStatus(sender_psid, obj, received_text) {
  const status = obj.status
  if (status.includes('-')) {
    let [first_trigger, next_trigger] = status.split('-')
    logger.log('info','in useStatus', { 'first_trigger': toCamel(first_trigger), 'next_trigger': next_trigger, 'received_text': received_text})
    db_keeper[toCamel(first_trigger)](sender_psid, received_text, next_trigger, runDSEEvent, logger)
  } else {
    logger.log('info', 'recieved unexpected input message', {'status': status, 'received_text': received_text})
  }
}

function useName(sender_psid, obj) {
  const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
  const real_name = simpleCrypto.decrypt(obj.name)
  logger.log('info', 'in useName name is ' + real_name)
  return real_name
}

function runDSEEvent(sender_psid, status, cs) {
  logger.log('info', 'inside runDSEEvent callback')
  const dseEventObj = new state_manager.DSEEventObject(sender_psid, status, logger)
  var response_text = dseEventObj.response.message.text
  const text_tags = response_text.match(/\/([A-Z]+)\//g)
  if (text_tags) {
    requestMongoData(sender_psid, dseEventObj, text_tags, fbm_postal_worker.callSendAPI)
  } else {
    fbm_postal_worker.callSendAPI(sender_psid, dseEventObj.response, dseEventObj.next_trigger, logger)
  }
}
