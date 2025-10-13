# prog-hub
A multipurpose web tool for users to interface with their progression series. There will not be seperate api service as we can handle api requests within nestjs. Will use TypeORM to better utilise TS and SQL.

## Pages - some of these can be coalesced into one page
- central home page: todo list of what to do for current prog, can show things like upcoming prog session, view stats, basic navigation
- admin page: page to manage things like player list, clear queues, start prog, general admin stuff to avoid making db changes
- stats page: user can browse various stats about prog - can worry about queries etc later
- deck submission page: a user uploads their final decklist, submitted to the db for stats
- deck validation page: user can upload a decklist to check if it is valid for current banlist - different to submission
- banlist submission page: user can select changes to balist they would like
- banlist voting page: a user can vote for which banlist should be chosen once all submissions have been entered
- pairings page: pairings for prog that are automatically generated once prog has started
- results submission: submitting match result of current pairing
- standings page: show final standings w/ our standing algorithm

## Services - scripts/microservices needed that are not the webpage
- mysql database
- discord bot to post pairings/standings/etc. such that the discord server is the 'source of truth' for prog info due to instability of web pages
- banlist image generator - no idea what this is going to be right now but something that will generate a banlist image once it has been voted on (see if ygoprog has an api otherwise ffmpeg maybe)
