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
- banlist image generator - no idea what this is going to be right now but something that will generate a banlist image once it has been voted on (see if ygoprog has an api otherwise ffmpeg maybe) or just generate a webpage and screenshot the result or something

## Notes 
- figure out how to cache results from yugioh api to store images!!important


## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
