function createClient (AWS, { clientId }) {
  var docClient = new AWS.DynamoDB.DocumentClient();

  console.log("Setting up client", clientId);

    var params = {
      TableName: 'client',
      Item:{
          "id": clientId
      }
  };

  docClient.put(params, function(err, data) {
      if (err) {
          console.error("Unable to add client. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Added client:", JSON.stringify(data, null, 2));
      }
  });
}

function registerPayment (AWS, { clientId, consumerId, charge }) {
  // get current charge from dynamodb
  var docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
      TableName: "consumer",
      Key:{
          "id": consumerId,
          "client_id": clientId,
      }
  };

  docClient.get(params, function(err, data) {
      if (err) {
          console.error("Unable to read payment. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("GetConsumer succeeded:", JSON.stringify(data, null, 2));
      }

      console.log("Registering Payment", charge);
      const oldRemaining = data.Item.remaining || 0;
      console.log(oldRemaining);
      var params = {
        TableName: 'consumer',
        Item:{
            "id": consumerId,
            "client_id": clientId,
            "remaining": oldRemaining + charge,
            "notified": 0
        }
      };

      docClient.put(params, function(err, data) {
          if (err) {
              console.error("Unable to add Payment. Error JSON:", JSON.stringify(err, null, 2));
          } else {
              console.log("Added Payment:", JSON.stringify(data, null, 2));
          }
      });
  });
}

function createConsumer (AWS, { consumerId, clientId, number }) {
  var docClient = new AWS.DynamoDB.DocumentClient();

  console.log("Setting up consumer", consumerId);

    var params = {
      TableName: 'consumer',
      Item:{
          "id": consumerId,
          "client_id": clientId,
          number
      }
  };

  docClient.put(params, function(err, data) {
      if (err) {
          console.error("Unable to add consumer. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Added consumer:", JSON.stringify(data, null, 2));
      }
  });
}

function pushUpdates (AWS, clientId, changes) {
  changes.forEach((changeBlock) => {
    if ('Customer' in changeBlock) {
      // console.log(changeBlock.Customer)
      changeBlock.Customer.forEach((consumer) => {
        var number = consumer.PrimaryPhone && consumer.PrimaryPhone.FreeFormNumber ?
          parseInt(('1' + consumer.PrimaryPhone.FreeFormNumber).replace('(', '').replace(')', '').replace(' ', '').replace('-', '')) :
          16477019938
        createConsumer(AWS, {
          consumerId: consumer.DisplayName,
          clientId,
          number,
        })
      })
    } else if ('Payment' in changeBlock) {
      // console.log(changeBlock.Payment)
      changeBlock.Payment.forEach((payment) => {
        registerPayment(AWS, {
          consumerId: payment.CustomerRef.name,
          clientId,
          charge: payment.TotalAmt,
        })
      })
    } else if ('Invoice' in changeBlock) {
      console.log('Invoice')
      // console.log(changeBlock.Invoice)
    }
  })
}

module.exports = {
  createClient,
  pushUpdates,
};
