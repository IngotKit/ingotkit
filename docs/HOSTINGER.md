# Hostinger: constraints, partner program, Deploy button

Researched 2026-11-06. Re-check anything marked "check" before relying on it.

## The partner program
- Hostinger's open-source partner program: list a public GitHub project, add a
  "Deploy on Hostinger" button with your partner code, earn 20% when someone buys
  hosting or VPS through it. https://www.hostinger.com/open-source-partners
- Listing requirements: public GitHub project; actively maintained with a clear README;
  an open-source license that permits deployment.
- Button format shown on the partner page:
  ```markdown
  [![Deploy on Hostinger](https://assets.hostinger.com/vps/deploy.svg)](https://www.hostinger.com/deploy?template=<org>/<repo>&ref=<PARTNER_CODE>)
  ```
  Copy the exact button from the partner dashboard once the repo is listed.
- Docker/VPS variant (for a future `docker-compose.yml`):
  `https://www.hostinger.com/docker-hosting?compose_url=<raw compose url>&REFERRALCODE=<code>`
  https://www.hostinger.com/support/deploy-on-hostinger-button
- Open question: are paid add-ons (ForgeKit Pro) allowed beside a listed project? Ask Hostinger.

## Web apps (Node.js) hosting — what the kit must respect
| Constraint | Source |
| --- | --- |
| Node.js apps run on Business and Cloud plans | https://www.hostinger.com/support/how-to-add-a-node-js-web-app-in-hostinger/ |
| MySQL only on shared/managed plans; Postgres/Redis/MongoDB need a VPS | https://www.hostinger.com/support/which-databases-and-data-tools-are-supported-at-hostinger/ |
| Apps run on demand and stop after a period without traffic | https://docs.hostinger.com/node.js/overview |
| Runtimes: Node 18, 20, 22, 24 | https://docs.hostinger.com/node.js/creating-an-app |
| Server apps need an entry file ending .js/.mjs/.cjs | https://docs.hostinger.com/node.js/overview |
| Public repo URL deploys clone into the user's own GitHub, then deploy that copy | https://docs.hostinger.com/node.js/github |
| Dashboard has a "Connect a database" wizard for Supabase and MongoDB Atlas | https://docs.hostinger.com/node.js/creating-an-app |

Hostinger's own Next.js starter (reference for build/start settings):
https://github.com/hostinger/deploy-nextjs — start command `npm run start -- -p $PORT`.
