const express = require('express')
const bodyParser = require('body-parser')
const util = require('node:util')
const { WebhookClient } = require('discord.js')
const { verifySignature } = require('./src/utils/helpers')
const { COLORS, EMBED } = require('./src/config/constants')
const handleWikiPageEvent = require('./src/handlers/wikiPageHandler')
const handleMilestoneEvent = require('./src/handlers/milestoneHandler')
const handleUserStoryEvent = require('./src/handlers/userStoryHandler')
const handleTaskEvent = require('./src/handlers/taskHandler')
const handleIssueEvent = require('./src/handlers/issueHandler')
const subdir = process.env.SUBDIR || ""
const url = process.env.WEBHOOK_URL || ""
const app = express()
app.use(express.static('public'))

// First: Save raw body for signature verification
app.use(subdir, express.raw({
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))

// Then: Parse JSON for body processing
app.use(subdir, express.json())

app.get(subdir, (request, response) => response.sendStatus(200))

// Process url
const url_contents = url.split("/")

const ID = url_contents[5]
const TOKEN = url_contents[6]
// Create webhook client once
const webhookClient = new WebhookClient(ID, TOKEN)

// Helper function to create error embed
const createErrorEmbed = (error, body) => {
  return {
    author: {
      name: '❌ Error Processing Webhook',
      icon_url: EMBED.AUTHOR.ICON_URL
    },
    color: COLORS.ERROR,
    timestamp: new Date().toISOString(),
    fields: [
      {
        name: '🔍 Error Details',
        value: `\`\`\`${error.message}\`\`\``,
        inline: false
      },
      {
        name: '📝 Event Type',
        value: body?.type || 'Unknown',
        inline: true
      },
      {
        name: '📝 Action',
        value: body?.action || 'Unknown',
        inline: true
      },
      {
        name: '📚 Project',
        value: body?.data?.project?.name || 'Unknown',
        inline: true
      },
      {
        name: '👤 Triggered By',
        value: body?.by?.full_name || 'Unknown',
        inline: true
      }
    ],
    footer: {
      icon_url: EMBED.FOOTER.ICON_URL,
      text: `Error occurred at ${new Date().toLocaleString()}`
    }
  }
}

app.post(subdir, async (request, response) => {
  try {
    const signature = request.headers['x-taiga-webhook-signature']
    const rawBody = request.rawBody
    const parsedBody = JSON.parse(rawBody.toString('utf8'))
    
    if (!verifySignature(process.env.WEBHOOK_SECRET, rawBody, signature)) {
      console.error('Invalid signature:', {
        computed: crypto.createHmac('sha1', process.env.WEBHOOK_SECRET).update(rawBody).digest('hex'),
        received: signature
      })
      return response.status(401).send('Invalid signature')
    }

    if (!parsedBody) {
      throw new Error('No body received in webhook')
    }

    let embed

    if (parsedBody.type === 'test') {
      embed = {
        author:
        {
          title: "🧪 Test",
          url: parsedBody.permalink
        }, 
        timestamp: parsedBody.date,
        thumbnail: body.by?.photo ? { url: body.by.photo } : undefined,
        fields:[
          {
            name: "✅ *Test!*",
            value: "Webhook test",
            inline: false
          },
        ],
        footer: { 
          icon_url: EMBED.FOOTER.ICON_URL,
          text: `Managed by Koders • ${formatDate(parsedBody.date)}` 
        },
        color: COLORS.TEST
      }
    } else if (parsedBody.type === 'milestone') {
      embed = handleMilestoneEvent(parsedBody)
    } else if (parsedBody.type === 'userstory') {
      embed = handleUserStoryEvent(parsedBody)
    } else if (parsedBody.type === 'task') {
      embed = handleTaskEvent(parsedBody)
    } else if (parsedBody.type === 'issue') {
      embed = handleIssueEvent(parsedBody)
    } else if (parsedBody.type === 'wikipage') {
      embed = handleWikiPageEvent(parsedBody)
    } else {
      throw new Error(`Unsupported event type: ${parsedBody.type}`)
    }

    if (embed) {
      await webhookClient.send({
        username: EMBED.AUTHOR.NAME,
        avatarURL: EMBED.AUTHOR.ICON_URL,
        embeds: [embed]
      })
      response.status(200).send('Event received!')
    } else {
      throw new Error('No embed generated for event')
    }
  } catch (error) {
    // Log the error for debugging
    console.error('Error processing webhook:', {
      error: error.message,
      stack: error.stack,
      body: request.body ? JSON.stringify(request.body, null, 2) : 'No body'
    })

    // Send error embed to Discord
    try {
      const errorEmbed = createErrorEmbed(error, request.body)
      await webhookClient.send({
        username: EMBED.AUTHOR.NAME,
        avatarURL: EMBED.AUTHOR.ICON_URL,
        embeds: [errorEmbed]
      })
    } catch (webhookError) {
      console.error('Failed to send error webhook:', webhookError)
    }

    response.status(500).send('Error processing webhook')
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Webhook listening on port ${PORT}!`))
