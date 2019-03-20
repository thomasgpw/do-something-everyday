
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
const MONGODB_URI = process.env.MONGODB_URI;

// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  path = require('path'),
  body_parser = require('body-parser'),
  mongoose = require('mongoose'),
  text_responses = require('./text')["text responses"],
  app = express().use(body_parser.json()); // creates express http server

var db = mongoose.connect(MONGODB_URI);
var ChatStatus = require("./models/chatstatus");

class DSEEventObject {
  constructor(sender_psid, trigger) {
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
  for(var i = 0; i < text_responses.length; i++) {
    console.log("comparing payload to " + text_responses[i].trigger)
    if (trigger == text_responses[i].trigger) {
      console.log("response text should be set equal to " + text_responses[i].response.message.text)
      return text_responses[i]
    }
  }
}

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));


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
      console.log("webhook event object:",webhook_event);

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
  console.log("app.get at /webhook request object", req)

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
      console.log('WEBHOOK_VERIFIED');
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
  console.log('next_trigger finished setting ' + status, cs)
}
function handleMessage(sender_psid, received_message) {
  if (!received_message.is_echo) {
    console.log("handleMessage received_message object", received_message)
    getStatus(sender_psid, useStatus, received_message)
  }
}

function handlePostback(sender_psid, received_postback) {
  console.log("handleMessage received_postback object", received_postback)
  // Get the payload for the postback
  let payload = received_postback.payload;
  console.log("payload is " + payload)
  updateStatus(sender_psid, payload, runDSEEvent)
}

function useStatus(sender_psid, obj, received_message) {
  let [first_trigger, next_trigger] = obj.status.split('-')
  console.log('our first_trigger is ' + toCamel(first_trigger))
  console.log('in useStatus, received_message is', received_message)
  console.log('Then we run ' + next_trigger)
  window[toCamel(first_trigger)](sender_psid, received_message.text, next_trigger, runDSEEvent)
  // switch (first_trigger) {
  //   case 'SAVE_NAME':
  //     updateName(sender_psid, received_message.text, next_trigger, runDSEEvent);
  //     break;
  //   case 'SAVE_GOAL':
  //     addGoal(sender_psid, received_message.text, next_trigger, runDSEEvent)
  //     break;
  //   case 'SAVE_HOBBY':
  //     addHobby(sender_psid, received_message.text, next_trigger, runDSEEvent)
  //     break;
  //   case 'SAVE_SUPPORT':
  //     addSupport(sender_psid, received_message.text, next_trigger, runDSEEvent)
  //     break;
  //   default:
  //     throw 'useStatus switch failed'
  // }
}

function useName(obj) {
  console.log(obj.name)
}

function runDSEEvent(sender_psid, status, cs) {
  console.log("inside runDSEEvent callback.  cs is ", cs)
  const dseEventObj = new DSEEventObject(sender_psid, status)
  callSendAPI(sender_psid, dseEventObj.response)
  if(dseEventObj.next_trigger) {
    updateStatus(sender_psid, dseEventObj.next_trigger, fizzle)
  }
}

/** SERVICES & UTILITY FUNCTION **/

// Modified off of index2.js by Vivian Chan
function updateStatus(sender_psid, status, callback) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status};
    // true if status is INIT_0, this makes a new document for the sender 
    const options = {upsert: status === "INIT_0"};

    ChatStatus.findOneAndUpdate(query, update, options).exec((err, cs) => {
      console.log('update status to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function updateName(sender_psid, preferred_name, status, callback) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status, name: preferred_name};
    ChatStatus.findOneAndUpdate(query, update).exec((err, cs) => {
      console.log('update name to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function addGoal(sender_psid, goal, status, callback) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {goals: {name: goal, progress: 0, trend: 0}}};
    ChatStatus.findOneAndUpdate(query, update).exec((err, cs) => {
      console.log('add goal to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function addHobby(sender_psid, hobby, status, callback) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {hobbies: {name: hobby, progress: 0, trend: 0}}};
    ChatStatus.findOneAndUpdate(query, update).exec((err, cs) => {
      console.log('add hobby to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function addSupport(sender_psid, supporter, status, callback) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status, $addToSet : {supporters: {name: supporter, progress: 0, trend: 0}}};
    ChatStatus.findOneAndUpdate(query, update).exec((err, cs) => {
      console.log('add supporter to db: ', cs);
      callback(sender_psid, status, cs)
    })
  }
}

function getStatus(sender_psid, callback, received_message) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    ChatStatus.findOne(query, {status: 1}).exec((err, obj) => {
      console.log('get status from db: ', obj);
      callback(sender_psid, obj, received_message);
    })
  }
}

function getName(sender_psid, callback) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    ChatStatus.findOne(query, {name: 1}).exec((err, obj) => {
      console.log('get name from db: ', obj);
      callback(sender_psid, obj);
    })
  }
}

// Modified off of index2.js by Vivian Chan
function callSendAPI(sender_psid, response) {
  console.log("callSendAPI response object", response)

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
        console.log('message sent!', body)
      } else {
        console.error("Unable to send message:" + body.error);
      }
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

// from https://matthiashager.com/converting-snake-case-to-camel-case-object-keys-with-javascript
const toCamel = (s) => {
  return s.toLowerCase().replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};
