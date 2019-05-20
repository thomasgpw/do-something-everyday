
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
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Dependency Imports
const 
  request = require('request'),
  express = require('express'),
  path = require('path'),
  body_parser = require('body-parser'),
  SimpleCrypto = require('simple-crypto-js').default,
  winston = require('winston');

// Module Imports
const
  text_responses = require('./text')['text responses'],
  db_model = require('./db'),
  fbm = require('./fbm'),
  app = express().use(body_parser.json()), // creates express http server
  logger = winston.createLogger({
    transports: [
        new winston.transports.Console()
    ]
  });
logger.log('info', 'logger initiated')

class DSEEventObject {
  constructor(sender_psid, trigger) {
    logger.log('info', 'at DSEEventObject constructor from trigger ' + trigger)
    this._sender_psid = sender_psid
    this._jsonObj = getEventJSON(sender_psid, trigger)
  }
  get response() {
    return this._jsonObj.response
  }
  get next_trigger() {
    return this._jsonObj.next_trigger
  }
  get sender_psid() {
    return this._sender_psid
  }
}

function getEventJSON(sender_psid, trigger) {
  logger.log('info', 'at getEventJSON function from trigger ' + trigger)
  for(var i = 0; i < text_responses.length; i++) {
    if (trigger == text_responses[i].trigger) {
      logger.log('info', 'response text should be set equal to ' + text_responses[i].response.message.text)
      return text_responses[i]
    }
  }
}

// from https://matthiashager.com/converting-snake-case-to-camel-case-object-keys-with-javascript
const toCamel = (s) => {
  return s.toLowerCase().replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};
// set up http server
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => logger.log('info','webhook is listening'));


/** SITE ROUTING **/

/* APP POST ENDPOINTS */

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  
  fbm.receive(req, res, logger)
});

/* APP GET ENDPOINTS */

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  fbm.verify(req, res, logger)
});

// Accepts GET requests at the / and /privacypolicy endpoint
app.get('/:var(privacypolicy)?', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacypolicy.html'))
})


/**  CONTROLLER LOGIC **/

function fizzle(sender_psid, status, cs) {
  logger.log('info','at fizzle function with status ' + status)
}

function handleMessage(sender_psid, received_message) {
  if (!received_message.is_echo) {
    logger.log('info', 'at handleMessage function')
    if(received_message.quick_reply) {
      logger.log('info','postback came through as message ' + received_message.quick_reply.payload)
      handlePostback(sender_psid, received_message.quick_reply.payload)
    } else {
      const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
      const received_text = simpleCrypto.encrypt(received_message.text)
      logger.log('info', 'handleMessage encoded received_text string is ' + received_text)
      db_model.getStatus(sender_psid, useStatus, received_text, logger)
    }
  }
}

function handlePostback(sender_psid, payload) {
  // Get the payload for the postback
  logger.log('info', 'at handlePostback payload is ' + payload)
  db_model.updateStatus(sender_psid, payload, runDSEEvent, logger)
}

function requestMongoData(sender_psid, dseEventObj, text_tags, callback) {
  logger.log('info', 'at requestMongoData function with response ' + dseEventObj.response.message.text, {'text_tags': text_tags})  
  var tag_replacements = text_tags.slice(0)
  text_tags.forEach((tag, i) => {
    tag_replacements[i] = useName(sender_psid, db_model.byTag(sender_psid, tag, logger))
  })
}

function useStatus(sender_psid, obj, received_text) {
  const status = obj.status
  if (status.includes('-')) {
    let [first_trigger, next_trigger] = status.split('-')
    logger.log('info','in useStatus', { 'first_trigger': toCamel(first_trigger), 'next_trigger': next_trigger, 'received_text': received_text})
    db_model[toCamel(first_trigger)](sender_psid, received_text, next_trigger, runDSEEvent, logger)
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
  const dseEventObj = new DSEEventObject(sender_psid, status)
  var response_text = dseEventObj.response.message.text
  const text_tags = response_text.match(/\/([A-Z]+)\//g)
  if (text_tags) {
    requestMongoData(sender_psid, dseEventObj, text_tags, callSendAPI)
  } else {
    callSendAPI(sender_psid, dseEventObj)
  }
}

// Modified off of index2.js by Vivian Chan
function callSendAPI(sender_psid, dseEventObj) {
  const response = dseEventObj.response
  logger.log('info', 'in callSendAPI response object message is ' + response.message.text)

  // Construct the message recipient
  response.recipient = {  'id': sender_psid  }

  // Send the HTTP request to the Messenger Platform
  return request({
    'uri': 'https://graph.facebook.com/v2.6/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': response
  }, (err, res, body) => {
    if (!err) {
      if(!body.error) {
        logger.log('info','message sent!')
        logger.log({'level': 'debug', 'message':'whats in this res object?','res': res})
        if(dseEventObj.next_trigger) {
          const next_trigger = dseEventObj.next_trigger
          logger.log('info', 'in callback of request in callSendAPI next_trigger is ' + next_trigger)
          if (next_trigger.includes('-')) {
            // applies if we are now expecting to wait to receive input as a user typed message
            db_model.updateStatus(sender_psid, next_trigger, fizzle, logger)
          } else {
            // applies if chaining multiple messages without waiting
            handlePostback(sender_psid, next_trigger)
          }
        }
      } else {
        logger.error('info', 'Unable to send message:', { 'err': body.error});
      }
    } else {
      logger.error('info', 'Unable to send message:',  {'err': err});
    }
  });
}
