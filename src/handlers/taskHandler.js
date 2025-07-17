const { COLORS } = require('../config/constants')
const { createBaseEmbed, formatDate, formatUserInfo, formatProjectInfo } = require('../utils/helpers')

const handleTaskEvent = (body) => {
  const task = body.data
  let title, color, extraFields = []
  const assignedTo = task.assigned_to
  const changer = body.by
  const sprint = task.milestone // assuming milestone is used as sprint

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
      value: task.status.name,
      inline: true
    }
  }

  switch (body.action) {
    case 'create':
      title = `📋 Created Task #${task.ref}: ${task.subject}`
      color = COLORS.CREATE
      break
    case 'delete':
      title = `🗑️ Deleted Task #${task.ref}: ${task.subject}`
      color = COLORS.DELETE
      break
    case 'change':
      title = `✏️ Updated Task #${task.ref}: ${task.subject}`
      color = COLORS.CHANGE
      break
  }

  if (task.user_story) {
    extraFields.push({
      name: '📝 User Story',
      value: `[${task.user_story.subject}](${task.user_story.permalink})`,
      inline: true
    })
  }
  if (task.milestone) {
    extraFields.push({
      name: '🏃 Sprint',
      value: task.milestone.name,
      inline: true
    })
  }
  if (task.tags && task.tags.length > 0) {
    extraFields.push({
      name: '🏷️ Tags',
      value: task.tags.join(', '),
      inline: true
    })
  }
  if (task.is_blocked) {
    extraFields.push({
      name: '⚠️ Blocked',
      value: `**Note**: ${task.blocked_note}`,
      inline: false
    })
  }
  if (task.is_iocaine) {
    extraFields.push({
      name: '💊 Iocaine',
      value: 'Yes',
      inline: true
    })
  }
  if (task.description) {
    extraFields.push({
      name: '📄 Description',
      value: sizeof(task.description) <= 1024 ? task.description : 'Description too long!',
    })
  }

  return {
    ...createBaseEmbed(title, task.permalink, color, body.date, changer, assignedTo, sprint),
    fields: [
      {
        name: '📚 Project',
        value: `[${task.project.name}](${task.project.permalink})`,
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

module.exports = handleTaskEvent 