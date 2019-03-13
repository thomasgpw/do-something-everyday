
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
// require('dotenv').config();
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

async function handleMessage(sender_psid, received_message) {
  if (!received_message.is_echo) {
    console.log("handleMessage received_message object", received_message)
    let status = await getStatus(sender_psid)
    console.log(status, "the elusive doc obj")
    // let response;
    
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
    // } else {
    //   throw "message held neither text nor attachments"
    // }
    
    // // Send the response message
    // callSendAPI(sender_psid, response);    
  }
}

function handlePostback(sender_psid, received_postback) {
  console.log("handleMessage received_postback object", received_postback)
  // Get the payload for the postback
  let payload = received_postback.payload;
  console.log("payload is " + payload)
  updateStatus(sender_psid, payload)
  const dseEventObj = new DSEEventObject(sender_psid, payload)
  callSendAPI(sender_psid, dseEventObj.response)
  if(dseEventObj.next_trigger) {
    updateStatus(sender_psid, dseEventObj.next_trigger)
  }
  // for(var i = 0; i < text_responses.length; i++) {
  //   console.log("comparing payload to " + text_responses[i].trigger)
  //   if (payload == text_responses[i].trigger) {
  //     console.log("response text should be set equal to " + text_responses[i].response.message.text)
  //     response = text_responses[i].response
  //     if (text_responses[i].next_trigger) {
  //       next_trigger = text_responses[i].next_trigger
  //       // return callSendAPI.then()
  //       // updateStatus(sender_psid, next_trigger, callSendAPI, response)
  //       // console.log("calling callSendAPI")
  //       try {
  //         callSendAPI(sender_psid, response)
  //         updateStatus(sender_psid, next_trigger)
  //       } catch(err) {
  //         console.log(err)
  //       }
  //     }
  //   }
  // }
  // next_trigger = 
  // if(!next_trigger){
  //   console.log("handle_postback broke")
  // }
}

/** SERVICES & UTILITY FUNCTION **/

// function updateTheCloud(sender_psid,)

// Modified off of index2.js by Vivian Chan
async function updateStatus(sender_psid, status) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    const update = {status: status};
    // true if status is INIT_0, this makes a new document for the sender 
    const options = {upsert: status === "INIT_0"};

    await ChatStatus.findOneAndUpdate(query, update, options).exec((err, cs) => {
      console.log('update status to db: ', cs);
      return cs
    })
  }
}

async function getStatus(sender_psid) {
  if (sender_psid != process.env.APP_PSID) {
    const query = {user_id: sender_psid};
    let user_doc = await ChatStatus.findOne(query, {status: 1}).exec((err, obj) => {
      if(err) {
        throw err
      } else {
        return obj
      }
    })
    console.log("Getting user doc", await user_doc)
    return await user_doc;
  }
}

// Modified off of index2.js by Vivian Chan
function callSendAPI(sender_psid, response) {
  console.log("callSendAPI response object", response)

  // Construct the message body
  response.recipient = {  "id": sender_psid  }

  // Send the HTTP request to the Messenger Platform
  return request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": response
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
      return Promise.resolve()
    } else {
      console.error("Unable to send message:" + err);
      return Promise.reject(err);
    }
  });
}

// function callSendAPIPromise(sen)

// // From index2.js by Vivian Chan
// function handleGreetingPostback(sender_psid){
//   request({
//     url: `${FACEBOOK_GRAPH_API_BASE_URL}${sender_psid}`,
//     qs: {
//       access_token: process.env.PAGE_ACCESS_TOKEN,
//       fields: "first_name"
//     },
//     method: "GET"
//   }, function(error, response, body) {
//     var greeting = "";
//     if (error) {
//       console.log("Error getting user's name: " +  error);
//     } else {
//       var bodyObj = JSON.parse(body);
//       const name = bodyObj.first_name;
//       greeting = "Hi " + name + ". ";
//     }
//     const message = greeting + "Would you like to join a community of like-minded pandas in your area?";
//     const greetingPayload = {
//       "text": message,
//       "quick_replies":[
//         {
//           "content_type":"text",
//           "title":"Yes!",
//           "payload": START_SEARCH_YES
//         },
//         {
//           "content_type":"text",
//           "title":"No, thanks.",
//           "payload": START_SEARCH_NO
//         }
//       ]
//     };
//     callSendAPI(sender_psid, greetingPayload);
//   });
// }
