# canvasstrac-server
Server application for CanvassTrac suite.

## Development Environment
The development environment:
* Nodejs v6.10.1
* npm v2.15.9
* bower v1.7.9
* gulp v3.9.1
* MongoDB v3.2.4

### Environment setup
In an appropriate folder:
* git clone https://github.com/ibuttimer/canvasstrac-server.git
* cd canvasstrac-server
* npm install

### Development
See <code>gulp --help</code> for development workflow options.

See [configuration file readme](config/readme.txt) for details of creating a configuration file.

For example, to start a local server using a configuation file called localdev.json, use the following:
* <code>gulp replace --env localdev</code>
* <code>gulp develop</code>

Alternatively, [Visual Studio Code](https://code.visualstudio.com/) provides is an excellent editor to a build in debugger.

### Deploy to [Heroku](https://www.heroku.com)
There are a number of methods of [deploying an application to Heroku](https://devcenter.heroku.com/categories/deployment), however the following methods were used for this application:
* Deploy a GitHub branch, via the Heroku application console
* Deploy from a local folder

Whichever option is used, the Web management application [canvasstrac-mgmt](https://github.com/ibuttimer/canvasstrac-mgmt), must first be build and copied to the [public](public) folder. See the [canvasstrac-mgmt readme](https://github.com/ibuttimer/canvasstrac-mgmt/blob/master/README.md) for build information.

#### Deploy a GitHub branch
* Ensure the application is committed to GitHub, *including the canvasstrac-mgmt build in the public folder*
* Use the Heroku application console to deploy the application

#### Deploy from a local folder
This option requires the installation of the following:
* [Heroku Command Line Interface](https://devcenter.heroku.com/categories/command-line) with the [Heroku Builds plugin](https://github.com/heroku/heroku-builds)
* [Cygwin](https://cygwin.com)

Assuming the Heroku application name is <code>canvasstrac</code>, proceed as follows:
* Open a Cygwin terminal and cd to the project folder **NOTE: If the  path contains any folders with spaces in the name, use the non-8dot3 short name**
* If it exists, delete the env.json file from the app folder; <code>rm app/env.json
</code>
* <code>heroku builds:create -a canvasstrac</code>

### Run application on [Heroku](https://www.heroku.com)
Following deplayment of the application to Heroku, it is necessary to set the environment configuration in the Heroku application console. See *Config Variables* in the Heroku application settings.

#### Additional inofrmation
* Run <code>heroku run bash -a canvasstrac</code> to open a shell to see what is actually deplayed in the dyno.
* To fetch [server logs](https://devcenter.heroku.com/articles/logging), use the heroku logs command; e.g. <code> heroku logs -a canvasstrac</code>
* To see environment variables use:
  * <code>heroku run printenv -a canvasstrac</code>, or
  * <code>heroku config --app canvasstrac</code>


