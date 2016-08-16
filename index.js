module.exports = {
  log: require('./lib/log'),
  Wit: require('./lib/wit'),
  interactive: require('./lib/interactive')
}
const bodyParser = require('body-parser');
//const Wit = require('./').Wit;
var responseObj = {};
// Webserver parameter
const PORT = process.env.PORT || 8005;

const crypto = require('crypto');
const fetch = require('node-fetch');
const request = require('request');
var express = require('express')
  , cors = require('cors')
  , app = express();
//fix for security format exception from browser.
app.use(cors());

let log = null;
let Wit = null;
try {
  Wit = require('./').Wit;// if running from repo
  log = require('./').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}
// Starting our webserver and putting it all together
var path = require("path");
app.set('port', PORT);
app.listen(app.get('port'));
app.use(bodyParser.json());

console.log("Server is wating for you @" + PORT);

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

const getFirstMessagingEntry = (body) => {
  const val = body.object === 'msg' &&
    body.entry &&
    Array.isArray(body.entry) &&
    body.entry.length > 0 &&
    body.entry[0] &&
    body.entry[0].messaging &&
    Array.isArray(body.entry[0].messaging) &&
    body.entry[0].messaging.length > 0 &&
    body.entry[0].messaging[0];
  return val || null;
};

const actions = {
  send(request, response) {
    const {sessionId, context, entities} = request;
    const {text, quickreplies} = response;
	return new Promise(function(resolve, reject) {
      console.log('sending...', JSON.stringify(response));
	  let resl = resolve();
	  responseObj.sessionId = sessionId;
	  responseObj.context = context;
	  responseObj.entities = entities;
	  responseObj.text = text;
	  responseObj.quickreplies = quickreplies;
      return resl;
    });
  },
};

const sessions = {};
const findOrCreateSession = (sid) => {
  let sessionId;
  // Let's see if we already have a session for the user
  Object.keys(sessions).forEach(k => {
    if (sessions[k].sid === sid) {
      // Yep, got it!
      sessionId = k;
    }
  });
    // No session found, let's create a new one
	if (!sessionId) {
    sessionId = new Date().toISOString();
    sessions[sessionId] = { sessionId: sessionId,  context: { sid: sessionId } }; // set context, sessionId
	}
  return sessionId;
};

app.get('/botTest.html', function(request, response, next){
    response.sendFile(path.join(__dirname+'/botTest.html'));
});


// Message handler
app.post('/callwit', (req, res) => {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  const data = req.body;
  const wit = new Wit({accessToken: 'W47X2VGODXS4P22XQHCPHGD2X7RDQTY7', actions, logger: new log.Logger(log.INFO)});

    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        if (event.message) {
          // Yay! We got a new message!
          // We retrieve the user's current session, or create one if it doesn't exist
          // This is needed for our bot to figure out the conversation history
          const sessionId = findOrCreateSession();

          // We retrieve the message content
          const {text, attachments} = event.message;

          if (attachments) {
            // We received an attachment
          } else if (text) {
            // We received a text message
            // Let's forward the message to the Wit.ai Bot Engine
            // This will run all actions until our bot has nothing left to do
            wit.runActions(
              sessionId, // the user's current session
              text, // the user's message
              sessions[sessionId].context // the user's current session state
            ).then((context) => {
              // Our bot did everything it has to do.
              // Now it's waiting for further messages to proceed.
              console.log('Waiting for next user messages');
              // Updating the user's current session state
              sessions[sessionId].context = context;
			  //console.log('final msg: '+JSON.stringify(responseObj));
		      res.send(responseObj)
            })
            .catch((err) => {
              console.error('Oops! Got an error from Wit: ', err.stack || err);
            })
          }
        } else {
          console.log('received event', JSON.stringify(event));
        }
      });
    });
  //res.sendStatus(200);
});

// another example post service
app.post('/webhook', (req, res, next) => {
  res.send('"Only those who will risk going too far can possibly find out how far one can go." - Chandra');
  next();
});

// Webhook get method sends status 400
app.get('/webhook', (req, res, next) => {
    res.sendStatus(400);
	next();
});