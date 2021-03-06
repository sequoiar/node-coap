module.exports = ( function RequestModule (dgram, stack, hooks, helpers, params) {

  // The seed should not be greater then 0xFFFF
  var seed = (Math.random()*0xFFFF) ^ 0xFFFF;

  var socket = dgram.createSocket ('udp6');
  // XXX: We could do this, but may be we need
  // an abstract wrapper actually?
  //var socket6 = dgram.createSocket ('udp6');
  //if (params.ipv6_only === undefined) {
  //  var socket4 = dgram.createSocket ('udp4');
  //}

  // Attach COAP message parser to the socket
  socket.on('message', stack.ParseMessage.decode);
  //XXX: is there `error` event?
  //socket.on('error', function(e) { console.log("Error: %o", e); });

  // Attach response router to the parser engine
  stack.EventEmitter.on('message', function (rx) {
    console.log(hooks);
    if (hooks.debug) { hooks.debug('rx = ', rx); }
    stack.EventEmitter.emit('rx:'+rx.messageID, rx);
  });

  stack.EventEmitter.on('close_request_socket', function () {
    socket.close()
  });

  var request = function MakeRequest (options, reciever, generate) {
    var con = options.confirmable || true;
    var rst = options.reset || false;
    var port = options.port || 5683;
    var path = options.path || '/';
    var host = options.host;
    if (host === undefined) {
      throw new Error('No target host provided!');
    }

    // We have to do `messageCode` pre-parsing here,
    // because it is encoded in base32 and doing it
    // `ParseHeaders` module is not quite appropriate.
    // That is because it depends on whether we do
    // a request or response, we either give response
    // code directly as a number (e.g. 404) or we are
    // supplying it as a method string (e.g. 'POST').
    var message = {
      protocolVersion: 1,
      messageID: ++seed,
      messageType: 'CON',
      messageCode: [
        undefined,
        'GET',
        'POST',
        'PUT',
        'DELETE'
      ].indexOf(options.method),
      options: { }
    };

    with (message) {
      if (messageCode === -1) {
        throw new Error('Invalid COAP request method `'+arguments[0].method+'`!');
      }
      if(!con) {
        messageType = 'NON';
      }
      if(rst) {
        messageType = 'RST';
      }
      options = helpers.MakeURI(path);
    }

    stack.ParseMessage.encode(message, function (payload) {
      var length = 0;
      if (options.method === 'GET' || options.method === 'DELETE') {
        // We need to drop the tail of the pre-allocated buffer
        // when it is not in use, i.e. doing a GET or a DELETE.
        length = message.optionsLength;
      } else {
        // In the case of PUT or GET request - call `generate()` which
        // should write data into our payload and return the length.
        // That gives us the actual length of the datagram.
        // XXX: This may be blocking, however:
        // - the buffer length is already allocated according to the
        //   recommended values in the COAP draft 09
        // - we will probably re-design it with Streams one day, so
        //   it shall be revisitied then
        length = generate(payload.slice(message.optionsLength));
      }
      socket.send(payload, 0, length, port, host, function (err, bytes) {
        if (err) { throw err; }

        if (hooks.stats) { hooks.stats('tx_count', 1); }
        //FIXME: In Wireshark, it looks like our stats are wrong!
        //if (hooks.stats) { hooks.stats('tx_bytes', length); }

        // TODO: handle
        // - ICPM (?)
        // - re-transmit and exponential back-off ... etc
        stack.EventEmitter.once('rx:'+message.messageID, reciever);
      });
    });
  };

  return (request); } );
