#!/usr/bin/env node
'use strict';
const path=require('path');
process.chdir(path.resolve(__dirname,'..'));
const handler=require('../api/venue-data-health');
let statusCode=200;
let payload=null;
const response={
 setHeader(){},
 status(code){statusCode=code;return this},
 json(value){payload=value;return this}
};
handler({},response);
console.log(JSON.stringify(payload,null,2));
if(statusCode>=400||!payload?.ok)process.exit(1);
