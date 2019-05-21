'use strict';
const FACEBOOK_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v2.6/';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

function receive(req, res, logger) {
  // Parse the request body from the POST
  let body = req.body;
  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      logger.log('info', ' post to webhook event object:',{ 'webhook_event': webhook_event});

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback.payload);
      }
    });
    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

};

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

function callSendAPI(sender_psid, response, callback, logger) {
  logger.log('info', 'in callSendAPI response object message is  ' + response.message.text)

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
        if(callback){
          callback(err, res, body, logger)
        }
      } else {
        logger.error('info', 'Unable to send message:', { 'body.e1⁄⁄rr': body.error});
      }
    } else {
      logger.error('info', 'Unable to send message:',  {'err': err});
    }
  });
}