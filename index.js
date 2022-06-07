const express = require('express');
const dotenv = require('dotenv');
const PaytmChecksum = require('./paytm/checkSum');

//use uuid for generating ORDER ID.
//crypto creates random(unique too) (some probabilty of non unique may be 1 out of millions)
const crypto = require('crypto');
const {initializePayment, verifyPayemntAuthenticity,initializAPIRequest} = require('./paytm/managePayment');
const cors = require('cors');
const https = require('https');


//creating app
dotenv.config();
const app = express();

const PORT = 8080 || process.env.PORT;


//app setting
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());
app.set('viw-engine', 'ejs');

//routes handling
app.get('/', (req, res)=>{
    res.render('index.ejs');
});

// const orderId = crypto.randomBytes(16).toString("hex");

app.post('/payment', async (req, res) =>{
    try{
        const {email, name, amount, orderId} = req.body;

        // if(!email || !amount)
        //     return res.send('<h5>All fields are madatory</h5><a href="/">click here</a> to redirect to homepage.')

        
        const customerId = crypto.randomBytes(16).toString("hex");


        console.log("orderId :-",orderId," , ",process.env.MERCHANT_ID)




        var paytmParams = {};

paytmParams.body = {
    "requestType"   : "Payment",
    "mid"           :  process.env.MERCHANT_ID,
    "websiteName"   : process.env.WEBSITE,
    "orderId"       :  orderId,
    "callbackUrl"   : "https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=" + orderId,
    "txnAmount"     : {
        "value"     : amount,
        "currency"  : "INR",
    },
    "userInfo"      : {
        "custId"    : "CUST_001",
    },
};

/*
* Generate checksum by parameters we have in body
* Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
*/

// let checkdk=''

// PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), process.env.MERCHANT_KEY).then(function(checksum){

//     console.log("process.env.MERCHANT_ID :- ",process.env.MERCHANT_ID)

//     paytmParams.head = {
//         "signature"    : checksum
//     };

//     var post_data = JSON.stringify(paytmParams);

//     var options = {

//         /* for Staging */
//         // hostname: 'securegw-stage.paytm.in',

//         /* for Production */
//         hostname: 'securegw.paytm.in',

//         port: 443,
//         path: `/theia/api/v1/initiateTransaction?mid=${process.env.MERCHANT_ID}&orderId=${orderId}`,
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Content-Length': post_data.length
//         }
//     };

//     var response = "";
//     var post_req = https.request(options, function(post_res) {
//         post_res.on('data', function (chunk) {
//             response += chunk;
//         });

//         post_res.on('end', function(){
//             checkdk=JSON.parse(response)
//             console.log('Response : -', checkdk);
//         });
//     });

//     post_req.write(post_data);
//     post_req.end();
// })












        

        //use your own logic to calculate total amount

        // let paytmParams = {};
        // paytmParams.body = {
        //     requestType   : "Payment",
        //     mid           : process.env.MERCHANT_ID,
        //     websiteName   : process.env.WEBSITE,
        //     orderId       : orderId,
        //     callbackUrl   : "https://securegw-stage.paytm.in/theia/paytmCallback?ORDER_ID=" +orderId,
        //     txnAmount     : {
        //         value     : amount,
        //         currency  : "INR",
        //     },
           
        // };

        let txnInfo = await initializePayment(paytmParams);

        //logging API response.
        console.log("txn Info :- ",txnInfo);

        //converting string response to json.
        txnInfo = JSON.parse(txnInfo); 
    
        //check of transaction token generated successfully
        if(txnInfo && txnInfo.body.resultInfo.resultStatus == 'S'){
            //transaction initiation successful.
            //sending redirect to paytm page form with hidden inputs.
            const hiddenInput = {
                txnToken    : txnInfo.body.txnToken,
                mid         : process.env.MERCHANT_ID,
                orderId     : orderId
            }
            res.json({message: "success", hiddenInput});
            // res.render('intermediateForm.ejs', {txnInfo});

        }else if(txnInfo){

            //payment initialization failed.
            //send custom response
            //donot send this response. for debugging purpose only.
            res.json({message: "cannot initiate transaction", transactionResultInfo: txnInfo.body.resultInfo});

        }else{

            //payment initialization failed.
            //send custom response
            //donot send this response. for debugging purpose only.
            res.json({message: "someting else happens" })
        }

    }
    catch(e){console.log(e);}

});


//use this end point to verify payment
app.post('/verify-payment', async (req, res)=>{
    //req.body contains all data sent by paytm related to payment.
    //check checksumhash to verify transaction is not tampared.
    const paymentObject = await verifyPayemntAuthenticity(req.body);
    console.log("paymentObject :- ",paymentObject)

    if(paymentObject){

        /* check for required status */
        //check STATUS
        //check for RESPONSE CODE
        //etc
        //save details for later use.
        console.log(paymentObject);
        res.json({message: "success", paymentObject});
    }
    else
    res.json({message: "error", Response: "CHECKSUMHASH not matched"});
});



app.listen(PORT, ()=>{console.log('App started at port ' + PORT)});
          




























