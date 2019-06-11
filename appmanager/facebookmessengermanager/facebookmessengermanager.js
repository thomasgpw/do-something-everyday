/**
 * @fileoverview FacebookMessengerManager is the controller module for communicating
 *     between the AppManager module and the Facebook Messenger API.
 * @module FacebookMessengerManager
 */

'use strict';
const request = require('request')
const FACEBOOK_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v2.6/';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

/**
 * Receives a request and a response object from http interactions sent via
 *     POST to the /webhook endpoint and calls the next relevant function
 *
 * @param {Winston} logger - the Winston logger
 * @param {HttpObject} req - the request object POSTed to /webhook which
 *     contains the information on the user's interaction
 * @param {HttpObject} res - the response object that can be configured
 *     to send back instructions to the user
 * @param {Function} processReceivedMessageText - the StateManager function
 *     that uses message text sent to DSE
 * @param {Function} processReceivedPostback - the StateManager function
 *     that asks the database to update a user's status from received postback
 */
function receive(logger, req, res,
    processReceivedMessageText, processReceivedPostback) {
  logger.info('FacebookMessengerManager.receive')
  logger.info(req)
  const body = req.body;
  if (body.object === 'page') {
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      const webhook_event = entry.messaging[0];
      logger.info('post to webhook event object:',{ 'webhook_event': webhook_event});

      // Get the sender PSID
      const sender_psid = webhook_event.sender.id;

      // Check if the event is a message or postback and
      // pass the event to the appropriate processReceived function
      if (webhook_event.message) {
      	const received_message = webhook_event.message
      	if (!received_message.is_echo) {
		      if (!received_message.quick_reply) {
		    		processReceivedMessageText(logger, sender_psid, received_message.text);
		      } else {
		      	processReceivedPostback(logger, sender_psid, received_message.quick_reply.payload)
		      }
	      }
      } else if (webhook_event.postback) {
        processReceivedPostback(logger, sender_psid, webhook_event.postback.payload);
      }
    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

};

/**
 * Receives a request and a response object from http interactions sent via
 *     GET to the /webhook endpoint and creates UserDoc for new users.
 *
 * @param {Winston} logger - the Winston logger
 * @param {HttpObject} req - the request object GETed to /webhook which
 *     contains the information on the user's interaction
 * @param {HttpObject} res - the response object that can be configured
 *     to send back instructions to the user
 */
function verify(logger, req, res) {
  logger.info('FacebookMessengerManager.verify',{'req':req})

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
      logger.info('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
   
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);     
    }
  }
}

/**
 * Takes an already configured response object and sends it to the Facebook
 *     Messenger API to send to the user.
 *
 * @param {Winston} logger - the Winston logger
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE.
 * @param {HttpObject} script_entry_response - the configured response object
 *     to send to the user
 * @param {string=} next_trigger - The script_entry.next_trigger included if
 *     the script will chain multiple messages
 * @param {Function=} processReceivedPostback - the StateManager function
 *     that asks the database to update a user's status from next_trigger
 *     after the message is sent included if the script will chain multiple messages
 */
function callSendAPI(logger, sender_psid, script_entry_response, next_trigger, processReceivedPostback) {
  logger.info('FacebookMessengerManager.callSendAPI', {'response': script_entry_response.message.text})

  // Construct the message recipient
  script_entry_response.recipient = {  'id': sender_psid  }

  // Send the HTTP request to the Messenger Platform
  return request({
    'uri': 'https://graph.facebook.com/v2.6/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': script_entry_response
  }, (err, res, body) => {
    if (!err) {
      if(!body.error) {
        logger.info('message sent!')
        logger.debug({'message':'whats in this res object?','res': res})
        if (!next_trigger === undefined) {
          setTimeout(() => processReceivedPostback(logger, sender_psid, next_trigger), 2000)
        }
      } else {
        logger.error('Unable to send message:', { 'body.error': body.error});
      }
    } else {
      logger.error('Unable to send message:',  {'err': err});
    }
  });
}

module.exports = {
	'receive': receive,
	'verify': verify,
	'callSendAPI': callSendAPI
}