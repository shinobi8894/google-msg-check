/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// Original List From Text box
var enteredOrderNums = [];

// Checked order numbers
var checkedOrderNums = [];

// Order numbers with no email
var noEmailOrderNums = [];

// Order numbers cancelled
var cancelledOrderNums = [];

// Order numbers shipped
var shippedOrderNums = [];

// Client ID and API key from the Developer Console
const CLIENT_ID = '8576652175-6k7g0nqteltopbcmpq8cimb8hmmgb301.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBzuFK70eBIjuJk0NUGEYjhwRFNJqNkJRg';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

// Authorization scopes required by the API; multiple scopes can be included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';

// Callback after api.js is loaded.
function gapiLoaded() {
    gapi.load('client', intializeGapiClient);
}

// Callback after the API client is loaded. Loads the discovery doc to initialize the API.
async function intializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

// Callback after Google Identity Services are loaded.
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

// Enables user interaction after all libraries are loaded.
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }
}


// Sign in the user upon button click.
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
        throw (resp);
        }
        document.getElementById('signout_button').style.visibility = 'visible';
        document.getElementById('authorize_button').innerText = 'Refresh';

        var textAreaLines = document.getElementById("orderNumTextArea").value.split('\n');
        enteredOrderNums = [];
        for (var i = 0; i < textAreaLines.length; i++) {
            var orderNum = cleanWhiteSpace(textAreaLines[i]);
            enteredOrderNums.push(orderNum);
            await listInbox(orderNum);
        }

        cleanOrderNums();

        // EX of different email Order Numbers
        // AYS12140210 - Single Order Confirmed
        // AYS11435451 - Multiple Attachments in Email
        // AYS11421215 - Single Order Cancelled
        // await listInbox('AYS12198138');
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({prompt: ''});
    }
}

// Sign out the user upon button click.
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('content').innerText = '';
        document.getElementById('authorize_button').innerText = 'Authorize';
        document.getElementById('signout_button').style.visibility = 'hidden';
    }
}

// Start Helper Functions

// Cleans up the white space and line breaks from a string
function cleanWhiteSpace(str) {
    var result;
    result = str.replace(/\s/g,'');
    return result;
}

// TODO: This can be removed.. We no longer grab image
// This grabs the image url from the passed in array of img tags
function getProductImgUrl(images) {
    for (var i = 0; i < images.length; i++) {
        if (images[i].alt == "Cart Image") {
            imgURL = images[i].src;
            return imgURL;
        }
    }
}

// Checks to see if a string contains the word cancel
function isCancelled(str) {
    return str.toLowerCase().includes('cancel');
}

// Cleans up the order numbers so that it only displays the order numbers from the textbox and no extras
function cleanOrderNums() {
    // Placeholder variables
    var cleanedNoEmail = [];
    var cleanedCancelled = [];
    var cleanedShipped = [];

    // Loop through the entered order numbers
    for (i=0; i < enteredOrderNums.length; i++){
        if (shippedOrderNums.includes(enteredOrderNums[i])) {
            cleanedShipped.push(enteredOrderNums[i]);
        } else if (cancelledOrderNums.includes(enteredOrderNums[i])) {
            cleanedCancelled.push(enteredOrderNums[i]);
        } else if (noEmailOrderNums.includes(enteredOrderNums[i])) {
            cleanedNoEmail.push(enteredOrderNums[i]);
        }
    }

    displayOrderNums(cleanedNoEmail, cleanedCancelled, cleanedShipped);
}

// TODO: This can be modified so you can output however you like
// Displays all of the order numbers
function displayOrderNums(noEmailOrderNumbers, cancelledOrderNumbers, shippedOrderNumbers) {

    // Grab the no email ID
    var noEmail = document.getElementById('NoEmail');
    // Grab the cancelled orders ID
    var cancelledOrders = document.getElementById('Cancelled');
    // Grab the shipped orders ID
    var shippedOrders = document.getElementById('Shipped');

    // if there are no email orders
    if (noEmailOrderNumbers.length >= 1) {
        // Create markup for no email
        noEmail.innerHTML = '<tr>' + noEmailOrderNumbers.map(function (order) {
            return '<td>' + order + '</td>' + '<td>'+'<div classname="no-email">No Email</div>' + '</td>';
        }).join('') + '</tr>';
    }

    // if there are cancelled orders
    if (cancelledOrderNumbers.length >= 1) {
        // Create markup for cancelled orders
        cancelledOrders.innerHTML = '<tr>' + cancelledOrderNumbers.map(function (order) {
            return '<td>' + order + '</td>'+'<td>'+'<div classname="cancelled">Cancelled</div>' +'</td>';
        }).join('') + '</tr>';
    }

    // if there are shipped orders
    if (shippedOrderNumbers.length >= 1) {
        // Create markup for cancelled orders
        shippedOrders.innerHTML = '<tr>' + shippedOrderNumbers.map(function (order) {
            return '<td>' + order + '</td>' +'<td>'+'<div classname="shipped">Shipped</div>' +'</td>';
        }).join('') + '</tr>';
    }
}
// End Helper Function

// TODO: Return a list of all the emails that were not received 

/**
 * Print all Messages in the authorized user's inbox. If no messages
 * are found an appropriate message is printed.
 */
async function listInbox(orderNum) {
    let response;

    // If order number has been checked...
    if (checkedOrderNums.includes(orderNum)) {
        // Return
        console.log(orderNum + ' already checked')
        return
    }

    // EX of different email Order Numbers
    // AYS12140210 - Single Order Confirmed
    // AYS11435451 - Multiple Attachments in Email
    // AYS11421215 - Single Order Cancelled
    // Try to get the results of the inbox search or return the error message
    try {
        response = await gapi.client.gmail.users.messages.list({
            'userId': 'me',
            'q': orderNum,
            'maxReesults': 10
        });
    } catch (err) {
        document.getElementById('content').innerText = err.message;
        return;
    }

    // If no messages found, let them know that no messages found
    const messageIds = response.result.messages;
    if (!messageIds || messageIds.length == 0) {
        console.log(orderNum + ' not found in email');
        noEmailOrderNums.push(orderNum);
        checkedOrderNums.push(orderNum);
        return;
    }

    // Try to get the contents of each message from the message ID's
    try {
        response = await gapi.client.gmail.users.messages.get({
            'userId': 'me',
            'id': messageIds[0].id
            // 'format': 'raw'
        });
    } catch (err) {
        document.getElementById('content').innerText = err.message;
        return;
    }

    // TODO: Uncomment for testing
    // console.log(response);

    let part = "test";

    if (response.result.payload.parts) {
        // Get the encrypted contents of the email by checking the mimeType
        part = response.result.payload.parts.filter(function(part) {
            return part.mimeType == 'text/html';
        });
    }

    // If there is no part with mimeType 'text/html' it is an email with attachments of multiple orders
    if (!part || part.length == 0) {
        // Get the list of parts
        var parts = response.result.payload.parts;

        // Get the length of the total amount of parts with the correct mimeType
        let correctParts = [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].mimeType == 'message/rfc822') {
                correctParts.push(parts[i]);
            }
        }

        // console.log(correctParts);

        // Loop through the list
        for (var i = 0; i < correctParts.length; i++) {
            // if the parts mimeType is "message/rfc822"
            if (correctParts[i].mimeType == 'message/rfc822') {
                // console.log(parts[i]);
                // Try to get the contents of each message from the attachement ID
                try {
                    response = await gapi.client.gmail.users.messages.attachments.get({
                        'userId': 'me',
                        'messageId': response.result.id,
                        'id': correctParts[i].body.attachmentId
                        // 'format': 'raw'
                    });
                } catch (err) {
                    document.getElementById('content').innerText = err.message;
                    return;
                }

                // Decrypt the bodys data
                var html = (response.result.data.replace(/_/g, '/').replace(/-/g, '+'));

                // Decode the html
                var decodedHtml = atob(html);

                // Create parser
                var parser = new DOMParser();

                // Parse raw html
                var doc = parser.parseFromString(decodedHtml, "text/html");

                // console.log(doc);

                // Get the Email Title
                var titleElements = doc.getElementsByClassName("preheader");
                var orderNumber = cleanWhiteSpace(doc.querySelector("#main_ordernum-Text > span").innerText);

                // // Get Email Contents
                // var allImages = doc.getElementsByTagName("img");
                // var imgURL = getProductImgUrl(allImages);
                // var orderNumber = doc.querySelector("#main_ordernum-Text > span").innerText;
                // var itemName = doc.querySelector("#order-itemname-text").innerText;
                // var size = doc.querySelector("#product-size-text").innerText;
                // var total = doc.querySelector("#summary-order-totalsavingsvalue-text > span").innerText;
                // // var address = doc.querySelector("#order-total-price-text").innerText;
                // // var shipping = doc.querySelector("#summary-delivery-via-text").innerText;

                // var product = {
                //     'orderNumber': cleanWhiteSpace(orderNumber),
                //     'item': cleanWhiteSpace(itemName),
                //     'size': cleanWhiteSpace(size),
                //     'total': cleanWhiteSpace(total),
                //     'imgURL': imgURL
                // }

                // console.log(product);
                // // Add product to the items list

                if (isCancelled(titleElements[0].innerHTML)) {
                    console.log(orderNumber + ' has been cancelled');
                    cancelledOrderNums.push(orderNumber);
                } else {
                    console.log(orderNumber + ' shipped');
                    shippedOrderNums.push(orderNumber);
                }

                // Add orderNumber to checkedOrderNumbers
                checkedOrderNums.push(orderNumber);

            }
        }
        return
    }

    var html;

    // if there is a part
    if (part[0].body) {
        // Get the parts > body > data html contents
        html = (part[0].body.data.replace(/_/g, '/').replace(/-/g, '+'));
    } else {
        html = (response.result.payload.body.data.replace(/_/g, '/').replace(/-/g, '+'));
    }

    // Decode the html
    var decodedHtml = atob(html);

    // get the decoded html
    // Create parser
    var parser = new DOMParser();

    // Parse raw html
    var doc = parser.parseFromString(decodedHtml, "text/html");

    // Uncomment for testing
    console.log(doc);

    // Get the Email Title
    var titleElements = doc.getElementsByClassName("preheader")[0];

    // If no title found... manually find it
    if (!titleElements) {
        titleElements = doc.querySelector("body > div > div > div:nth-child(5) > div");
    }

    // // Get Email Contents
    // var allImages = doc.getElementsByTagName("img");
    // var imgURL = getProductImgUrl(allImages);
    // var orderNumber = doc.querySelector("#main_ordernum-Text > span").innerText;
    // var itemName = doc.querySelector("#order-itemname-text").innerText;
    // var size = doc.querySelector("#product-size-text").innerText;
    // var total = doc.querySelector("#summary-order-totalsavingsvalue-text > span").innerText;
    // // var address = doc.querySelector("#order-total-price-text").innerText;
    // // var shipping = doc.querySelector("#summary-delivery-via-text").innerText;

    // var product = {
    //     'orderNumber': cleanWhiteSpace(orderNumber),
    //     'item': cleanWhiteSpace(itemName),
    //     'size': cleanWhiteSpace(size),
    //     'total': cleanWhiteSpace(total),
    //     'imgURL': imgURL
    // }

    // console.log(product);

    if (isCancelled(titleElements.innerHTML)) {
        console.log(orderNum + ' has been cancelled');
        cancelledOrderNums.push(orderNum);
    } else {
        console.log(orderNum + ' shipped');
        shippedOrderNums.push(orderNum);
    }

    // Add orderNumber to checkedOrderNumbers
    checkedOrderNums.push(orderNum);

    // TODO: Display the order numbers

    // console.log(title);

    // Decrypt the body of the email..
    // var html = (part[0].body.data.replace(/_/g, '/').replace(/-/g, '+'));

    // console.log(atob(html));

    // var raw = response.result.raw.replace(/_/g, '/').replace(/-/g, '+');
    // html = atob(raw)
    // console.log(html)



    // Flatten to string to display the message id
    // const output = messageIds.reduce(
    //     (str, message) => `${str}${message.id}\n`,
    //     'Messages:\n');
    // document.getElementById('content').innerText = output;
}