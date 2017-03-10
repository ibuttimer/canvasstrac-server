The environment variable replacement functionality is based on a post by Jeff French, available at http://geekindulgence.com/environment-variables-in-angularjs-and-ionic/

There is a gulp task 'replace' which reads the contents of a json config file from this folder and 
creates version of app.config.js in the www folder.

WARNING: nice idea but need to investigate further as regards passing the '--env localdev' argument to
gulp from the Visual studio build.


The json config file should have the following format
{
  "dbAddr": "<<MongoDB URI, e.g. localhost:27017/canvassTrac>>",
  "forceHttps": <<true to force https, false otherwise>>,
  "httpPort": <<server port to use, e.g 1234>>,
  "httpsPortOffset": <<offset to use for https server port, e.g 123>>,

  "baseURL": "<<base url for server, e.g. localhost>>",

  "jwtSecretKey": "<<JWT secret key>>",
  "tokenLife": <<JWT token life, e.g. 3600>>,

  "disableAuth": <<true to disable authentication, false otherwise>>,

  "fbClientID": "<<Facebook client id>>",
  "fbClientSecret": "<<Facebook client secret>>",

  "dfltPassword": "<<default password for new users>>",

  "testOptions": "<<test options, see config.js for details>>"
}



