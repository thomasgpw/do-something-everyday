
/**
 * Copyright 2017-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Messenger Platform Quick Start Tutorial
 *
 * This is the completed code for the Messenger Platform quick start tutorial
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 * To run this code, you must do the following:
 *
 * 1. Deploy this code to a server running Node.js
 * 2. Run `npm install`
 * 3. Update the VERIFY_TOKEN
 * 4. Add your PAGE_ACCESS_TOKEN to your environment vars
 *
 */

'use strict';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const FACEBOOK_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v2.6/';
// Imports dependencies and set up http server
const 
  request = require('request'),
  express = require('express'),
  path = require('path'),
  body_parser = require('body-parser'),
  mongoose = require('mongoose'),
  textResponses = require('./text')["text responses"],
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

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

function handleMessage(sender_psid, received_message) {
  console.log("handleMessage received_message object", received_message)
  let response;
  
  // // Checks if the message contains text
  // if (received_message.text) {    
  //   // Create the payload for a basic text message, which
  //   // will be added to the body of our request to the Send API
  //   response = {
  //     "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
  //   }
  // } else if (received_message.attachments) {
  //   // Get the URL of the message attachment
  //   let attachment_url = received_message.attachments[0].payload.url;
  //   response = {
  //     "attachment": {
  //       "type": "template",
  //       "payload": {
  //         "template_type": "generic",
  //         "elements": [{
  //           "title": "Is this the right picture?",
  //           "subtitle": "Tap a button to answer.",
  //           "image_url": attachment_url,
  //           "buttons": [
  //             {
  //               "type": "postback",
  //               "title": "Yes!",
  //               "payload": "yes",
  //             },
  //             {
  //               "type": "postback",
  //               "title": "No!",
  //               "payload": "no",
  //             }
  //           ],
  //         }]
  //       }
  //     }
  //   }
  // } 
  
  // Send the response message
  callSendAPI(sender_psid, response);    
}

function handlePostback(sender_psid, received_postback) {
  console.log(textResponses)
  console.log("handleMessage received_postback object", received_postback)
  let response;
  // Get the payload for the postback
  let payload = received_postback.payload;
  console.log("payload is " + payload)
  for(var i = 0; i < textResponses.length; i++) {
    console.log("comparing payload to " + textResponses[i].payload)
    if (payload == textResponses[i].payload) {
      console.log("response should be set equal to " + textResponses[i].response.text)
      response = textResponses[i].response
    }
  }
  callSendAPI(sender_psid, response);
}

// From index2.js by Vivian Chan
function updateStatus(sender_psid, status, callback){
  const query = {user_id: sender_psid};
  const update = {status: status};
  // true if status is greeting, this makes a new document for the sender 
  const options = {upsert: status === GREETING};

  ChatStatus.findOneAndUpdate(query, update, options).exec((err, cs) => {
    console.log('update status to db: ', cs);
    callback(sender_psid);
  });
}

// From index2.js by Vivian Chan
function handleGreetingPostback(sender_psid){
  request({
    url: `${FACEBOOK_GRAPH_API_BASE_URL}${sender_psid}`,
    qs: {
      access_token: process.env.PAGE_ACCESS_TOKEN,
      fields: "first_name"
    },
    method: "GET"
  }, function(error, response, body) {
    var greeting = "";
    if (error) {
      console.log("Error getting user's name: " +  error);
    } else {
      var bodyObj = JSON.parse(body);
      const name = bodyObj.first_name;
      greeting = "Hi " + name + ". ";
    }
    const message = greeting + "Would you like to join a community of like-minded pandas in your area?";
    const greetingPayload = {
      "text": message,
      "quick_replies":[
        {
          "content_type":"text",
          "title":"Yes!",
          "payload": START_SEARCH_YES
        },
        {
          "content_type":"text",
          "title":"No, thanks.",
          "payload": START_SEARCH_NO
        }
      ]
    };
    callSendAPI(sender_psid, greetingPayload);
  });
}


function callSendAPI(sender_psid, response) {
  console.log("callSendAPI response object", response)

  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

// Accepts GET requests at the / endpoint
app.get('/:var(privacypolicy)?', (req, res) => {
  res.sendFile(path.join(__dirname, "privacypolicy.html"))
})