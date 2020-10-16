The environment variable replacement functionality is based on a post by Jeff French, available at http://geekindulgence.com/environment-variables-in-angularjs-and-ionic/

A single json config file may be shared between the server and management web app, with each reading the common settings and those specific to itself.

There is a gulp task 'replace' which reads the contents of the json config file from this folder and creates an env.json in the app folder. If the env.json file doesn't exist in the app folder, the variables are read from the environment.

WARNING: nice idea but need to investigate further as regards passing the '--env localdev' argument to gulp from the Visual studio build.

NOTE 1: When hosting the app on heroku, the port is dynamically assigned, so may not be configured via this mechanism, so set to -1 to ignore the config value.
NOTE 2: When hosting the app on heroku, the Sparkpost config is automatically added to the environment when the addon is added, no need to set in the config file.

The json config file should have the following format
{
  // server/management app common settings
  "baseURL": "<<base url for server, e.g. localhost>>",
  "forceHttps": <<true to force https, false otherwise>>,
  "httpPort": <<server port to use, e.g 1234>>,
  "httpsPortOffset": <<offset to use for https server port, e.g 123>>,
  "socketTimeout": <<timeout value for sockets in msec, e.g. 120000 (which is the default of 2 minutes)>>

  "disableAuth": <<true to disable authentication, false otherwise>>,

  // server-specific settings
  "dbAddr": "<<MongoDB URI, e.g. localhost:27017/canvassTrac>>",
  "dbVersion": "<<MongoDB version, e.g. 3.6.x>>",

  "mgmtPath": "<<path (relative to app.js) of management console files to serve>>",

  "jwtSecretKey": "<<JWT secret key>>",
  "jwtWebTokenLife": <<JWT token life seconds for web apps, e.g. 3600 = 1 hour>>,
  "jwtMobileTokenLife": <<JWT token life seconds for mobile apps, e.g. 3600 = 1 hour>>,

  "fbClientID": "<<Facebook client id>>",
  "fbClientSecret": "<<Facebook client secret>>",

  "feedbackFromEmail": "<<email address to send feedback emails from, omit to disable>>",
  "feedbackToEmail": "<<email address to send feedback emails to, omit to disable>>",

  "dfltPassword": "<<default password for new users>>",

  "testOptions": "<<test options, see config.js for details>>"

  // sparkpost options
  // Heroku SparkPost add-on shutdown 15/10/2020, disable email for the moment
  // "SPARKPOST_API_KEY": "<<The API key for the SparkPost API>>",
  // "SPARKPOST_API_URL": "<<The base URI for the SparkPost API>>",
  // "SPARKPOST_SANDBOX_DOMAIN": "<<Sandbox domain>>",
  // "SPARKPOST_SMTP_HOST": "<<SMTP Host>>",
  // "SPARKPOST_SMTP_PASSWORD": "<<SMTP Password>>",
  // "SPARKPOST_SMTP_PORT": "<<SMTP Port>>",
  // "SPARKPOST_SMTP_USERNAME": "<<SMTP Username>>"

  // management app settings
  "mapsApiKey": "<<Google Maps API key>>",

  "autoLogout": <<auto logout (aka idle) setting in sec, e.g. 300 = 5 min>>,
  "autoLogoutCount": <<auto logout (aka idle) countdowm setting in sec, e.g. 30 = 30 sec>>,
  "tokenRefresh": <<token refresh (aka keepalive) setting in sec, e.g. 600 = 10 min>>,
  "reloadMargin": <<margin before token expiry that will force a refresh before the tokenRefresh, in sec, e.g. 60 = 1 min>>,

  "DEV_MODE": <<true to enable development mode, false otherwise>>,
  "DEV_USER1": "<<username for user 1 to use for quick login in development mode>>",
  "DEV_PASSWORD1": "<<password for user 1 to use for quick login in development mode>>"
  "DEV_USER2": "<<username for user 2 to use for quick login in development mode>>",
  "DEV_PASSWORD2": "<<password for user 2 to use for quick login in development mode>>"
  "DEV_USER3": "<<username for user 3 to use for quick login in development mode>>",
  "DEV_PASSWORD3": "<<password for user 3 to use for quick login in development mode>>"

  "storeFactory": <<true to enable debug output, false otherwise>>,
  "localStore": <<true to enable debug output, false otherwise>>,
  "surveyFactory": <<true to enable debug output, false otherwise>>,
  "canvassFactory": <<true to enable debug output, false otherwise>>,
  "electionFactory": <<true to enable debug output, false otherwise>>,
  "CanvassController": <<true to enable debug output, false otherwise>>,
  "CanvassActionController": <<true to enable debug output, false otherwise>>,
  "SurveyController": <<true to enable debug output, false otherwise>>,
  "navService": <<true to enable debug output, false otherwise>>


}



