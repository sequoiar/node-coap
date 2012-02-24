module.exports = ( function (stack, hooks) {

  var agregate = {

    encoder: function () {
    },
    decoder: function (messageBuffer, requestInfo) {

      var request = stack.ParseHeaders.decode(messageBuffer, requestInfo);

      request.options = {};

      hooks.debug('request.options = ', request.options);

      var n = request.optionsCount;

      var option = {type: 0};
      while (0 < n--) {

        option.start = 1;
        option.type += (request.payload[0] >>> 4);
        option.length = (request.payload[0] & 0x0F);

        if (option.length === 0x0F) {
          option.length += request.payload[option.start++];
        }

        option.end = option.start + option.length;

        hooks.debug('option = ', option);

        agregate.appendOption(request.options, option.type,
            request.payload.slice(option.start, option.end),
            stack.OptionsTable.decode);

        request.payload = request.payload.slice(option.end);
      }
      stack.EventEmitter.emit('request', request);
    },
    appendOption: function (requestOptions, option, code, OptionsTable) {

      var data;

      switch (OptionsTable.dataType(option)) {
        case 'uint':
          data = code.readUInt8(0);
          break;
        case 'string':
          data = code.toString(0);
          break;
        case 'opaque':
          data = new Buffer(code.length);
          code.copy(data);
          break;
      }

      if (OptionsTable.isDefined(option)) {
        if (OptionsTable.allowMultiple(option)) {
          if (!requestOptions.hasOwnProperty(OptionsTable.getName(option))) {
            requestOptions[OptionsTable.getName(option)] = [data];
          } else {
            requestOptions[OptionsTable.getName(option)].push(data);
          }
        } else {
          requestOptions[OptionsTable.getName(option)] = data;
        }
      } else { throw new Error("COAP Option "+option+" is not defined!"); }
      if (hooks.debug) {
        hooks.debug('requestOptions = ', requestOptions);
      }
    }
  };

  return { encode: agregate.encoder, decode: agregate.decoder }; } );
