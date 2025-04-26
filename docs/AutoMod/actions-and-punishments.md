# Actions and Punishments

This guide covers the various actions and punishments available in the AutoMod system, and how to manage them effectively.

## Available Actions

### 1. WARN

- Sends a warning message to the user
- Records the warning in the infraction system
- No immediate punishment
- Useful for first-time offenders

### 2. DELETE

- Removes the offending message
- Can be combined with other actions
- No direct user punishment
- Good for content control

### 3. MUTE

- Temporarily prevents user from sending messages
- Configurable duration
- Automatically unmutes after duration
- Effective for spam prevention

### 4. KICK

- Removes user from the server
- User can rejoin with a new invite
- Moderate severity punishment
- Good for persistent minor violations

### 5. BAN

- Permanently removes user from server
- Prevents rejoining
- Highest severity punishment
- Use for serious violations

## Action Configuration

### Duration Settings

```typescript
{
  action: 'MUTE',
  duration: 10,  // Duration in minutes
  // Common durations:
  // - 5-15 minutes for spam
  // - 30-60 minutes for moderate violations
  // - 1440 minutes (24 hours) for serious violations
}
```

### Strike System

```typescript
{
  strikeThreshold: 3,  // Violations before escalation
  // Example escalation:
  // 1st strike: WARN
  // 2nd strike: MUTE (10 minutes)
  // 3rd strike: KICK
  // 4th strike: BAN
}
```

## Infraction Management

### Adding Infractions

```typescript
/infraction add
  target: @user
  type: WARN
  reason: "Spamming in #general"
  duration: 10
```

### Viewing Infractions

```typescript
/infraction list
  target: @user
  active_only: true
```

### Removing Infractions

```typescript
/infraction remove
  target: @user
  id: "infraction-id"
```

## Best Practices

### 1. Progressive Discipline

1. First Offense

   - Use WARN action
   - Explain the violation
   - Point to server rules

2. Second Offense

   - Short-term MUTE (5-15 minutes)
   - Record infraction
   - Send warning message

3. Repeated Offenses

   - Increase MUTE duration
   - Consider KICK
   - Review user history

4. Serious Violations
   - Immediate BAN
   - Document thoroughly
   - Notify staff team

### 2. Action Selection Guidelines

| Violation Type  | Recommended Action | Duration   |
| --------------- | ------------------ | ---------- |
| Spam            | MUTE               | 10-30 mins |
| Toxicity        | WARN/DELETE        | N/A        |
| Harmful Links   | DELETE/KICK        | N/A        |
| Mass Mentions   | MUTE               | 15-60 mins |
| NSFW Content    | BAN                | Permanent  |
| Mild Violations | WARN               | N/A        |

### 3. Documentation

Always include:

- Clear reason for action
- Evidence (message content)
- Context of violation
- Previous infractions considered

Example:

```typescript
/infraction add
  target: @user
  type: MUTE
  reason: "Multiple spam messages in #general after warning"
  duration: 15
```

## Monitoring and Appeals

### Staff Notifications

- Automatic notifications for:
  - Rule violations
  - Action taken
  - User affected
  - Channel location

### Appeal Process

1. User contacts moderators
2. Review infraction details
3. Check user history
4. Make informed decision
5. Document resolution

## Statistics and Tracking

### Viewing Statistics

```typescript
/modstats overview
  days: 7
```

### Rule Effectiveness

```typescript
/modstats rules
  limit: 5
```

### User History

```typescript
/modstats user
  target: @user
```

## Troubleshooting

### Common Issues

1. **Action Not Applied**

   - Check bot permissions
   - Verify role hierarchy
   - Review action configuration

2. **Duration Issues**

   - Confirm timestamp format
   - Check timezone settings
   - Verify duration limits

3. **Missing Notifications**
   - Check staff channel settings
   - Verify webhook permissions
   - Review notification config
