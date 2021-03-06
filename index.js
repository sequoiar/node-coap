module.exports = ( function COAP (hooks) {
  var COAP = {
    dgram: require ('dgram'),
    stack: {
      /* It's better to create the stack in one place. */
    },
    hooks: hooks
  };
  
  with (COAP) {
    /* The actual stack is created here! */
    stack.EventEmitter = new (require ('events').EventEmitter)();
    stack.IntegerUtils = require  ('./integer');
    stack.OptionsTable = require  ('./options');
    stack.ParseHeaders = require  ('./headers');
    stack.ParseMessage = require  ('./message')(COAP.stack, COAP.hooks);
    stack.StateMachine = require  ('./machine');
  }
  
  COAP.helpers            = require  ('./helpers');
  COAP.request            = require  ('./request')
      (COAP.dgram, COAP.stack, COAP.hooks, COAP.helpers, {/* TODO */});
  
  return COAP; } );
