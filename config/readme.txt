The environment variable replacement functionality is based on a post by Jeff French, available at http://geekindulgence.com/environment-variables-in-angularjs-and-ionic/

A single json config file may be shared between the server and management web app, with each reading the common settings and those specific to itself.

There is a gulp task 'replace' which reads the contents of the json config file from this folder and creates an env.json in the app folder. If the env.json file doesn't exist in the app folder, the variables are read from the environment.

WARNING: nice idea but need to investigate further as regards passing the '--env localdev' argument to gulp from the Visual studio build.

NOTE: When hosting the app on heroku, the port is dynamically assigned, so may not be configured via this mechanism, so set to -1 to ignore the config value.

The json config file should have the following format
{
  // server/management app common settings
  "baseURL": "<<base url for server, e.g. localhost>>",
  "forceHttps": <<true to force https, false otherwise>>,
  "httpPort": <<server port to use, e.g 1234>>,
  "httpsPortOffset": <<offset to use for https server port, e.g 123>>,

  // server-specific settings
  "dbAddr": "<<MongoDB URI, e.g. localhost:27017/canvassTrac>>",

  "mgmtPath": "<<path (relative to app.js) of management console files to serve>>",

  "jwtSecretKey": "<<JWT secret key>>",
  "jwtTokenLife": <<JWT token life, e.g. 3600>>,

  "disableAuth": <<true to disable authentication, false otherwise>>,

  "fbClientID": "<<Facebook client id>>",
  "fbClientSecret": "<<Facebook client secret>>",

  "dfltPassword": "<<default password for new users>>",

  "testOptions": "<<test options, see config.js for details>>"

  // management app settings
  "mapsApiKey": "<<Google Maps API key>>",

  "DEV_MODE": <<true to enable development mode, false otherwise>>,
  "DEV_USER": "<<username to use for quick login in development mode>>",
  "DEV_PASSWORD": "<<password to use for quick login in development mode>>"

  "storeFactory": <<true to enable debug output, false otherwise>>,
  "localStorage": <<true to enable debug output, false otherwise>>,
  "surveyFactory": <<true to enable debug output, false otherwise>>,
  "canvassFactory": <<true to enable debug output, false otherwise>>,
  "electionFactory": <<true to enable debug output, false otherwise>>,
  "CanvassController": <<true to enable debug output, false otherwise>>,
  "CanvassActionController": <<true to enable debug output, false otherwise>>,
  "SurveyController": <<true to enable debug output, false otherwise>>,
  "navService": <<true to enable debug output, false otherwise>>


}



