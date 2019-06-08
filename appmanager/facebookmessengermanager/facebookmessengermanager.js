/**
 * @fileoverview FacebookMessengerManager is the controller module for communicating
 *     between the AppManager module and the Facebook Messenger API.
 * @module FacebookMessengerManager
 */

'use strict';
const FACEBOOK_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v2.6/';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

/**
 * Receives a request and a response object from http interactions sent via
 *     POST to the /webhook endpoint and calls the next relevant function
 *
 * @param {HttpObject} req - the request object POSTed to /webhook which
 *     contains the information on the user's interaction
 * @param {HttpObject} res - the response object that can be configured
 *     to send back instructions to the user
 * @param {Function} processReceivedMessageText - the StateManager function
 *     that uses message text sent to DSE
 * @param {Function} processReceivedPostback - the StateManager function
 *     that asks the database to update a user's status from received postback
 * @param {Winston} logger - the Winston logger
 */
function receive(req, res,
    processReceivedMessageText, processReceivedPostback,
    logger) {
  const body = req.body;
  if (body.object === 'page') {
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      const webhook_event = entry.messaging[0];
      logger.log('info', ' post to webhook event object:',{ 'webhook_event': webhook_event});

      // Get the sender PSID
      const sender_psid = webhook_event.sender.id;

      // Check if the event is a message or postback and
      // pass the event to the appropriate processReceived function
      if (webhook_event.message) {
      	const received_message = webhook_event.message
      	if (!received_message.is_echo) {
		      if (!received_message.quick_reply) {
		    		processReceivedMessageText(sender_psid, received_message.text, logger);
		      } else {
		      	processReceivedPostback(sender_psid, received_message.quick_reply.payload, logger)
		      }
	      }
      } else if (webhook_event.postback) {
        processReceivedPostback(sender_psid, webhook_event.postback.payload, logger);
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
 * @param {HttpObject} req - the request object GETed to /webhook which
 *     contains the information on the user's interaction
 * @param {HttpObject} res - the response object that can be configured
 *     to send back instructions to the user
 * @param {Winston} logger - the Winston logger
 */
function verify(req, res, logger) {
  logger.log({'level': 'info', 'message': 'app.get at /webhook request object', 'req':req})

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
}

/**
 * Takes an already configured response object and sends it to the Facebook
 *     Messenger API to send to the user.
 *
 * @param {string} sender_psid - the unique string that Facebook asociates and
 *     provides with individual users who communicate with DSE.
 * @param {HttpObject} res - the configured response object to send to the user
 * @param {Function} callback - the function to call after a message is
 *     successfully sent
 * @param {Winston} logger - the Winston logger
 */
function callSendAPI(sender_psid, res, callback, logger) {
  logger.log('info', 'in callSendAPI response object message is  ' + res.message.text)

  // Construct the message recipient
  res.recipient = {  'id': sender_psid  }

  // Send the HTTP request to the Messenger Platform
  return request({
    'uri': 'https://graph.facebook.com/v2.6/me/messages',
    'qs': { 'access_token': PAGE_ACCESS_TOKEN },
    'method': 'POST',
    'json': res
  }, (err, res, body) => {
    if (!err) {
      if(!body.error) {
        logger.log('info','message sent!')
        logger.log({'level': 'debug', 'message':'whats in this res object?','res': res})
        if(callback){
          callback(err, res, body, logger)
        }
      } else {
        logger.error('info', 'Unable to send message:', { 'body.error': body.error});
      }
    } else {
      logger.error('info', 'Unable to send message:',  {'err': err});
    }
  });
}

module.exports = {
	'receive': receive,
	'verify': verify,
	'callSendAPI': callSendAPI
}