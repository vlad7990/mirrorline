# n8n and Zapier

## Principle

n8n runs the business plumbing. Our own code runs the video work. Hour-long uploads, GPU renders, retries and compliance live in the Python job queue, where long jobs and large files are controllable and testable.

## n8n (self-hosted)

- Run locally with `automation/n8n/docker-compose.yml`, and later on a small server.
- Workflows are kept as JSON in `automation/n8n/workflows/` and committed to git. They're **inactive by default** and are activated by Vlad.
- **Licence condition:** n8n may power our product's back end, but clients never build, see or configure workflows, and we don't white-label n8n.

### First workflows

| # | Trigger | Steps | When |
|---|---|---|---|
| 1 | Stripe (test) `checkout.session.completed` | Create workspace in Supabase → send welcome email → notify Vlad | Week 3 (stretch tonight) |
| 2 | Weekly schedule (Mon 8:00 local) | Pull last week's metrics → Claude summary → email PDF report to client | Week 3 (stretch tonight) |
| 3 | Website lead form | Add to CRM sheet → email Vlad → send a "book a call" link | Week 1 |
| 4 | Compliance "blocked" event | Alert in Slack or email with reason | Week 2 |
| 5 | Social account disconnected | Email client with reconnect link; pause their posts | Week 3 |

## Zapier

Use it only for low-volume links where no API or n8n node exists (for example, a client's booking tool). It charges per task, so move anything high-volume to n8n.
