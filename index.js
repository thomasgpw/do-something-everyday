
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
const FACEBOOK_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v2.6/';

// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  path = require('path'),
  body_parser = require('body-parser'),
  SimpleCrypto = require("simple-crypto-js").default,
  winston = require('winston'),
  text_responses = require('./text')["text responses"],
  db_model = require('./model'),
  app = express().use(body_parser.json()), // creates express http server
  logger = winston.createLogger({
    transports: [
        new winston.transports.Console()
    ]
  });
  logger.log('info', 'logger initiated')

class DSEEventObject {
  constructor(sender_psid, trigger) {
    logger.log('info', 'at DSEEventObject constructor from trigger', trigger)
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
  logger.log('info', 'at getEventJSON function from trigger', trigger)
  for(var i = 0; i < text_responses.length; i++) {
    if (trigger == text_responses[i].trigger) {
      logger.log('info', "response text should be set equal to " + text_responses[i].response.message.text)
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

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => logger.log('info','webhook is listening'));


/** SITE ROUTING **/

/* APP POST ENDPOINTS */

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;
  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      logger.log('info', " post to webhook event object:", webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

/* APP GET ENDPOINTS */

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {
  logger.log('info', "app.get at /webhook request object", req)

  /** UPDATE YOUR VERIFY TOKEN **/
  const VERIFY_TOKEN = process.env.VERIFICATION_TOKEN;
  
  // Parse params from the webhook verification request
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Check if a token and mode were sent
  if (mode && token) {
  
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Respond with 200 OK and challenge token from the request
      logger.log('info','WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// Accepts GET requests at the / and /privacypolicy endpoint
app.get('/:var(privacypolicy)?', (req, res) => {
  res.sendFile(path.join(__dirname, "privacypolicy.html"))
})


/**  CONTROLLER LOGIC **/

function fizzle(sender_psid, status, cs) {
  logger.log('info','at fizzle function with status ' + status)
}

function handleMessage(sender_psid, received_message) {
  if (!received_message.is_echo) {
    logger.log('info', 'at handleMessage function')
    if(received_message.quick_reply) {
      logger.log('info','postback came through as message', received_message.quick_reply.payload)
      handlePostback(sender_psid, received_message.quick_reply)
    } else {
      const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
      const received_text = simpleCrypto.encrypt(received_message.text)
      logger.log('info', "handleMessage encoded received_text string", received_text)
      db_model.getStatus(sender_psid, useStatus, received_text, logger)
    }
  }
}

function handlePostback(sender_psid, received_postback) {
  // Get the payload for the postback
  let payload = received_postback.payload;
  logger.log('info', "at handlePostback payload is " + payload)
  db_model.updateStatus(sender_psid, payload, runDSEEvent, logger)
}

function requestMongoData(sender_psid, response, text_tags, callback) {
  logger.log('info', 'at requestMongoData function with response ' + response, text_tags)  
  var tag_replacements = text_tags.slice(0)
  text_tags.forEach((tag, i) => {
    
  })
}

function useStatus(sender_psid, obj, received_text) {
  let [first_trigger, next_trigger] = obj.status.split('-')
  logger.log('info','in useStatus our first_trigger is ' + toCamel(first_trigger) + ' Then we run ' + next_trigger, received_text)
  db_model[toCamel(first_trigger)](sender_psid, received_text, next_trigger, runDSEEvent, logger)
}

function useName(sender_psid, obj) {
  const simpleCrypto = new SimpleCrypto(sender_psid+'DSE')
  const real_name = simpleCrypto.decrypt(obj.name)
  logger.log('info', 'in useName', real_name)
}

function runDSEEvent(sender_psid, status, cs) {
  logger.log('info', "inside runDSEEvent callback")
  const dseEventObj = new DSEEventObject(sender_psid, status)
  var response_text = dseEventObj.response.message.text
  const text_tags = response_text.match(/\/([A-Z]+)\//g)
  if (text_tags) {
    logger.log('info', 'instide runDSEEvent we have text tags', text_tags)
  }

  callSendAPI(sender_psid, dseEventObj.response)
  if(dseEventObj.next_trigger) {
    const next_trigger = dseEventObj.next_trigger
    if (next_trigger.includes('-')) {
      // applies if we are now expecting to wait to receive input as a user typed message
      db_model.updateStatus(sender_psid, next_trigger, fizzle, logger)
    } else {
      // applies if chaining multiple messages without waiting
      handlePostback(sender_psid, next_trigger)
    }
  }
}

// Modified off of index2.js by Vivian Chan
function callSendAPI(sender_psid, response) {
  logger.log('info', "in callSendAPI response object", response)

  // Construct the message recipient
  response.recipient = {  "id": sender_psid  }

  // Send the HTTP request to the Messenger Platform
  return request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": response
  }, (err, res, body) => {
    if (!err) {
      if(!body.error) {
        logger.log('info','message sent!', body)
      } else {
        logger.error('info', "Unable to send message:" + body.error);
      }
    } else {
      logger.error('info', "Unable to send message:" + err);
    }
  });
}
