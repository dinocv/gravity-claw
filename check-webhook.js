
const token = '8360752602:AAFw27TayzzYcBMNzahqnjzz7lDGPHn2ZkM';
const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;

fetch(url)
    .then(res => res.json())
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error(err));
