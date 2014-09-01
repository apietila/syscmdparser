# SYSCMDPARSER #

Node.js & browser compatible module to parse various system commands' 
output to JSON. Should work on Linux, Android, OS X and Windows.

This is a quick and dirtly solution to instrument various platforms for 
measurement studies. Probably breaks if you call things with exotic 
arguments or run exotic versions of tools. A more robust solution would 
probably include some platform specific native code modules and implement 
most of the measurements there instead of running commands or reading proc 
files... 

Run the tests with 'npm test'.

Get the JSON formatted results for a command:

    $ bin/cli <your command and args here>

Get a list of supported system commands:

    $ bin/cli --list

Check OS:

    $ bin/cli --os

