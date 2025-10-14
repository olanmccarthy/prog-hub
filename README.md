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

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
