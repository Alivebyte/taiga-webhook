const { COLORS } = require('../config/constants')
const { createBaseEmbed, formatDate, formatUserInfo, formatProjectInfo } = require('../utils/helpers')

const handleUserStoryEvent = (body) => {
  const userStory = body.data
  let title, color, extraFields = []
  const assignedTo = userStory.assigned_to
  const changer = body.by
  const sprint = userStory.milestone

  let statusField
  if (body.action === 'change' && body.change?.diff?.status) {
    statusField = {
      name: '📊 Status',
      value: `${body.change.diff.status.from} → ${body.change.diff.status.to}`,
      inline: true
    }
  } else {
    statusField = {
      name: '📊 Status',
      value: userStory.status.name,
      inline: true
    }
  }

  switch (body.action) {
    case 'create':
      title = `📝 Created User Story #${userStory.ref}: ${userStory.subject}`
      color = COLORS.CREATE
      break
    case 'delete':
      title = `🗑️ Deleted User Story #${userStory.ref}: ${userStory.subject}`
      color = COLORS.DELETE
      break
    case 'change':
      title = `✏️ Updated User Story #${userStory.ref}: ${userStory.subject}`
      color = COLORS.CHANGE
      break
  }

  if (userStory.points && userStory.points.length > 0) {
    extraFields.push({
      name: '🎯 Points',
      value: userStory.points.map(p => `${p.role}: ${p.value}`).join('\n'),
      inline: true
    })
  }
  if (userStory.tags && userStory.tags.length > 0) {
    extraFields.push({
      name: '🏷️ Tags',
      value: userStory.tags.join(', '),
      inline: true
    })
  }
  if (userStory.is_blocked) {
    extraFields.push({
      name: '⚠️ Blocked',
      value: `**Note**: ${userStory.blocked_note}`,
      inline: false
    })
  }
  if (userStory.description) {
    extraFields.push({
      name: '📄 Description',
      value: sizeof(userStory.description) <= 1024 ? userStory.description : "Description too long!", 
    })
  }

  return {
    ...createBaseEmbed(title, userStory.permalink, color, body.date, changer, assignedTo, sprint),
    fields: [
      {
        name: '📚 Project',
        value: `[${userStory.project.name}](${userStory.project.permalink})`,
        inline: true
      },
      {
        name: '👤 Updated By',
        value: `[${changer.full_name}](${changer.permalink})`,
        inline: true
      },
      statusField,
      ...extraFields
    ]
  }
}

module.exports = handleUserStoryEvent 